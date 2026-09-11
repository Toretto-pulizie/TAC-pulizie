"use client";

import { useEffect, useRef, useState } from "react";
import { computeListPrice } from "@/lib/quotes";

export type ServiceType = "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";

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
  oneShotCount: number;
  passSettimanale: number | null;
  passMensile: number | null;
  oreVetri: number;
  passVetriAnno: number;
  tariffaOraria: number;
  tariffaVetri: number;
  tariffaConsuntivo: number;
  scontoPct: number | null;
  prezzoVenduto: number | null;
  adeguamento: number | null;
  note: string | null;
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
  tipiPrestazione: string[];
}) {
  const [serviceType, setServiceType] = useState<ServiceType>(
    initial?.serviceType ?? "PASS_SETTIMANALE"
  );
  const [siteSelection, setSiteSelection] = useState(initial?.siteId ?? "");
  const [totale, setTotale] = useState(0);
  const [netto, setNetto] = useState(0);
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
    const t =
      Math.round(
        computeListPrice({
          serviceType: st,
          ore: num("ore"),
          spostamento: num("spostamento"),
          oneShotCount: num("oneShotCount", 1),
          passSettimanale: st === "PASS_SETTIMANALE" ? num("passSettimanale") : null,
          passMensile: st === "PASS_MENSILE" ? num("passMensile") : null,
          oreVetri: num("oreVetri"),
          passVetriAnno: num("passVetriAnno"),
          tariffaOraria: num("tariffaOraria"),
          tariffaVetri: num("tariffaVetri"),
        }) * 100
      ) / 100;
    setTotale(t);
    onTotaleChange(index, t);

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
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Sede {index + 1}
        </p>
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

      <div className="flex flex-wrap items-start gap-3">
        {selectedClient && (
          <label className="flex flex-col gap-1 text-sm">
            Sede
            <select
              name={name("siteSelection")}
              required
              value={siteSelection}
              onChange={(e) => setSiteSelection(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
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
            <label className="flex flex-col gap-1 text-sm">
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

        <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
          Tipo servizio
          <select
            name={name("tipoPrestazione")}
            required
            defaultValue={initial?.tipoPrestazione ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {initial?.tipoPrestazione &&
              !tipiPrestazione.includes(initial.tipoPrestazione) && (
                <option value={initial.tipoPrestazione}>
                  {initial.tipoPrestazione}
                </option>
              )}
            {tipiPrestazione.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Frequenza
          <select
            name={name("serviceType")}
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="ONE_SHOT">{serviceLabels.ONE_SHOT}</option>
            <option value="PASS_SETTIMANALE">
              {serviceLabels.PASS_SETTIMANALE}
            </option>
            <option value="PASS_MENSILE">{serviceLabels.PASS_MENSILE}</option>
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
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-200 pt-3">
        <div className="flex flex-col gap-1 text-sm">
          Totale
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
          Netto
          <input type="hidden" name={name("prezzoVenduto")} defaultValue={netto} />
          <div className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900">
            {formatEuro(netto)}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Adeguamento (opzionale)
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
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3">
        <div className="flex flex-col gap-1 text-sm">
          Note
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
            className="min-h-[220px] rounded-b-lg border border-zinc-300 px-3 py-2 focus:outline-none"
          />
          <textarea ref={noteRef} name={name("note")} hidden readOnly />
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
  );
}
