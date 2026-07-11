"use client";

import { useActionState } from "react";
import { updateEmployee } from "@/app/actions/admin";

export function EditEmployeeForm({
  id,
  name,
  cognome,
  telefono,
  email,
  role,
}: {
  id: string;
  name: string;
  cognome: string | null;
  telefono: string | null;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
}) {
  const [state, action, pending] = useActionState(updateEmployee, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="name"
          defaultValue={name}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cognome
        <input
          name="cognome"
          defaultValue={cognome ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Telefono
        <input
          name="telefono"
          type="tel"
          defaultValue={telefono ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Ruolo
        <select
          name="role"
          defaultValue={role}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="EMPLOYEE">Dipendente</option>
          <option value="ADMIN">Amministratore</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nuova password (lascia vuoto per non cambiarla)
        <input
          name="password"
          type="password"
          minLength={6}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva modifiche"}
        </button>
        <a
          href="/admin/dipendenti"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
