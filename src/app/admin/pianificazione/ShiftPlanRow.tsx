"use client";

import { useTransition } from "react";
import { deleteShiftPlan } from "@/app/actions/shiftPlans";

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export type ShiftPlanItem = {
  id: string;
  employeeName: string;
  siteLabel: string;
  daysOfWeek: number[];
  intervalWeeks: number;
  startTime: string;
  endTime: string;
  dataInizioLabel: string;
  dataFineLabel: string | null;
};

export function ShiftPlanRow({ plan }: { plan: ShiftPlanItem }) {
  const [isPending, startTransition] = useTransition();
  const giorni = [...plan.daysOfWeek]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_SHORT[d])
    .join(", ");

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-zinc-900">
          {plan.employeeName} — {plan.siteLabel}
        </p>
        <p className="text-zinc-500">
          {giorni}
          {plan.intervalWeeks > 1 ? ` (ogni ${plan.intervalWeeks} settimane)` : ""} ·{" "}
          {plan.startTime}–{plan.endTime} · dal {plan.dataInizioLabel}
          {plan.dataFineLabel ? ` al ${plan.dataFineLabel}` : ""}
        </p>
      </div>
      <button
        disabled={isPending}
        onClick={() => {
          if (
            confirm(
              "Eliminare questo turno ricorrente? I turni futuri non ancora svolti generati da questo piano verranno rimossi; quelli passati restano in storico."
            )
          ) {
            startTransition(() => deleteShiftPlan(plan.id));
          }
        }}
        className="text-sm text-red-600 underline disabled:opacity-50"
      >
        Elimina
      </button>
    </li>
  );
}
