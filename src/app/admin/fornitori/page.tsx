import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { FornitoreForm } from "./FornitoreForm";
import { FornitoreRow } from "./FornitoreRow";
import { CollapsibleForm } from "@/app/CollapsibleForm";

export default async function FornitoriPage() {
  await requireModule("fornitori");
  const fornitori = await prisma.fornitore.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-lg font-semibold text-zinc-900">Fornitori</h1>

      <CollapsibleForm label="Nuovo fornitore">
        <FornitoreForm />
      </CollapsibleForm>

      <section className="flex flex-col gap-3">
        {fornitori.map((f) => (
          <FornitoreRow
            key={f.id}
            id={f.id}
            codiceFornitore={f.codiceFornitore}
            name={f.name}
            partitaIva={f.partitaIva}
            codiceFiscale={f.codiceFiscale}
            telefono={f.telefono}
            email={f.email}
          />
        ))}
        {fornitori.length === 0 && (
          <p className="text-sm text-zinc-400">Nessun fornitore ancora.</p>
        )}
      </section>
    </div>
  );
}
