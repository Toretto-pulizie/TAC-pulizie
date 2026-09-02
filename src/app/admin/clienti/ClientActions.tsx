"use client";

import { useState, useTransition } from "react";
import { deleteClient } from "@/app/actions/admin";

export function ClientActions({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Eliminare questo cliente?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteClient(clientId);
            if (result && "error" in result) setError(result.error ?? null);
          });
        }}
        className="text-xs text-red-600 underline disabled:opacity-50"
      >
        Elimina
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
