"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAttachment } from "@/app/actions/attachments";

export function AttachmentForm() {
  const [state, action, pending] = useActionState(createAttachment, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="nome"
          required
          placeholder="Es. Clausole contratto"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        File (PDF, PNG o JPG)
        <input
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Caricamento..." : "Aggiungi allegato"}
      </button>
    </form>
  );
}
