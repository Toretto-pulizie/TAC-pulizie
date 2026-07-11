import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TIPO_LABELS } from "@/lib/leaveRequests";
import { formatDateLabel } from "@/lib/dates";
import { AdminNav } from "../AdminNav";
import { LeaveRequestRow } from "./LeaveRequestRow";

const STATO_ORDER = { IN_ATTESA: 0, APPROVATO: 1, RIFIUTATO: 2 };

export default async function AdminPermessiPage() {
  await requireAdmin();

  const requests = await prisma.leaveRequest.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const sorted = [...requests].sort(
    (a, b) => STATO_ORDER[a.stato] - STATO_ORDER[b.stato]
  );

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="permessi" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Dipendente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Periodo</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <LeaveRequestRow
                  key={r.id}
                  id={r.id}
                  employeeName={r.user.name}
                  tipoLabel={TIPO_LABELS[r.tipo]}
                  dateRangeLabel={
                    r.dataFine.getTime() !== r.dataInizio.getTime()
                      ? `${formatDateLabel(r.dataInizio)} – ${formatDateLabel(r.dataFine)}`
                      : formatDateLabel(r.dataInizio)
                  }
                  note={r.note}
                  stato={r.stato}
                />
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    Nessuna richiesta di permesso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
