"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notifications";
import { formatDateLabel, formatTime } from "@/lib/dates";

export type NotificationItem = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationBell({ initial }: { initial: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const unread = items.filter((n) => !n.read).length;

  // Ad ogni refresh automatico della pagina, allinea lo stato ai dati freschi dal server.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  if (searchParams.get("pdf") === "1") return null;

  function handleItemClick(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      startTransition(() => {
        markNotificationRead(n.id);
      });
    }
    setOpen(false);
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
        aria-label="Notifiche"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
              <p className="text-sm font-medium text-zinc-900">Notifiche</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Segna tutte come lette
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-400">
                  Nessuna notifica.
                </p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    onClick={() => handleItemClick(n)}
                    className={`block border-b border-zinc-50 px-4 py-3 text-sm last:border-0 hover:bg-zinc-50 ${
                      n.read ? "text-zinc-500" : "bg-zinc-50/60 font-medium text-zinc-900"
                    }`}
                  >
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDateLabel(n.createdAt)} {formatTime(n.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
