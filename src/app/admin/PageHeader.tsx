"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MODULE_LABELS, isModuleKey } from "@/lib/modules";

const EXTRA_TITLES: Record<string, string> = {
  impostazioni: "Impostazioni",
  utenti: "Utenti",
};

export function PageHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (searchParams.get("pdf") === "1") return null;

  const parts = pathname.split("/");
  const segment = parts[2] ?? "";
  const subSegment = parts[3];

  // /admin/clienti/<id> (modifica di un cliente) mostra qui il proprio
  // titolo al posto del generico "Clienti", con il rimando indietro
  // all'elenco — non /admin/clienti/siti/<id>, che è la modifica di una sede.
  const isEditClient = segment === "clienti" && !!subSegment && subSegment !== "siti";

  const title = isEditClient
    ? "Modifica cliente"
    : isModuleKey(segment)
      ? MODULE_LABELS[segment]
      : segment in EXTRA_TITLES
        ? EXTRA_TITLES[segment]
        : "Dashboard";

  return (
    <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-8">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      {isEditClient && (
        <Link href="/admin/clienti" className="text-sm text-zinc-500 underline hover:text-zinc-700">
          ← Torna all'elenco
        </Link>
      )}
    </div>
  );
}

