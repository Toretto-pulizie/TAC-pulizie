import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ClientList } from "./ClientList";
import { ClientiPageActions } from "./ClientiPageActions";

export default async function ClientiPage() {
  await requireModule("clienti");
  const clients = await prisma.client.findMany({
    include: { sites: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
        <ClientiPageActions clients={clients.map((c) => ({ id: c.id, name: c.name }))} />

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
