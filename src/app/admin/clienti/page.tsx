import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "./ClientForm";
import { SiteForm } from "./SiteForm";
import { ClientList } from "./ClientList";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function ClientiPage() {
  await requireModule("clienti");
  const clients = await prisma.client.findMany({
    include: { sites: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-20 pb-4 sm:px-8 sm:pt-24 sm:pb-8">
        <div className="flex flex-wrap gap-3">
          <CollapsibleForm label="Nuovo cliente">
            <ClientForm />
          </CollapsibleForm>
          <CollapsibleForm label="Nuova sede/cantiere">
            <SiteForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
          </CollapsibleForm>
        </div>

        <ClientList
          clients={clients.map((c) => ({
            id: c.id,
            codiceCliente: c.codiceCliente,
            name: c.name,
            tipo: c.tipo,
            nome: c.nome,
            cognome: c.cognome,
            ragioneSociale: c.ragioneSociale,
            citta: c.citta,
            telefono: c.telefono,
            email: c.email,
            partitaIva: c.partitaIva,
            codiceFiscale: c.codiceFiscale,
            personaRiferimento: c.personaRiferimento,
            sites: c.sites.map((s) => ({
              id: s.id,
              name: s.name,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              capienza: s.capienza,
            })),
          }))}
        />
    </div>
  );
}
