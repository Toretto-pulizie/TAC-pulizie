import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { SedeList } from "./SedeList";
import { SediPageActions } from "./SediPageActions";

// Anagrafica delle sedi/cantieri di tutti i clienti in un unico elenco: si
// modificano e si eliminano come dalla scheda cliente (stessa pagina di
// modifica e stesse regole), ma qui si vedono tutte insieme, con chiavi e
// offerte accettate.
export default async function SediPage() {
  await requireModule("sedi");

  const [sites, clients] = await Promise.all([
    prisma.site.findMany({
      include: {
        client: true,
        quoteSites: {
          where: { confermata: true, quote: { status: "ACCETTATO" } },
          select: { quote: { select: { numeroOfferta: true } } },
        },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true, tipo: true, nome: true, cognome: true, ragioneSociale: true } }),
  ]);

  const rows = sites.map((s) => ({
    id: s.id,
    cliente: clientDisplayName(s.client),
    clientId: s.clientId,
    nome: s.name,
    indirizzo: s.address,
    accesso: s.accessoSenzaCliente,
    capienza: s.capienza,
    offerte: [...new Set(s.quoteSites.map((q) => q.quote.numeroOfferta))].sort((a, b) => b - a),
  }));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <SediPageActions
        clients={clients
          .map((c) => ({ id: c.id, name: clientDisplayName(c) }))
          .sort((a, b) => a.name.localeCompare(b.name, "it"))}
      />
      <SedeList rows={rows} />
    </div>
  );
}
