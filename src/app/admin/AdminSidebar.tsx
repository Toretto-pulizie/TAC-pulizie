"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { MODULE_LABELS, MODULE_HREFS, type ModuleKey } from "@/lib/modules";

type NavGroup = { label: string; keys: ModuleKey[] };

export function AdminSidebar({
  groups,
  showImpostazioni,
  isAdmin,
  onNavigate,
}: {
  groups: NavGroup[];
  showImpostazioni: boolean;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (searchParams.get("pdf") === "1") return null;

  const linkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
    }`;
  };

  return (
    <nav className="fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col gap-6 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4 shadow-xl sm:sticky sm:top-0 sm:z-auto sm:w-56 sm:shrink-0 sm:bg-zinc-50/60 sm:shadow-none">
      <Link href={isAdmin ? "/admin" : "/dipendente"} className="px-1" onClick={onNavigate}>
        <Image
          src="/logo.png"
          alt="Toretto"
          width={120}
          height={35}
          priority
          unoptimized
        />
      </Link>

      <div className="flex flex-1 flex-col gap-6">
        {groups.map((group) =>
          group.keys.length === 0 ? null : (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-3 text-base font-bold tracking-wide text-zinc-900 uppercase">
                {group.label}
              </p>
              {group.keys.map((key) => (
                <Link
                  key={key}
                  href={MODULE_HREFS[key]}
                  className={linkClass(MODULE_HREFS[key])}
                  onClick={onNavigate}
                >
                  {MODULE_LABELS[key]}
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4">
        {!isAdmin && (
          <Link href="/dipendente" className={linkClass("/dipendente")} onClick={onNavigate}>
            La mia area
          </Link>
        )}
        {showImpostazioni && (
          <Link
            href="/admin/impostazioni"
            className={linkClass("/admin/impostazioni")}
            onClick={onNavigate}
          >
            Impostazioni
          </Link>
        )}
      </div>
    </nav>
  );
}
