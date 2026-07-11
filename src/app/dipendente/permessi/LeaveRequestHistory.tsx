import { TIPO_LABELS, STATO_LABELS } from "@/lib/leaveRequests";
import { formatDateLabel } from "@/lib/dates";
import { CancelButton } from "./CancelButton";
import type { LeaveRequest } from "@prisma/client";

const statoClasses: Record<string, string> = {
  IN_ATTESA: "bg-amber-100 text-amber-700",
  APPROVATO: "bg-green-100 text-green-700",
  RIFIUTATO: "bg-zinc-100 text-zinc-500",
};

export function LeaveRequestHistory({ requests }: { requests: LeaveRequest[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-500">Le tue richieste</h2>
      {requests.length === 0 && (
        <p className="text-sm text-zinc-400">Nessuna richiesta ancora.</p>
      )}
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-zinc-800">{TIPO_LABELS[r.tipo]}</p>
              <p className="text-zinc-500">
                {formatDateLabel(r.dataInizio)}
                {r.dataFine.getTime() !== r.dataInizio.getTime()
                  ? ` – ${formatDateLabel(r.dataFine)}`
                  : ""}
              </p>
              {r.note && <p className="text-zinc-400">{r.note}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`rounded-full px-2 py-1 text-xs ${statoClasses[r.stato]}`}
              >
                {STATO_LABELS[r.stato]}
              </span>
              {r.stato === "IN_ATTESA" && <CancelButton id={r.id} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
