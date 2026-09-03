import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { getHomeSettings } from "@/lib/homeSettings";
import { getBankSettings } from "@/lib/bankSettings";
import { ServiceTypeLabelRow } from "./ServiceTypeLabelRow";
import { TipoPrestazioneForm } from "./TipoPrestazioneForm";
import { TipoPrestazioneRow } from "./TipoPrestazioneRow";
import { HomeSettingsForm } from "./HomeSettingsForm";
import { BankSettingsForm } from "./BankSettingsForm";
import { ImpostazioniTabs } from "./ImpostazioniTabs";

const ORDER = ["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"] as const;

export default async function ImpostazioniPage() {
  await requireAdmin();
  const [labels, tipiPrestazione, homeSettings, bankSettings] = await Promise.all([
    getServiceTypeLabels(),
    prisma.tipoPrestazione.findMany({ orderBy: [{ ordine: "asc" }, { etichetta: "asc" }] }),
    getHomeSettings(),
    getBankSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <ImpostazioniTabs
        tabs={[
          {
            id: "servizio",
            label: "Tipi di servizio",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Tipi di servizio
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Rinomina come vuoi i tipi di servizio usati nei
                    preventivi. Il calcolo del prezzo resta invariato, cambia
                    solo il nome mostrato.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {ORDER.map((tipo) => (
                    <ServiceTypeLabelRow
                      key={tipo}
                      tipo={tipo}
                      etichetta={labels[tipo]}
                    />
                  ))}
                </div>
              </section>
            ),
          },
          {
            id: "prestazione",
            label: "Tipo di prestazione",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Tipo di prestazione
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Le voci che compaiono come prima riga della descrizione
                    nei preventivi (es. "PRESTAZIONE ORDINARIA DI PULIZIA
                    UFFICI"). Modificare o eliminare una voce non cambia i
                    preventivi già creati con quel testo.
                  </p>
                </div>
                <TipoPrestazioneForm />
                <div className="flex flex-col gap-2">
                  {tipiPrestazione.map((t) => (
                    <TipoPrestazioneRow
                      key={t.id}
                      id={t.id}
                      etichetta={t.etichetta}
                    />
                  ))}
                  {tipiPrestazione.length === 0 && (
                    <p className="text-sm text-zinc-400">
                      Nessuna voce ancora creata.
                    </p>
                  )}
                </div>
              </section>
            ),
          },
          {
            id: "visualizzazione",
            label: "Visualizzazione",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Visualizzazione
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Cosa viene mostrato nelle diverse pagine del programma.
                  </p>
                </div>
                <HomeSettingsForm
                  initial={{
                    showAlLavoro: homeSettings.showAlLavoro,
                    showPermessi: homeSettings.showPermessi,
                    showPreventivi: homeSettings.showPreventivi,
                    showTurni: homeSettings.showTurni,
                    showTotalePreventiviAccettati:
                      homeSettings.showTotalePreventiviAccettati,
                    showTotaleConsuntivi: homeSettings.showTotaleConsuntivi,
                    showAlLavoroBar: homeSettings.showAlLavoroBar,
                    showPreventiviBar: homeSettings.showPreventiviBar,
                    showTotaleConsuntiviBar: homeSettings.showTotaleConsuntiviBar,
                  }}
                />
              </section>
            ),
          },
          {
            id: "banca",
            label: "Banca",
            content: (
              <section className="flex flex-col gap-3">
                <BankSettingsForm
                  initial={{
                    nomeBanca: bankSettings.nomeBanca,
                    iban: bankSettings.iban,
                    intestatario: bankSettings.intestatario,
                    swiftBic: bankSettings.swiftBic,
                  }}
                />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
