import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  getServiceTypeLabels,
  getServiceTypeAbbreviazioni,
  getServiceTypeMostraCadenza,
} from "@/lib/serviceTypeLabels";
import { getHomeSettings } from "@/lib/homeSettings";
import { getStatisticheSettings } from "@/lib/statisticheSettings";
import { getNotificationSettings } from "@/lib/notificationSettings";
import { getBankSettings } from "@/lib/bankSettings";
import { getCompanySettings } from "@/lib/companySettings";
import { ServiceTypeLabelRow } from "./ServiceTypeLabelRow";
import { TipoPrestazioneForm } from "./TipoPrestazioneForm";
import { TipoPrestazioneRow } from "./TipoPrestazioneRow";
import { CondizionePagamentoForm } from "./CondizionePagamentoForm";
import { CondizionePagamentoRow } from "./CondizionePagamentoRow";
import { HomeSettingsForm } from "./HomeSettingsForm";
import { StatisticheSettingsForm } from "./StatisticheSettingsForm";
import { NotificationSettingsForm } from "./NotificationSettingsForm";
import { BankSettingsForm } from "./BankSettingsForm";
import { CompanySettingsForm } from "./CompanySettingsForm";
import { AttachmentForm } from "./AttachmentForm";
import { AttachmentRow } from "./AttachmentRow";
import { ImpostazioniTabs } from "./ImpostazioniTabs";
import { PhraseForm } from "@/app/admin/preventivi/frasi/PhraseForm";
import { PhraseRow } from "@/app/admin/preventivi/frasi/PhraseRow";

const ORDER = ["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"] as const;

export default async function ImpostazioniPage() {
  await requireAdmin();
  const [
    labels,
    abbreviazioni,
    mostraCadenzaSettings,
    tipiPrestazione,
    homeSettings,
    statisticheSettings,
    notificationSettings,
    bankSettings,
    companySettings,
    attachments,
    phrases,
    condizioniPagamento,
  ] = await Promise.all([
    getServiceTypeLabels(),
    getServiceTypeAbbreviazioni(),
    getServiceTypeMostraCadenza(),
    prisma.tipoPrestazione.findMany({ orderBy: [{ ordine: "asc" }, { etichetta: "asc" }] }),
    getHomeSettings(),
    getStatisticheSettings(),
    getNotificationSettings(),
    getBankSettings(),
    getCompanySettings(),
    prisma.attachment.findMany({
      orderBy: { createdAt: "asc" },
      // Senza il contenuto del file (può pesare fino a 15 MB): servono solo i dati della riga.
      select: { id: true, nome: true, fileName: true, _count: { select: { quotes: true } } },
    }),
    prisma.quotePhrase.findMany({ orderBy: [{ ordine: "asc" }, { titolo: "asc" }] }),
    prisma.condizionePagamento.findMany({ orderBy: [{ ordine: "asc" }, { etichetta: "asc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <ImpostazioniTabs
        tabs={[
          {
            id: "servizio",
            label: "Frequenza",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Frequenza
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Rinomina come vuoi le frequenze usate nelle offerte. Il
                    calcolo del prezzo resta invariato, cambia solo il nome
                    mostrato.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {ORDER.map((tipo) => (
                    <ServiceTypeLabelRow
                      key={tipo}
                      tipo={tipo}
                      etichetta={labels[tipo]}
                      abbreviazione={abbreviazioni[tipo]}
                      mostraCadenza={mostraCadenzaSettings[tipo]}
                    />
                  ))}
                </div>
              </section>
            ),
          },
          {
            id: "prestazione",
            label: "Tipo servizio",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Tipo servizio
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Le voci che compaiono come prima riga della descrizione
                    nelle offerte (es. "PRESTAZIONE ORDINARIA DI PULIZIA
                    UFFICI"). Modificare o eliminare una voce non cambia le
                    offerte già create con quel testo. L'Abbreviazione è
                    quella mostrata nella colonna "Tipo servizio" dell'elenco
                    offerte, per non appesantirlo col testo completo.
                  </p>
                </div>
                <TipoPrestazioneForm />
                <div className="flex flex-col gap-2">
                  {tipiPrestazione.map((t) => (
                    <TipoPrestazioneRow
                      key={t.id}
                      id={t.id}
                      etichetta={t.etichetta}
                      abbreviazione={t.abbreviazione}
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
            id: "pagamento",
            label: "Condizioni di pagamento",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Condizioni di pagamento
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Voci proposte per il campo "Condizioni di pagamento", sia
                    nella scheda Cliente (come valore predefinito per quel
                    cliente) sia nel modulo Offerta — restano comunque
                    campi liberi, puoi sempre scriverne uno diverso.
                  </p>
                </div>
                <CondizionePagamentoForm />
                <div className="flex flex-col gap-2">
                  {condizioniPagamento.map((c) => (
                    <CondizionePagamentoRow
                      key={c.id}
                      id={c.id}
                      etichetta={c.etichetta}
                    />
                  ))}
                  {condizioniPagamento.length === 0 && (
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
                <StatisticheSettingsForm
                  initial={{
                    oreDisponibiliNette: statisticheSettings.oreDisponibiliNette,
                  }}
                />
                <NotificationSettingsForm
                  initial={{
                    amministrativoPermessi: notificationSettings.amministrativoPermessi,
                    amministrativoPreventivi: notificationSettings.amministrativoPreventivi,
                    amministrativoSopralluoghi: notificationSettings.amministrativoSopralluoghi,
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
          {
            id: "azienda",
            label: "Azienda",
            content: (
              <section className="flex flex-col gap-3">
                <CompanySettingsForm
                  initial={{
                    denominazione: companySettings.denominazione,
                    nome: companySettings.nome,
                    cognome: companySettings.cognome,
                    partitaIva: companySettings.partitaIva,
                    codiceFiscale: companySettings.codiceFiscale,
                    indirizzo: companySettings.indirizzo,
                    cap: companySettings.cap,
                    citta: companySettings.citta,
                    provincia: companySettings.provincia,
                    regimeFiscale: companySettings.regimeFiscale,
                    telefono: companySettings.telefono,
                    email: companySettings.email,
                    pec: companySettings.pec,
                  }}
                />
              </section>
            ),
          },
          {
            id: "allegati",
            label: "Allegati",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Allegati
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Documenti PDF, PNG o JPG (es. clausole contrattuali,
                    condizioni generali) da poter allegare alle offerte.
                    Restano invariati, con la formattazione con cui sono
                    stati creati, e vengono aggiunti come pagine finali del
                    PDF — a parte rispetto al contenuto dell'offerta. Si
                    scelgono da un elenco direttamente nel modulo offerta.
                  </p>
                </div>
                <AttachmentForm />
                <ul className="flex flex-col gap-2">
                  {attachments.map((a) => (
                    <AttachmentRow
                      key={a.id}
                      id={a.id}
                      nome={a.nome}
                      fileName={a.fileName}
                      offerteCount={a._count.quotes}
                    />
                  ))}
                </ul>
                {attachments.length === 0 && (
                  <p className="text-sm text-zinc-400">
                    Nessun allegato ancora caricato.
                  </p>
                )}
              </section>
            ),
          },
          {
            id: "frasi",
            label: "Frasi preimpostate",
            content: (
              <section className="flex flex-col gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Frasi preimpostate
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Le frasi richiamabili nelle note delle offerte.
                    Raggiungibili anche da Offerte → Gestisci frasi
                    preimpostate.
                  </p>
                </div>
                <PhraseForm />
                <ul className="flex flex-col gap-2">
                  {phrases.map((p) => (
                    <PhraseRow
                      key={p.id}
                      id={p.id}
                      codice={p.codice}
                      titolo={p.titolo}
                      testo={p.testo}
                    />
                  ))}
                </ul>
                {phrases.length === 0 && (
                  <p className="text-sm text-zinc-400">
                    Nessuna frase preimpostata ancora creata.
                  </p>
                )}
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
