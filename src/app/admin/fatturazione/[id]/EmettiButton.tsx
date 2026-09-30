"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { emettiFattura } from "@/app/actions/invoices";

export function EmettiButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleEmetti() {
    if (
      !confirm(
        "Emettere questa fattura assegna il numero definitivo e blocca le righe: non sarà più modificabile. Continuare?"
      )
    )
      return;
    startTransition(async () => {
      await emettiFattura(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleEmetti}
      disabled={isPending}
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {isPending ? "Emissione..." : "Emetti fattura"}
    </button>
  );
}
