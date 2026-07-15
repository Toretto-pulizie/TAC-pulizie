"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteSite } from "@/app/actions/admin";

export function SiteActions({ siteId }: { siteId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <Link
        href={`/admin/clienti/siti/${siteId}`}
        className="text-xs text-zinc-500 underline"
      >
        Modifica
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Eliminare questo cantiere?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteSite(siteId);
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
