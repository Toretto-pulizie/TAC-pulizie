import { verifySession, getCurrentUser } from "@/lib/dal";
import { AdminShell } from "./AdminShell";
import { MODULE_GROUPS, isModuleKey } from "@/lib/modules";
import { getRecentNotifications } from "@/lib/notifications";
import { AutoRefresh } from "@/app/AutoRefresh";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const [user, notifications] = await Promise.all([
    getCurrentUser(),
    getRecentNotifications(session.userId),
  ]);
  const isAdmin = user?.role === "ADMIN";
  const allowed = new Set(user?.allowedModules.filter(isModuleKey));

  const groups = MODULE_GROUPS.map((group) => ({
    label: group.label,
    keys: isAdmin ? group.keys : group.keys.filter((key) => allowed.has(key)),
  }));

  return (
    <>
      <AutoRefresh intervalMs={20000} />
      <AdminShell
        groups={groups}
        showImpostazioni={isAdmin}
        isAdmin={isAdmin}
        userName={user?.name ?? null}
        userEmail={user?.email ?? null}
        notifications={notifications}
      >
        {children}
      </AdminShell>
    </>
  );
}
