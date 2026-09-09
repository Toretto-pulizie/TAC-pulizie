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

  const client = await prisma.client.findUnique({
    where: { id },
    include: { sites: true },
  });
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Modifica cliente
      </h1>
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
        personaRiferimento={client.personaRiferimento}
        telefono={client.telefono}
        email={client.email}
        notes={client.notes}
      />

      <div className="flex flex-col gap-3">
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
  );
}
