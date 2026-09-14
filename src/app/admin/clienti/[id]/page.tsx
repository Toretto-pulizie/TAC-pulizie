import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { EditClientForm } from "./EditClientForm";
import { AddSiteForm } from "./AddSiteForm";
import { SiteCapacityEdit } from "../SiteCapacityEdit";
import { SiteActions } from "../SiteActions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("clienti");
  const { id } = await params;

  const [client, condizioniPagamento] = await Promise.all([
    prisma.client.findUnique({ where: { id }, include: { sites: true } }),
    prisma.condizionePagamento.findMany({ orderBy: [{ ordine: "asc" }, { etichetta: "asc" }] }),
  ]);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <EditClientForm
          id={client.id}
          tipo={client.tipo}
          ragioneSociale={client.ragioneSociale}
          nome={client.nome}
          cognome={client.cognome}
          indirizzo={client.indirizzo}
          citta={client.citta}
          cap={client.cap}
          provincia={client.provincia}
          codiceCliente={client.codiceCliente}
          partitaIva={client.partitaIva}
          codiceFiscale={client.codiceFiscale}
          codiceUnivoco={client.codiceUnivoco}
          condizioniPagamento={client.condizioniPagamento}
          condizioniPagamentoOptions={condizioniPagamento.map((c) => c.etichetta)}
          personaRiferimento={client.personaRiferimento}
          telefonoRiferimento={client.telefonoRiferimento}
          emailRiferimento={client.emailRiferimento}
          telefono={client.telefono}
          email={client.email}
          notes={client.notes}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">
            Sedi/cantieri ({client.sites.length})
          </h2>
          {client.sites.length > 0 && (
            <ul className="flex flex-col gap-2">
              {client.sites.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600"
                >
                  <span className="font-medium text-zinc-900">{s.name}</span>
                  <span>— {s.address}</span>
                  <span className="text-xs text-zinc-400">Capienza:</span>
                  <SiteCapacityEdit siteId={s.id} capienza={s.capienza} />
                  <SiteActions siteId={s.id} />
                </li>
              ))}
            </ul>
          )}
          <AddSiteForm clientId={client.id} />
        </div>
      </div>
    </div>
  );
}
