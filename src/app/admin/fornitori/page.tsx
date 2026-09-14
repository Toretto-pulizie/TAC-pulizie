import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { FornitoreList } from "./FornitoreList";
import { FornitoriPageActions } from "./FornitoriPageActions";

export default async function FornitoriPage() {
  await requireModule("fornitori");
  const fornitori = await prisma.fornitore.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <FornitoriPageActions />

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
