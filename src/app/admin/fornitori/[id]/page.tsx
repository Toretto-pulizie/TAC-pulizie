import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { EditFornitoreForm } from "./EditFornitoreForm";

export default async function EditFornitorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("fornitori");
  const { id } = await params;

  const fornitore = await prisma.fornitore.findUnique({ where: { id } });
  if (!fornitore) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
      <h1 className="text-lg font-semibold text-zinc-900">
        Modifica fornitore
      </h1>
      <EditFornitoreForm
        id={fornitore.id}
        name={fornitore.name}
        partitaIva={fornitore.partitaIva}
        codiceFiscale={fornitore.codiceFiscale}
        indirizzo={fornitore.indirizzo}
        citta={fornitore.citta}
        telefono={fornitore.telefono}
        email={fornitore.email}
        note={fornitore.note}
      />
    </div>
  );
}
