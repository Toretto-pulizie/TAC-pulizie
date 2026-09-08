import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { FornitoreForm } from "./FornitoreForm";
import { FornitoreList } from "./FornitoreList";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function FornitoriPage() {
  await requireModule("fornitori");
  const fornitori = await prisma.fornitore.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-20 pb-4 sm:px-8 sm:pt-24 sm:pb-8">
      <h1 className="text-lg font-semibold text-zinc-900">Fornitori</h1>

      <CollapsibleForm label="Nuovo fornitore">
        <FornitoreForm />
      </CollapsibleForm>

      <FornitoreList
        fornitori={fornitori.map((f) => ({
          id: f.id,
          codiceFornitore: f.codiceFornitore,
          name: f.name,
          partitaIva: f.partitaIva,
          codiceFiscale: f.codiceFiscale,
          indirizzo: f.indirizzo,
          citta: f.citta,
          telefono: f.telefono,
          email: f.email,
          note: f.note,
        }))}
      />
    </div>
  );
}
