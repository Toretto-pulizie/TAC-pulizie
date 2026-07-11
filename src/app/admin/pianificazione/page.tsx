import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  endOfDay,
  formatDateLabel,
  startOfWeek,
  toDateInputValue,
} from "@/lib/dates";
import { AdminNav } from "../AdminNav";
import { ShiftForm } from "./ShiftForm";
import { WeekCalendar } from "./WeekCalendar";

export default async function PianificazionePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const reference = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(reference);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [employees, sites, shifts] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({
      include: { client: true },
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.shift.findMany({
      where: { start: { gte: weekStart, lte: weekEnd } },
      include: { user: true, site: { include: { client: true } } },
      orderBy: { start: "asc" },
    }),
  ]);

  const shiftsByDay = days.map((day) =>
    shifts
      .filter((s) => s.start.toDateString() === day.toDateString())
      .map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        userId: s.userId,
        employeeName: s.user.name,
        siteLabel: `${s.site.client.name} — ${s.site.name}`,
        notes: s.notes,
      }))
  );

  const DEFAULT_START_HOUR = 7;
  const DEFAULT_END_HOUR = 20;
  const shiftHours = shifts.flatMap((s) => [
    s.start.getHours(),
    s.end.getHours() + (s.end.getMinutes() > 0 ? 1 : 0),
  ]);
  const startHour = Math.min(DEFAULT_START_HOUR, ...shiftHours);
  const endHour = Math.max(DEFAULT_END_HOUR, ...shiftHours);

  const prevWeek = toDateInputValue(addDays(weekStart, -7));
  const nextWeek = toDateInputValue(addDays(weekStart, 7));

  const occupancy: Record<string, Record<string, number>> = {};
  for (const day of days) {
    const dateStr = toDateInputValue(day);
    const dayShifts = shifts.filter(
      (s) => s.start.toDateString() === day.toDateString()
    );
    const bySite = new Map<string, Set<string>>();
    for (const s of dayShifts) {
      const set = bySite.get(s.siteId) ?? new Set<string>();
      set.add(s.userId);
      bySite.set(s.siteId, set);
    }
    for (const [siteId, userSet] of bySite) {
      occupancy[siteId] = occupancy[siteId] ?? {};
      occupancy[siteId][dateStr] = userSet.size;
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="pianificazione" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <ShiftForm
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          sites={sites.map((s) => ({
            id: s.id,
            label: `${s.client.name} — ${s.name}`,
            capienza: s.capienza,
          }))}
          occupancy={occupancy}
          defaultDate={toDateInputValue(reference)}
        />

        <div className="flex items-center justify-between">
          <Link
            href={`/admin/pianificazione?week=${prevWeek}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            ← Settimana precedente
          </Link>
          <p className="text-sm font-medium text-zinc-600">
            {formatDateLabel(weekStart)} – {formatDateLabel(days[6])}
          </p>
          <Link
            href={`/admin/pianificazione?week=${nextWeek}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            Settimana successiva →
          </Link>
        </div>

        <WeekCalendar
          days={days}
          shiftsByDay={shiftsByDay}
          startHour={startHour}
          endHour={endHour}
        />
        <p className="text-xs text-zinc-400">
          Passa il mouse su un turno per i dettagli, clicca sulla × per rimuoverlo.
        </p>
      </div>
    </div>
  );
}
