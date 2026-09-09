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
  prezzoVenduto: number | null;
  adeguamento: number | null;
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function QuoteSiteFieldset({
  index,
  selectedClient,
  initial,
  canRemove,
  onRemove,
  onTotaleChange,
  serviceLabels,
}: {
  index: number;
  selectedClient: ClientOption | undefined;
  initial?: SiteBlockInitial;
  canRemove: boolean;
  onRemove: () => void;
  onTotaleChange: (index: number, totale: number) => void;
  serviceLabels: Record<ServiceType, string>;
}) {
  const [serviceType, setServiceType] = useState<ServiceType>(
    initial?.serviceType ?? "PASS_SETTIMANALE"
  );
  const [siteSelection, setSiteSelection] = useState(initial?.siteId ?? "");
  const [totale, setTotale] = useState(0);
  const [showSupplementi, setShowSupplementi] = useState(
    () => !!initial && ((initial.oreVetri ?? 0) > 0 || (initial.passVetriAnno ?? 0) > 0)
  );
  const blockRef = useRef<HTMLDivElement>(null);

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
    const t = computeListPrice({
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
    });
    setTotale(t);
    onTotaleChange(index, t);
  }

  useEffect(() => {
    recomputeTotale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

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
              <option value="__custom__">Altro (nuovo indirizzo)</option>
            </select>
          </label>
        )}

        {siteSelection === "__custom__" && (
          <label className="flex flex-col gap-1 text-sm">
            Nuovo indirizzo
            <input
              name={name("nuovoIndirizzo")}
              required
              placeholder="Via, numero civico, città"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Tipo di servizio
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
                step="0.5"
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
            step="0.5"
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
            step="0.5"
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
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Netto (se noto)
          <input
            type="number"
            step="0.01"
            name={name("prezzoVenduto")}
            defaultValue={initial?.prezzoVenduto ?? undefined}
            className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Adeguamento € (opzionale)
          <input
            type="number"
            step="0.01"
            name={name("adeguamento")}
            placeholder="Es. 150"
            defaultValue={initial?.adeguamento ?? undefined}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            title="Se compilato, sostituisce il Netto come prezzo venduto finale"
          />
        </label>
      </div>
    </div>
  );
}
