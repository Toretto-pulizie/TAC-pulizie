"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MODULE_LABELS, isModuleKey } from "@/lib/modules";
import { usePageHeaderActionsContext } from "./PageHeaderActionsContext";

const EXTRA_TITLES: Record<string, string> = {
  impostazioni: "Impostazioni",
  utenti: "Utenti",
};

// Le tre anagrafiche condividono lo stesso criterio: l'elenco si chiama
// "Elenco <Cosa>", la scheda di modifica (e, per i Clienti, quella di
// creazione) mostra qui il proprio titolo al posto del nome generico del
// modulo, con il rimando indietro all'elenco accanto.
const ANAGRAFICHE: Record<string, { list: string; edit: string; nuovo?: string }> = {
  clienti: { list: "Elenco Clienti", edit: "Modifica cliente", nuovo: "Nuovo cliente" },
  fornitori: { list: "Elenco Fornitori", edit: "Modifica fornitore" },
  collaboratori: { list: "Elenco Collaboratori", edit: "Modifica collaboratore" },
};

export function PageHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { actions } = usePageHeaderActionsContext();
  if (searchParams.get("pdf") === "1") return null;

  const parts = pathname.split("/");
  const segment = parts[2] ?? "";
  const subSegment = parts[3];

  const anagrafica = ANAGRAFICHE[segment];
  // Non /admin/clienti/siti/<id>, che è la modifica di una sede, non della
  // scheda cliente stessa.
  const isSubpage = !!anagrafica && !!subSegment && subSegment !== "siti";
  const isList = !!anagrafica && !subSegment;

  const title = isSubpage
    ? (subSegment === "nuovo" && anagrafica.nuovo ? anagrafica.nuovo : anagrafica.edit)
    : isList
      ? anagrafica.list
      : isModuleKey(segment)
        ? MODULE_LABELS[segment]
        : segment in EXTRA_TITLES
          ? EXTRA_TITLES[segment]
          : "Dashboard";

  return (
    <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-8">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      {isSubpage && (
        <Link href={`/admin/${segment}`} className="text-sm text-zinc-500 underline hover:text-zinc-700">
          ← Torna all'elenco
        </Link>
      )}
      {actions && <div className="ml-auto flex items-center gap-3">{actions}</div>}
    </div>
  );
}

