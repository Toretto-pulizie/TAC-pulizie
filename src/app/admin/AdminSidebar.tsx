"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { MODULE_LABELS, MODULE_HREFS, type ModuleKey } from "@/lib/modules";

type NavGroup = { label: string; keys: ModuleKey[] };

export function AdminSidebar({
  groups,
  standaloneKeys,
  showUtenti,
  showImpostazioni,
  isAdmin,
}: {
  groups: NavGroup[];
  standaloneKeys: ModuleKey[];
  showUtenti: boolean;
  showImpostazioni: boolean;
  isAdmin: boolean;
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
    <nav className="flex w-56 shrink-0 flex-col gap-6 border-r border-zinc-200 bg-zinc-50/60 p-4">
      <Link href={isAdmin ? "/admin" : "/dipendente"} className="px-1">
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
          <Link href="/dipendente" className={linkClass("/dipendente")}>
            La mia area
          </Link>
        )}
        {standaloneKeys.map((key) => (
          <Link
            key={key}
            href={MODULE_HREFS[key]}
            className={linkClass(MODULE_HREFS[key])}
          >
            {MODULE_LABELS[key]}
          </Link>
        ))}
        {showUtenti && (
          <Link href="/admin/utenti" className={linkClass("/admin/utenti")}>
            Utenti
          </Link>
        )}
        {showImpostazioni && (
          <Link
            href="/admin/impostazioni"
            className={linkClass("/admin/impostazioni")}
          >
            Impostazioni
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-600"
          >
            Esci
          </button>
        </form>
      </div>
    </nav>
  );
}
