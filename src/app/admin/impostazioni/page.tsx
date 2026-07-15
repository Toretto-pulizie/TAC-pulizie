import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { AdminNav } from "../AdminNav";
import { ServiceTypeLabelRow } from "./ServiceTypeLabelRow";
import { TipoPrestazioneForm } from "./TipoPrestazioneForm";
import { TipoPrestazioneRow } from "./TipoPrestazioneRow";

const ORDER = ["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"] as const;

export default async function ImpostazioniPage() {
  await requireAdmin();
  const [labels, tipiPrestazione] = await Promise.all([
    getServiceTypeLabels(),
    prisma.tipoPrestazione.findMany({ orderBy: [{ ordine: "asc" }, { etichetta: "asc" }] }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="impostazioni" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Tipi di servizio
            </h1>
            <p className="text-sm text-zinc-500">
              Rinomina come vuoi i tipi di servizio usati nei preventivi. Il
              calcolo del prezzo resta invariato, cambia solo il nome
              mostrato.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {ORDER.map((tipo) => (
              <ServiceTypeLabelRow key={tipo} tipo={tipo} etichetta={labels[tipo]} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-zinc-200 pt-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Tipo di prestazione
            </h1>
            <p className="text-sm text-zinc-500">
              Le voci che compaiono come prima riga della descrizione nei
              preventivi (es. "PRESTAZIONE ORDINARIA DI PULIZIA UFFICI").
              Modificare o eliminare una voce non cambia i preventivi già
              creati con quel testo.
            </p>
          </div>
          <TipoPrestazioneForm />
          <div className="flex flex-col gap-2">
            {tipiPrestazione.map((t) => (
              <TipoPrestazioneRow key={t.id} id={t.id} etichetta={t.etichetta} />
            ))}
            {tipiPrestazione.length === 0 && (
              <p className="text-sm text-zinc-400">Nessuna voce ancora creata.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
