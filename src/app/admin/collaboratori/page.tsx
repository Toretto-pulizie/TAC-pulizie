import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CollaboratoreForm } from "./CollaboratoreForm";
import { CollaboratoreRow } from "./CollaboratoreRow";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function CollaboratoriPage() {
  await requireModule("collaboratori");
  const collaboratori = await prisma.collaboratore.findMany({
    orderBy: [{ nome: "asc" }, { cognome: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-20 pb-4 sm:px-8 sm:pt-24 sm:pb-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Anagrafica collaboratori
      </h1>

      <CollapsibleForm label="Nuovo collaboratore">
        <CollaboratoreForm />
      </CollapsibleForm>

      <section className="flex flex-col gap-3">
        {collaboratori.map((c) => (
          <CollaboratoreRow
            key={c.id}
            id={c.id}
            codiceCollaboratore={c.codiceCollaboratore}
            nome={c.nome}
            cognome={c.cognome}
            telefono={c.telefono}
            email={c.email}
          />
        ))}
        {collaboratori.length === 0 && (
          <p className="text-sm text-zinc-400">Nessun collaboratore ancora.</p>
        )}
      </section>
    </div>
  );
}
