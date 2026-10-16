"use client";

import { useEffect, useRef, useState } from "react";
import { computeListPrice, passaggioDaMensile } from "@/lib/quotes";
import { SearchSelect } from "@/app/SearchSelect";
import { truncateText } from "@/app/Trunc";

export type ServiceType = "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE" | "PASS_ANNUALE";

export type ClientOption = {
  id: string;
  name: string;
  baseAddress: string | null;
  sites: { id: string; name: string; address: string }[];
};

export type SiteBlockInitial = {
  siteId: string;
  tipoPrestazione: string;
  serviceType: ServiceType;
  ore: number;
  spostamento: number;
  // Solo Passaggi mensili: le righe create prima partono senza (valori invariati).
  spostamentoInPrezzo: boolean;
  oneShotCount: number;
  passSettimanale: number | null;
  passMensile: number | null;
  passAnnuali: number | null;
  oreVetri: number;
  passVetriAnno: number;
  tariffaOraria: number;
  tariffaVetri: number;
  tariffaConsuntivo: number;
  scontoPct: number | null;
  // Per i Passaggi annuali prezzoVenduto e adeguamento arrivano già convertiti
  // a passaggio (in archivio sono l'equivalente mensile).
  prezzoVenduto: number | null;
  adeguamento: number | null;
  note: string | null;
  mostraInStampa: boolean;
  meseUnaTantum: string | null;
};

export type Phrase = {
  id: string;
  codice: number;
  titolo: string;
  testo: string;
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Accetta sia "150.5" che "150,5" che "150,50 €"; torna null se non è un
// numero valido o il campo è vuoto.
function parseEuroInput(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, "").replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Converte un testo semplice (a capo con "\n", "\r\n" o "\r") in HTML con
// <br> per gli a capo, per inserirlo/mostrarlo nell'editor delle note.
function plainTextToHtml(raw: string): string {
  return escapeHtml(raw.replace(/\r\n|\r/g, "\n")).replace(/\n/g, "<br>");
}

// Le note esistenti sono testo semplice; quelle create con l'editor sono
// già HTML. Le distinguiamo cercando un tag: se non ce n'è, convertiamo gli
// a capo in <br> così l'editor le mostra allo stesso modo di prima.
function noteToEditableHtml(raw: string): string {
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return plainTextToHtml(raw);
}

export function QuoteSiteFieldset({
  index,
  selectedClient,
  initial,
  canRemove,
  onRemove,
  onTotaleChange,
  serviceLabels,
  phrases,
  tipiPrestazione,
}: {
  index: number;
  selectedClient: ClientOption | undefined;
  initial?: SiteBlockInitial;
  canRemove: boolean;
  onRemove: () => void;
  onTotaleChange: (index: number, totale: number) => void;
  serviceLabels: Record<ServiceType, string>;
  phrases: Phrase[];
  tipiPrestazione: { etichetta: string; abbreviazione: string | null }[];
}) {
  const [serviceType, setServiceType] = useState<ServiceType>(
    initial?.serviceType ?? "PASS_SETTIMANALE"
  );
  const [siteSelection, setSiteSelection] = useState(initial?.siteId ?? "");
  const [totale, setTotale] = useState(0);
  const [netto, setNetto] = useState(0);
  // Passaggi/anno digitati (solo Passaggi annuali): servono a totale annuo e mese.
  const [passAnn, setPassAnn] = useState(initial?.passAnnuali ?? 0);
  const [adeguamentoDisplay, setAdeguamentoDisplay] = useState(
    initial?.adeguamento != null ? formatEuro(initial.adeguamento) : ""
  );
  const [showSupplementi, setShowSupplementi] = useState(
    () => !!initial && ((initial.oreVetri ?? 0) > 0 || (initial.passVetriAnno ?? 0) > 0)
  );
  const [selectedPhraseIds, setSelectedPhraseIds] = useState<string[]>([]);
  const [previewPhrase, setPreviewPhrase] = useState<{
    testo: string;
    top: number;
    left: number;
  } | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const noteEditableRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const name = (field: string) => `sites.${index}.${field}`;

  function recomputeTotale() {
    if (!blockRef.current) return;
    const get = (field: string) => {
      const el = blockRef.current!.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${name(field)}"]`
      );
      return el?.value ?? "";
    };
    const num = (field: string, fallback = 0) => {
      const n = parseFloat(get(field));
      return Number.isFinite(n) ? n : fallback;
    };
    const st = (get("serviceType") as ServiceType) || serviceType;
    // Arrotondato al centesimo subito dopo il calcolo: con tariffe con i
    // centesimi (es. 25,13) i prodotti intermedi possono avere residui di
    // virgola mobile (es. 62,824999999999996 invece di 62,83).
    const passAnnuali = st === "PASS_ANNUALE" ? num("passAnnuali") : null;
    setPassAnn(passAnnuali ?? 0);
    const spostamentoInPrezzo =
      blockRef.current!.querySelector<HTMLInputElement>(
        `[name="${name("spostamentoInPrezzo")}"]`
      )?.checked ?? false;
    const listino = computeListPrice({
      serviceType: st,
      ore: num("ore"),
      spostamento: num("spostamento"),
      spostamentoInPrezzo,
      oneShotCount: num("oneShotCount", 1),
      passSettimanale: st === "PASS_SETTIMANALE" ? num("passSettimanale") : null,
      passMensile: st === "PASS_MENSILE" ? num("passMensile") : null,
      passAnnuali,
      oreVetri: num("oreVetri"),
      passVetriAnno: num("passVetriAnno"),
      tariffaOraria: num("tariffaOraria"),
      tariffaVetri: num("tariffaVetri"),
    });
    // Passaggi annuali: si ragiona e si mostra a PASSAGGIO (il server salva poi
    // l'equivalente mensile).
    const t =
      Math.round((st === "PASS_ANNUALE" ? passaggioDaMensile(listino, passAnnuali) : listino) * 100) / 100;
    setTotale(t);
    // Il totale dell'offerta somma importi mensili: per i Passaggi annuali si
    // passa l'equivalente mensile, non il prezzo a passaggio.
    onTotaleChange(index, st === "PASS_ANNUALE" ? Math.round(listino * 100) / 100 : t);

    // Il Netto segue sempre il Totale corrente (ricalcolato da ore/tariffe)
    // finché non si imposta uno Sconto %; a quel punto è Totale - Sconto.
    // Non deve mai restare fermo su un Netto salvato in precedenza: se si
    // modificano ore/tariffe di una sede già esistente senza toccare lo
    // sconto, il Netto deve seguire il nuovo Totale.
    const scontoRaw = get("scontoPct");
    const scontoNum = scontoRaw.trim() === "" ? null : parseFloat(scontoRaw);
    const n =
      scontoNum != null && Number.isFinite(scontoNum)
        ? Math.round(t * (1 - scontoNum / 100) * 100) / 100
        : t;
    setNetto(n);
    const hiddenNetto = blockRef.current!.querySelector<HTMLInputElement>(
      `[name="${name("prezzoVenduto")}"]`
    );
    if (hiddenNetto) hiddenNetto.value = String(n);
  }

  useEffect(() => {
    recomputeTotale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  // L'editor delle Note è un contentEditable non controllato (come una
  // textarea con defaultValue): il contenuto iniziale si imposta una sola
  // volta al mount, poi resta il DOM stesso la fonte di verità fino
  // all'invio del modulo.
  useEffect(() => {
    const html = noteToEditableHtml(initial?.note ?? "");
    if (noteEditableRef.current) noteEditableRef.current.innerHTML = html;
    if (noteRef.current) noteRef.current.value = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncNoteValue() {
    if (noteRef.current && noteEditableRef.current) {
      noteRef.current.value = noteEditableRef.current.innerHTML;
    }
  }

  function applyFormat(command: "bold" | "italic" | "underline") {
    noteEditableRef.current?.focus();
    document.execCommand(command);
    syncNoteValue();
  }

  // Solo testo semplice in incolla: evita di importare markup/stili
  // indesiderati copiando da Word o da una pagina web.
  function handleNotePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncNoteValue();
  }

  function togglePhrase(id: string) {
    setSelectedPhraseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function insertSelectedPhrases() {
    const testi = phrases
      .filter((p) => selectedPhraseIds.includes(p.id))
      .map((p) => p.testo);
    if (testi.length > 0 && noteEditableRef.current) {
      const current = noteEditableRef.current.innerHTML.trim();
      const htmlToInsert = testi.map(plainTextToHtml).join("<br><br>");
      noteEditableRef.current.innerHTML = current
        ? `${current}<br><br>${htmlToInsert}`
        : htmlToInsert;
      syncNoteValue();
    }
    dialogRef.current?.close();
  }

  return (
    <div
      ref={blockRef}
      onChange={recomputeTotale}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Sede {index + 1}
          </p>
          <label
            className="flex items-center gap-1.5 text-xs text-zinc-600"
            title="Se tolta, la sede resta nell'offerta ma non compare nel PDF di stampa"
          >
            <input
              type="checkbox"
              name={name("mostraInStampa")}
              defaultChecked={initial?.mostraInStampa ?? true}
              className="h-4 w-4"
            />
            Mostra nel PDF
          </label>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 underline"
          >
            ✕ Rimuovi sede
          </button>
        )}
      </div>

      {/* Due colonne su schermo largo: a sinistra i dati della sede (servizio,
          tariffe, prezzi), a destra le Note con la stessa larghezza della
          stampa; su schermo stretto si impilano. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {selectedClient && (
          <label className="flex flex-col gap-1 text-sm xl:col-span-2">
            Sede
            <select
              name={name("siteSelection")}
              required
              value={siteSelection}
              onChange={(e) => setSiteSelection(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Seleziona...</option>
              {selectedClient.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.address}
                </option>
              ))}
              {selectedClient.baseAddress && (
                <option value="__base__">
                  Usa indirizzo cliente: {selectedClient.baseAddress}
                </option>
              )}
              <option value="__custom__">Altro (nuova sede)</option>
            </select>
          </label>
        )}

        {siteSelection === "__custom__" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Nome sede
              <input
                name={name("nuovoNomeSede")}
                placeholder="Es. Sede legale"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm xl:col-span-2">
              Indirizzo
              <input
                name={name("nuovoIndirizzo")}
                required
                placeholder="Via, numero civico, città"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm xl:col-span-2">
          Tipo servizio
          {/* Campo fisso: da chiuso mostra il codice (Abbreviazione del Tipo
              servizio, o il testo tagliato a 25 caratteri se non c'è); aperto
              mostra codice e testo completo. Il valore salvato resta il
              testo intero. */}
          <SearchSelect
            name={name("tipoPrestazione")}
            required
            defaultValue={initial?.tipoPrestazione ?? ""}
            options={[
              ...(initial?.tipoPrestazione &&
              !tipiPrestazione.some((t) => t.etichetta === initial.tipoPrestazione)
                ? [{ value: initial.tipoPrestazione, label: initial.tipoPrestazione, short: truncateText(initial.tipoPrestazione) }]
                : []),
              ...tipiPrestazione.map((t) => ({
                value: t.etichetta,
                label: t.etichetta,
                short: t.abbreviazione?.trim() || truncateText(t.etichetta),
              })),
            ]}
            placeholder="Scrivi il codice o cerca..."
            wrapperClassName="w-full"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Frequenza
          <select
            name={name("serviceType")}
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="ONE_SHOT">{serviceLabels.ONE_SHOT}</option>
            <option value="PASS_SETTIMANALE">
              {serviceLabels.PASS_SETTIMANALE}
            </option>
            <option value="PASS_MENSILE">{serviceLabels.PASS_MENSILE}</option>
            <option value="PASS_ANNUALE">{serviceLabels.PASS_ANNUALE}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Ore per intervento
          <input
            type="number"
            step="0.5"
            name={name("ore")}
            required
            defaultValue={initial?.ore}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Spostamento (ore)
          <input
            type="number"
            step="0.5"
            name={name("spostamento")}
            defaultValue={initial?.spostamento ?? 0.5}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        {/* Vale per tutte le frequenze: lo spostamento entra nel prezzo solo se
            spuntato. Righe nuove: spuntata; righe esistenti: come erano (le
            mensili create prima non lo includevano), così i valori non cambiano. */}
        <label
          className="flex items-center gap-1.5 self-end pb-2 text-sm text-zinc-700"
          title="Se spuntata il prezzo di listino include le ore di spostamento: (ore + spostamento) × passaggi × tariffa. I Passaggi mensili fatti prima non la includevano."
        >
          <input
            type="checkbox"
            name={name("spostamentoInPrezzo")}
            defaultChecked={initial?.spostamentoInPrezzo ?? true}
            className="h-4 w-4"
          />
          Includi spostamento nel prezzo
        </label>

        {serviceType === "ONE_SHOT" && (
          <label className="flex flex-col gap-1 text-sm">
            N. interventi
            <input
              type="number"
              step="0.5"
              name={name("oneShotCount")}
              defaultValue={initial?.oneShotCount ?? 1}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "ONE_SHOT" && (
          <label className="flex flex-col gap-1 text-sm">
            <span title="Mese in cui si esegue l'una tantum: conta come contratto solo in quel mese (se vuoto, il mese in cui accetti l'offerta). Utile quando l'offerta ha anche un canone continuativo.">
              Mese di esecuzione
            </span>
            <input
              type="month"
              name={name("meseUnaTantum")}
              defaultValue={initial?.meseUnaTantum ?? ""}
              className="w-40 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_SETTIMANALE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/settimana
            <input
              type="number"
              step="0.5"
              min="0.5"
              name={name("passSettimanale")}
              required
              defaultValue={initial?.passSettimanale ?? undefined}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_MENSILE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/mese
            <input
              type="number"
              step="0.5"
              min="0.5"
              name={name("passMensile")}
              required
              defaultValue={initial?.passMensile ?? undefined}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_ANNUALE" && (
          <label className="flex flex-col gap-1 text-sm">
            <span title="Quanti passaggi in un anno (es. 6). I prezzi di questa riga sono a passaggio.">
              Passaggi/anno
            </span>
            <input
              type="number"
              step="1"
              min="1"
              name={name("passAnnuali")}
              required
              defaultValue={initial?.passAnnuali ?? undefined}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}
      </div>

      {serviceType !== "ONE_SHOT" && (
        <div className="border-t border-zinc-200 pt-3">
          <button
            type="button"
            onClick={() => setShowSupplementi((v) => !v)}
            className="text-sm text-zinc-600 underline"
          >
            {showSupplementi ? "▾" : "▸"} Supplementi (vetri)
          </button>
          <div
            hidden={!showSupplementi}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-sm">
              Ore vetri/anno
              <input
                type="number"
                step="0.5"
                name={name("oreVetri")}
                defaultValue={initial?.oreVetri ?? 0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pass vetri/anno
              <input
                type="number"
                step="0.5"
                name={name("passVetriAnno")}
                defaultValue={initial?.passVetriAnno ?? 0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tariffa vetri €/h
              <input
                type="number"
                step="0.01"
                name={name("tariffaVetri")}
                defaultValue={initial?.tariffaVetri ?? 30}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-200 pt-3">
        <label className="flex flex-col gap-1 text-sm">
          Tariffa oraria €/h
          <input
            type="number"
            step="0.01"
            name={name("tariffaOraria")}
            defaultValue={initial?.tariffaOraria ?? 25}
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tariffa consuntivo €/h
          <input
            type="number"
            step="0.01"
            name={name("tariffaConsuntivo")}
            defaultValue={initial?.tariffaConsuntivo ?? 25}
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          {serviceType === "PASS_ANNUALE" ? "Totale a passaggio" : "Totale"}
          <div className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900">
            {formatEuro(totale)}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Sconto % (opzionale)
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            name={name("scontoPct")}
            placeholder="Es. 10"
            defaultValue={initial?.scontoPct ?? undefined}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          {serviceType === "PASS_ANNUALE" ? "Netto a passaggio" : "Netto"}
          <input type="hidden" name={name("prezzoVenduto")} defaultValue={netto} />
          <div className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900">
            {formatEuro(netto)}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {serviceType === "PASS_ANNUALE" ? "Adeguamento a passaggio (opzionale)" : "Adeguamento (opzionale)"}
          <input
            type="hidden"
            name={name("adeguamento")}
            readOnly
            value={parseEuroInput(adeguamentoDisplay) ?? ""}
          />
          <input
            type="text"
            inputMode="decimal"
            value={adeguamentoDisplay}
            onChange={(e) => setAdeguamentoDisplay(e.target.value)}
            onBlur={() => {
              const n = parseEuroInput(adeguamentoDisplay);
              setAdeguamentoDisplay(n != null ? formatEuro(n) : "");
            }}
            placeholder="Es. 150,00 €"
            className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
            title="Se compilato, sostituisce il Netto come prezzo venduto finale"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span
            title={
              serviceType === "PASS_ANNUALE"
                ? "Prezzo a passaggio × passaggi/anno"
                : "Prezzo venduto × 11 mesi (nel mese di chiusura aziendale non si fattura per intero); l'una tantum conta una volta"
            }
          >
            {serviceType === "PASS_ANNUALE" ? `Totale annuo (${passAnn || 0} passaggi)` : "Totale annuo (11 mesi)"}
          </span>
          <div className="w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900">
            {formatEuro(
              (parseEuroInput(adeguamentoDisplay) ?? netto) *
                (serviceType === "ONE_SHOT" ? 1 : serviceType === "PASS_ANNUALE" ? passAnn : 11)
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span title="Totale annuo su 11 mesi diviso 12: il canone medio mensile dopo la chiusura aziendale (100 €/mese = 91,67 €)">
            Mese riparametrato
          </span>
          <div className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900">
            {serviceType === "ONE_SHOT"
              ? "—"
              : formatEuro(
                  ((parseEuroInput(adeguamentoDisplay) ?? netto) *
                    (serviceType === "PASS_ANNUALE" ? passAnn : 11)) /
                    12
                )}
          </div>
        </div>
      </div>

      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3 lg:w-[453px] lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
        <div className="flex flex-col gap-1 text-sm">
          Note
          {/* Larghezza e carattere identici alla colonna Descrizione del PDF
              (testo 409,7 px, Arial 12/16 px, circa 55 caratteri in
              maiuscolo): quello che va a capo qui va a capo anche in
              stampa. 436 px = 410 di testo + 2×12 di padding + 2 di bordo. */}
          <div className="flex flex-col" style={{ width: 436, maxWidth: "100%" }}>
          <div className="flex gap-1 rounded-t-lg border border-b-0 border-zinc-300 bg-zinc-50 p-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("bold")}
              className="w-7 rounded px-2 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
              title="Grassetto"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("italic")}
              className="w-7 rounded px-2 py-1 text-xs italic text-zinc-700 hover:bg-zinc-200"
              title="Corsivo"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("underline")}
              className="w-7 rounded px-2 py-1 text-xs underline text-zinc-700 hover:bg-zinc-200"
              title="Sottolineato"
            >
              U
            </button>
          </div>
          <div
            ref={noteEditableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncNoteValue}
            onPaste={handleNotePaste}
            className="min-h-[220px] break-words rounded-b-lg border border-zinc-300 px-3 py-2 text-xs leading-4 text-zinc-700 focus:outline-none"
          />
          </div>
          <textarea ref={noteRef} name={name("note")} hidden readOnly />
          <p className="text-[11px] text-zinc-400">
            Il campo ha la stessa larghezza della stampa: ogni riga qui è una riga del PDF
            (circa 55 caratteri in maiuscolo).
          </p>
        </div>

        {phrases.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
            >
              Scegli frasi preimpostate
              {selectedPhraseIds.length > 0 ? ` (${selectedPhraseIds.length})` : ""}
            </button>

            <dialog
              ref={dialogRef}
              onClick={(e) => {
                if (e.target === dialogRef.current) dialogRef.current.close();
              }}
              className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 backdrop:bg-black/40"
            >
              <div className="flex max-h-[80vh] flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    Frasi preimpostate
                  </p>
                  <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="text-sm text-zinc-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3">
                  {phrases.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-2 rounded-lg border border-zinc-200 p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPhraseIds.includes(p.id)}
                        onChange={() => togglePhrase(p.id)}
                        className="mt-1"
                      />
                      <span
                        className="flex items-baseline gap-1.5"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dialogRect = dialogRef.current?.getBoundingClientRect();
                          const placeRight =
                            !dialogRect || dialogRect.right + 320 <= window.innerWidth;
                          setPreviewPhrase({
                            testo: p.testo,
                            top: rect.top,
                            left: placeRight
                              ? (dialogRect?.right ?? rect.right) + 8
                              : (dialogRect?.left ?? rect.left) - 8 - 320,
                          });
                        }}
                        onMouseLeave={() => setPreviewPhrase(null)}
                      >
                        <span className="font-mono text-xs text-zinc-400">
                          #{String(p.codice).padStart(3, "0")}
                        </span>
                        <span className="font-medium text-zinc-900">{p.titolo}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {previewPhrase && (
                  <div
                    className="pointer-events-none fixed z-50 w-80 whitespace-pre-wrap rounded-md bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg"
                    style={{ top: previewPhrase.top, left: previewPhrase.left }}
                  >
                    {previewPhrase.testo}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-zinc-200 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={insertSelectedPhrases}
                    disabled={selectedPhraseIds.length === 0}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Inserisci nelle note
                  </button>
                </div>
              </div>
            </dialog>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
