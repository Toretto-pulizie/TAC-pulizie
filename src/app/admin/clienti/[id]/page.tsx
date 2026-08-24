import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { EditClientForm } from "./EditClientForm";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("clienti");
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
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
        notes={client.notes}
      />
    </div>
  );
}
