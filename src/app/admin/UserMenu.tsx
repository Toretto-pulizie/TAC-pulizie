"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { updateOwnName, changeOwnPassword } from "@/app/actions/account";
import { logout } from "@/app/actions/auth";

export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [nameState, nameAction, namePending] = useActionState(
    updateOwnName,
    undefined
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changeOwnPassword,
    undefined
  );

  useEffect(() => {
    if (nameState && "success" in nameState && nameState.success) {
      setEditingName(false);
    }
  }, [nameState]);

  useEffect(() => {
    if (passwordState && "success" in passwordState && passwordState.success) {
      setChangingPassword(false);
    }
  }, [passwordState]);

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 text-sm hover:bg-zinc-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
          {initial}
        </span>
        <span className="max-w-32 truncate font-medium text-zinc-700">
          {name}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
            <div className="border-b border-zinc-100 px-1 pb-2">
              <p className="truncate text-sm font-medium text-zinc-900">
                {name}
              </p>
              <p className="truncate text-xs text-zinc-500">{email}</p>
            </div>

            <div className="flex flex-col gap-1 py-2">
              {editingName ? (
                <form action={nameAction} className="flex flex-col gap-2 px-1">
                  <input
                    name="name"
                    defaultValue={name}
                    required
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  {nameState && "error" in nameState && (
                    <p className="text-xs text-red-600">{nameState.error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={namePending}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {namePending ? "Salvataggio..." : "Salva"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(true);
                    setChangingPassword(false);
                  }}
                  className="rounded-lg px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Modifica nome
                </button>
              )}

              {changingPassword ? (
                <form
                  action={passwordAction}
                  className="flex flex-col gap-2 px-1"
                >
                  <input
                    type="password"
                    name="currentPassword"
                    placeholder="Password attuale"
                    required
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Nuova password"
                    required
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="password"
                    name="confirm"
                    placeholder="Conferma nuova password"
                    required
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  {passwordState && "error" in passwordState && (
                    <p className="text-xs text-red-600">{passwordState.error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={passwordPending}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {passwordPending ? "Salvataggio..." : "Salva"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangingPassword(false)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(true);
                    setEditingName(false);
                  }}
                  className="rounded-lg px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Cambia password
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1 border-t border-zinc-100 pt-2">
              {isAdmin && (
                <Link
                  href="/admin/utenti"
                  className="rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                  onClick={() => setOpen(false)}
                >
                  Gestione utenti
                </Link>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
