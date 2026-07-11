import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { MONTH_LABELS, monthRange } from "@/lib/dates";
import { computeMonthlyAttendance } from "@/lib/presenze";
import { AdminNav } from "../AdminNav";

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const { start, end } = monthRange(year, month);

  const [employees, timeEntries, leaveRequests] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        timestamp: { gte: start, lte: end },
        type: { in: ["WORK_START", "WORK_END"] },
      },
      select: { userId: true, type: true, timestamp: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        stato: "APPROVATO",
        dataInizio: { lte: end },
        dataFine: { gte: start },
      },
      select: {
        userId: true,
        tipo: true,
        dataInizio: true,
        dataFine: true,
        stato: true,
      },
    }),
  ]);

  const attendance = computeMonthlyAttendance(
    employees,
    timeEntries,
    leaveRequests,
    year,
    month
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="presenze" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-sm">
            Mese
            <select
              name="month"
              defaultValue={month}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Anno
            <select
              name="year"
              defaultValue={year}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Mostra
          </button>
          <a
            href={`/admin/presenze/export?year=${year}&month=${month}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Esporta Excel
          </a>
        </form>

        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="sticky left-0 bg-zinc-50 px-4 py-3 font-medium">
                  Dipendente
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i} className="px-2 py-3 text-center font-medium">
                    {i + 1}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Totale</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.userId} className="border-b border-zinc-100 last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-2 font-medium text-zinc-900">
                    {a.cognome} {a.nome}
                  </td>
                  {a.days.map((d) => (
                    <td
                      key={d.day}
                      className={`px-2 py-2 text-center ${
                        d.code ? "font-medium text-amber-700" : "text-zinc-600"
                      }`}
                    >
                      {d.code ?? d.hours ?? ""}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium text-zinc-900">
                    {a.totaleOre}h
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td
                    colSpan={daysInMonth + 2}
                    className="px-4 py-6 text-center text-zinc-400"
                  >
                    Nessun dipendente attivo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <p className="text-xs text-zinc-400">
          I codici (F, M, P, FA, ecc.) indicano un&apos;assenza approvata. Il
          dettaglio completo per il consulente del lavoro è nel file Excel
          esportabile.
        </p>
      </div>
    </div>
  );
}
