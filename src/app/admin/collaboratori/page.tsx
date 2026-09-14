import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CollaboratoreList } from "./CollaboratoreList";
import { CollaboratoriPageActions } from "./CollaboratoriPageActions";

export default async function CollaboratoriPage() {
  await requireModule("collaboratori");
  const collaboratori = await prisma.collaboratore.findMany({
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <CollaboratoriPageActions />

      <CollaboratoreList
        collaboratori={collaboratori.map((c) => ({
          id: c.id,
          codiceCollaboratore: c.codiceCollaboratore,
          nome: c.nome,
          cognome: c.cognome,
          codiceFiscale: c.codiceFiscale,
          indirizzo: c.indirizzo,
          citta: c.citta,
          telefono: c.telefono,
          email: c.email,
          note: c.note,
        }))}
      />
    </div>
  );
}
