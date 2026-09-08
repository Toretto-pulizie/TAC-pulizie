import { verifySession, getCurrentUser } from "@/lib/dal";
import { AdminSidebar } from "./AdminSidebar";
import { UserMenu } from "./UserMenu";
import { MODULE_GROUPS, isModuleKey } from "@/lib/modules";
import { getRecentNotifications } from "@/lib/notifications";
import { NotificationBell } from "@/app/NotificationBell";
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
    <div className="flex min-h-screen">
      <AutoRefresh intervalMs={20000} />
      <AdminSidebar groups={groups} showImpostazioni={isAdmin} isAdmin={isAdmin} />
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
        <NotificationBell initial={notifications} />
        {user && (
          <UserMenu name={user.name} email={user.email} isAdmin={isAdmin} />
        )}
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
