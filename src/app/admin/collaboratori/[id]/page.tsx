import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { EditCollaboratoreForm } from "./EditCollaboratoreForm";

export default async function EditCollaboratorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("collaboratori");
  const { id } = await params;

  const collaboratore = await prisma.collaboratore.findUnique({
    where: { id },
  });
  if (!collaboratore) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Modifica collaboratore
      </h1>
      <EditCollaboratoreForm
        id={collaboratore.id}
        nome={collaboratore.nome}
        cognome={collaboratore.cognome}
        codiceFiscale={collaboratore.codiceFiscale}
        indirizzo={collaboratore.indirizzo}
        telefono={collaboratore.telefono}
        email={collaboratore.email}
        note={collaboratore.note}
      />
    </div>
  );
}
