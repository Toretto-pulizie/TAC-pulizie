"use client";

import { useState } from "react";
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

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <AdminSidebar
          groups={groups}
          showImpostazioni={showImpostazioni}
          isAdmin={isAdmin}
        />
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
