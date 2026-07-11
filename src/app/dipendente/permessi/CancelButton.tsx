"use client";

import { useTransition } from "react";
import { deleteLeaveRequest } from "@/app/actions/leaveRequests";

export function CancelButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => deleteLeaveRequest(id))}
      className="text-sm text-red-600 underline disabled:opacity-50"
    >
      Annulla
    </button>
  );
}
