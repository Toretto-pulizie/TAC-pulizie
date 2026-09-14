"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MODULE_LABELS, isModuleKey } from "@/lib/modules";
import { usePageHeaderActionsContext } from "./PageHeaderActionsContext";

const EXTRA_TITLES: Record<string, string> = {
  impostazioni: "Impostazioni",
};

// Le anagrafiche condividono lo stesso criterio: l'elenco si chiama
// "Elenco <Cosa>" (o il proprio titolo per Utenti), la scheda di modifica (e,
// per i Clienti, quella di creazione) mostra qui il proprio titolo al posto
// del nome generico del modulo, con il rimando indietro all'elenco accanto.
const ANAGRAFICHE: Record<string, { list: string; edit: string; nuovo?: string }> = {
  clienti: { list: "Elenco Clienti", edit: "Modifica cliente", nuovo: "Nuovo cliente" },
  fornitori: { list: "Elenco Fornitori", edit: "Modifica fornitore" },
  collaboratori: { list: "Elenco Collaboratori", edit: "Modifica collaboratore" },
  utenti: { list: "Utenti", edit: "Modifica utente" },
};

export function PageHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { actions } = usePageHeaderActionsContext();
  if (searchParams.get("pdf") === "1") return null;

  const parts = pathname.split("/");
  const segment = parts[2] ?? "";
  const subSegment = parts[3];
  const subSubSegment = parts[4];

  const anagrafica = ANAGRAFICHE[segment];
  // Non /admin/clienti/siti/<id>, che è la modifica di una sede, non della
  // scheda cliente stessa: gestita a parte qui sotto.
  const isAnagraficaSubpage = !!anagrafica && !!subSegment && subSegment !== "siti";
  const isAnagraficaList = !!anagrafica && !subSegment;

  const isSiteEdit = segment === "clienti" && subSegment === "siti" && !!subSubSegment;
  const isFrasiList = segment === "preventivi" && subSegment === "frasi" && !subSubSegment;
  const isFrasiEdit = segment === "preventivi" && subSegment === "frasi" && !!subSubSegment;

  let title: string;
  let backHref: string | null = null;
  let backLabel = "← Torna all'elenco";

  if (isSiteEdit) {
    title = "Modifica cantiere";
    backHref = "/admin/clienti";
  } else if (isFrasiEdit) {
    title = "Modifica frase preimpostata";
    backHref = "/admin/preventivi/frasi";
  } else if (isFrasiList) {
    title = "Frasi preimpostate";
    backHref = "/admin/preventivi";
    backLabel = "← Torna ai preventivi";
  } else if (isAnagraficaSubpage) {
    title =
      subSegment === "nuovo" && anagrafica!.nuovo ? anagrafica!.nuovo : anagrafica!.edit;
    backHref = `/admin/${segment}`;
  } else if (isAnagraficaList) {
    title = anagrafica!.list;
  } else if (isModuleKey(segment)) {
    title = MODULE_LABELS[segment];
  } else if (segment in EXTRA_TITLES) {
    title = EXTRA_TITLES[segment];
  } else {
    title = "Dashboard";
  }

  return (
    <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-8">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      {(backHref || actions) && (
        <div className="ml-auto flex items-center gap-3">
          {backHref && (
            <Link href={backHref} className="text-sm text-zinc-500 underline hover:text-zinc-700">
              {backLabel}
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

