import Image from "next/image";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getTodayEntries } from "@/app/actions/timeEntries";
import { currentStatus } from "@/lib/timeCalc";
import { startOfDay, addDays, formatDateLabel, formatTime } from "@/lib/dates";
import { logout } from "@/app/actions/auth";
import { ClockPanel } from "./ClockPanel";

const typeLabels: Record<string, string> = {
  TRAVEL_START: "Inizio spostamento",
  WORK_START: "Inizio lavoro",
  WORK_END: "Fine lavoro",
};

export default async function DipendentePage() {
  const session = await verifySession();

  const today = startOfDay(new Date());

  const [sites, entries, upcomingShifts] = await Promise.all([
    prisma.site.findMany({
      include: { client: true },
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
    }),
    getTodayEntries(session.userId),
    prisma.shift.findMany({
      where: {
        userId: session.userId,
        start: { gte: today, lt: addDays(today, 7) },
      },
      include: { site: { include: { client: true } } },
      orderBy: { start: "asc" },
    }),
  ]);

  const status = currentStatus(entries);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Toretto" width={90} height={26} priority />
          <div>
            <p className="text-sm text-zinc-500">Ciao,</p>
            <h1 className="text-xl font-semibold text-zinc-900">
              {session.name}
            </h1>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
          >
            Esci
          </button>
        </form>
      </header>

      {upcomingShifts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">
            I tuoi prossimi turni
          </h2>
          <ul className="flex flex-col gap-2">
            {upcomingShifts.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-200 px-4 py-3 text-sm"
              >
                <p className="font-medium text-zinc-800">
                  {formatDateLabel(s.start)} · {formatTime(s.start)}–
                  {formatTime(s.end)}
                </p>
                <p className="text-zinc-500">
                  {s.site.client.name} — {s.site.name}
                </p>
                {s.notes && <p className="text-zinc-400">{s.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ClockPanel
        sites={sites.map((s) => ({
          id: s.id,
          label: `${s.client.name} — ${s.name}`,
        }))}
        status={status.status}
        currentSiteLabel={
          status.site ? `${status.site.client.name} — ${status.site.name}` : null
        }
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Oggi</h2>
        {entries.length === 0 && (
          <p className="text-sm text-zinc-400">Nessuna timbratura oggi.</p>
        )}
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-zinc-800">
                  {typeLabels[e.type]}
                </p>
                {e.site && (
                  <p className="text-zinc-500">
                    {e.site.client.name} — {e.site.name}
                  </p>
                )}
              </div>
              <span className="text-zinc-500">
                {e.timestamp.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
