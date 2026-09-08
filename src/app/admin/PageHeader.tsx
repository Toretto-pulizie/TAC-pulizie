"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { MODULE_LABELS, isModuleKey } from "@/lib/modules";

const EXTRA_TITLES: Record<string, string> = {
  impostazioni: "Impostazioni",
  utenti: "Utenti",
};

function titleFor(pathname: string) {
  const segment = pathname.split("/")[2] ?? "";
  if (isModuleKey(segment)) return MODULE_LABELS[segment];
  if (segment in EXTRA_TITLES) return EXTRA_TITLES[segment];
  return "Dashboard";
}

export function PageHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (searchParams.get("pdf") === "1") return null;

  const title = titleFor(pathname);

  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-2 sm:px-8">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
    </div>
  );
}

