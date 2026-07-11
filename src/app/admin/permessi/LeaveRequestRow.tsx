"use client";

import { useTransition } from "react";
import { setLeaveRequestStatus, deleteLeaveRequest } from "@/app/actions/leaveRequests";

export function LeaveRequestRow({
  id,
  employeeName,
  tipoLabel,
  dateRangeLabel,
  note,
  stato,
}: {
  id: string;
  employeeName: string;
  tipoLabel: string;
  dateRangeLabel: string;
  note: string | null;
  stato: "IN_ATTESA" | "APPROVATO" | "RIFIUTATO";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-3 font-medium text-zinc-900">{employeeName}</td>
      <td className="px-4 py-3 text-zinc-500">{tipoLabel}</td>
      <td className="px-4 py-3 text-zinc-500">{dateRangeLabel}</td>
      <td className="px-4 py-3 text-zinc-400">{note ?? "—"}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2 text-sm">
          {stato !== "APPROVATO" && (
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(() => setLeaveRequestStatus(id, "APPROVATO"))
              }
              className="text-green-700 underline disabled:opacity-50"
            >
              Approva
            </button>
          )}
          {stato !== "RIFIUTATO" && (
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(() => setLeaveRequestStatus(id, "RIFIUTATO"))
              }
              className="text-zinc-500 underline disabled:opacity-50"
            >
              Rifiuta
            </button>
          )}
          {stato !== "IN_ATTESA" && (
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(() => setLeaveRequestStatus(id, "IN_ATTESA"))
              }
              className="text-amber-700 underline disabled:opacity-50"
            >
              Riapri
            </button>
          )}
          <button
            disabled={isPending}
            onClick={() => startTransition(() => deleteLeaveRequest(id))}
            className="text-red-600 underline disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </td>
    </tr>
  );
}
