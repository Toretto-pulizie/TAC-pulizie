import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewClientForm } from "./NewClientForm";

export default async function NewClientPage() {
  await requireModule("clienti");
  const condizioniPagamento = await prisma.condizionePagamento.findMany({
    orderBy: [{ ordine: "asc" }, { etichetta: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <NewClientForm
          condizioniPagamentoOptions={condizioniPagamento.map((c) => c.etichetta)}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Sedi/cantieri</h2>
          <p className="text-sm text-zinc-500">
            Potrai aggiungere le sedi/cantieri di questo cliente dopo averlo
            creato, dalla sua scheda "Modifica cliente".
          </p>
        </div>
      </div>
    </div>
  );
}
