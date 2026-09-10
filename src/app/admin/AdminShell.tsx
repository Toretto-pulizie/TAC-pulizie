"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { TopBar } from "./TopBar";
import { PageHeader } from "./PageHeader";
import type { NotificationItem } from "@/app/NotificationBell";
import type { ModuleKey } from "@/lib/modules";

type NavGroup = { label: string; keys: ModuleKey[] };

export function AdminShell({
  groups,
  showImpostazioni,
  isAdmin,
  userName,
  userEmail,
  notifications,
  children,
}: {
  groups: NavGroup[];
  showImpostazioni: boolean;
  isAdmin: boolean;
  userName: string | null;
  userEmail: string | null;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Su mobile il menu è un drawer sovrapposto: di default resta chiuso per
  // non coprire subito il contenuto (su desktop invece parte aperto).
  useEffect(() => {
    if (window.innerWidth < 640) setSidebarOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          />
          <AdminSidebar
            groups={groups}
            showImpostazioni={showImpostazioni}
            isAdmin={isAdmin}
            onNavigate={() => {
              if (window.innerWidth < 640) setSidebarOpen(false);
            }}
          />
        </>
      )}
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          notifications={notifications}
          userName={userName}
          userEmail={userEmail}
          isAdmin={isAdmin}
        />
        <PageHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
