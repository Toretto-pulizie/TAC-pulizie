import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CollaboratoreForm } from "./CollaboratoreForm";
import { CollaboratoreList } from "./CollaboratoreList";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function CollaboratoriPage() {
  await requireModule("collaboratori");
  const collaboratori = await prisma.collaboratore.findMany({
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-20 pb-4 sm:px-8 sm:pt-24 sm:pb-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Anagrafica collaboratori
      </h1>

      <CollapsibleForm label="Nuovo collaboratore">
        <CollaboratoreForm />
      </CollapsibleForm>

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
