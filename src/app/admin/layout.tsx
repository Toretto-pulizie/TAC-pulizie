import { verifySession, getCurrentUser } from "@/lib/dal";
import { AdminSidebar } from "./AdminSidebar";
import { MODULE_GROUPS, STANDALONE_MODULE_KEYS, isModuleKey } from "@/lib/modules";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const allowed = new Set(user?.allowedModules.filter(isModuleKey));

  const groups = MODULE_GROUPS.map((group) => ({
    label: group.label,
    keys: isAdmin ? group.keys : group.keys.filter((key) => allowed.has(key)),
  }));
  const standaloneKeys = isAdmin
    ? STANDALONE_MODULE_KEYS
    : STANDALONE_MODULE_KEYS.filter((key) => allowed.has(key));

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        groups={groups}
        standaloneKeys={standaloneKeys}
        showUtenti={isAdmin}
        showImpostazioni={isAdmin}
        isAdmin={isAdmin}
      />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
