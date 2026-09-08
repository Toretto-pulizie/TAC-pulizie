"use client";

import { useSearchParams } from "next/navigation";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@/app/NotificationBell";
import type { NotificationItem } from "@/app/NotificationBell";

export function TopBar({
  sidebarOpen,
  onToggleSidebar,
  notifications,
  userName,
  userEmail,
  isAdmin,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  notifications: NotificationItem[];
  userName: string | null;
  userEmail: string | null;
  isAdmin: boolean;
}) {
  const searchParams = useSearchParams();
  if (searchParams.get("pdf") === "1") return null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-8">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
        aria-label={sidebarOpen ? "Chiudi menu" : "Apri menu"}
        title={sidebarOpen ? "Chiudi menu" : "Apri menu"}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <NotificationBell initial={notifications} />
        {userName && userEmail && (
          <UserMenu name={userName} email={userEmail} isAdmin={isAdmin} />
        )}
      </div>
    </header>
  );
}
