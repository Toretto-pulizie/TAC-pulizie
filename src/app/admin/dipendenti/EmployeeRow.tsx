"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setEmployeeActive } from "@/app/actions/admin";

export function EmployeeRow({
  id,
  name,
  cognome,
  telefono,
  email,
  role,
  active,
}: {
  id: string;
  name: string;
  cognome: string | null;
  telefono: string | null;
  email: string;
  role: string;
  active: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-3">{name}</td>
      <td className="px-4 py-3">{cognome ?? "—"}</td>
      <td className="px-4 py-3 text-zinc-500">{telefono ?? "—"}</td>
      <td className="px-4 py-3 text-zinc-500">{email}</td>
      <td className="px-4 py-3 text-zinc-500">
        {role === "ADMIN" ? "Amministratore" : "Dipendente"}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            active
              ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
              : "rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500"
          }
        >
          {active ? "Attivo" : "Disattivato"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/dipendenti/${id}`}
            className="text-sm text-zinc-600 underline"
          >
            Modifica
          </Link>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(() => setEmployeeActive(id, !active))
            }
            className="text-sm text-zinc-600 underline disabled:opacity-50"
          >
            {active ? "Disattiva" : "Riattiva"}
          </button>
        </div>
      </td>
    </tr>
  );
}
