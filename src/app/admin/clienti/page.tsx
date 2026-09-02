import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "./ClientForm";
import { SiteForm } from "./SiteForm";
import { ClientRow } from "./ClientRow";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function ClientiPage() {
  await requireModule("clienti");
  const clients = await prisma.client.findMany({
    include: { sites: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <CollapsibleForm label="Nuovo cliente">
            <ClientForm />
          </CollapsibleForm>
          <CollapsibleForm label="Nuova sede/cantiere">
            <SiteForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
          </CollapsibleForm>
        </div>

        <section className="flex flex-col gap-3">
          {clients.map((c) => (
            <ClientRow
              key={c.id}
              clientId={c.id}
              codiceCliente={c.codiceCliente}
              name={c.name}
              tipo={c.tipo}
              editHref={`/admin/clienti/${c.id}`}
              sites={c.sites.map((s) => ({
                id: s.id,
                name: s.name,
                address: s.address,
                lat: s.lat,
                lng: s.lng,
                capienza: s.capienza,
              }))}
            />
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-zinc-400">Nessun cliente ancora.</p>
          )}
        </section>
    </div>
  );
}
