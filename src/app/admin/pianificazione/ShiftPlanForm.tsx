"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createShiftPlan } from "@/app/actions/shiftPlans";
import { toDateInputValue } from "@/lib/dates";

const WEEKDAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mer", value: 3 },
  { label: "Gio", value: 4 },
  { label: "Ven", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 0 },
];

type QuoteSiteOption = {
  id: string;
  siteId: string;
  label: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
  ore: number;
};

type Site = { id: string; label: string };
type FrequenzaLabels = { settimanale: string; mensile: string };

// "HH:MM" + ore (anche frazionarie) → nuovo "HH:MM", arrotondato al minuto.
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(hours * 60)) % 1440 + 1440) % 1440;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ShiftPlanForm({
  employees,
  sites,
  quoteSites,
  frequenzaLabels,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  quoteSites: QuoteSiteOption[];
  frequenzaLabels: FrequenzaLabels;
}) {
  const [state, action, pending] = useActionState(createShiftPlan, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [quoteSiteId, setQuoteSiteId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [cadenzaUnit, setCadenzaUnit] = useState<"SETTIMANE" | "MESI">("SETTIMANE");
  const [cadenzaN, setCadenzaN] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  // Ore da dividere tra più collaboratori: se arrivano da un preventivo
  // (scelto qui sopra o dedotto dalla sede) non sono modificabili; solo
  // se il cantiere non ha nessun preventivo accettato si inseriscono a mano.
  const [manualOre, setManualOre] = useState("");

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setQuoteSiteId("");
      setSiteId("");
      setCadenzaUnit("SETTIMANE");
      setCadenzaN(1);
      setSelectedUserIds([]);
      setStartTime("09:00");
      setEndTime("12:00");
      setManualOre("");
    }
  }, [state]);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  function handleQuoteSiteChange(id: string) {
    setQuoteSiteId(id);
    const qs = quoteSites.find((q) => q.id === id);
    if (qs) setSiteId(qs.siteId);
  }

  function handleSiteChange(value: string) {
    setSiteId(value);
    // Un solo preventivo continuativo per questa sede: lo si propone
    // subito. Con più di uno o nessuno, va scelto esplicitamente sopra (o
    // inserito a mano), per non indovinare quello sbagliato.
    const matches = quoteSites.filter((q) => q.siteId === value);
    setQuoteSiteId(matches.length === 1 ? matches[0].id : "");
    setManualOre("");
  }

  const activeQuoteSite = quoteSites.find((q) => q.id === quoteSiteId);
  const oreNum = activeQuoteSite ? activeQuoteSite.ore : parseFloat(manualOre.replace(",", "."));
  const isMultiAuto = selectedUserIds.length > 1 && !Number.isNaN(oreNum) && oreNum > 0;
  const displayedEndTime = isMultiAuto
    ? addHoursToTime(startTime, oreNum / selectedUserIds.length)
    : endTime;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {quoteSites.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Da preventivo continuativo (opzionale)
          <select
            name="quoteSiteId"
            value={quoteSiteId}
            onChange={(e) => handleQuoteSiteChange(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">— Nessuno —</option>
            {quoteSites.map((qs) => (
              <option key={qs.id} value={qs.id}>
                {qs.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 text-sm">
          Collaboratori
          <div className="flex max-w-xs flex-wrap gap-x-3 gap-y-1 rounded-lg border border-zinc-300 px-3 py-2">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="userIds"
                  value={e.id}
                  checked={selectedUserIds.includes(e.id)}
                  onChange={() => toggleUser(e.id)}
                />
                {e.name}
              </label>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Cliente / cantiere
          <select
            name="siteId"
            required
            value={siteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        Giorni della settimana
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((wd) => (
            <label key={wd.value} className="flex items-center gap-1">
              <input type="checkbox" name="daysOfWeek" value={wd.value} />
              {wd.label}
            </label>
          ))}
        </div>
      </div>

      {activeQuoteSite ? (
        // La cadenza si deduce dal preventivo collegato: niente da mostrare
        // o far scegliere, si invia comunque il valore corretto. I contratti
        // mensili usano la cadenza a giorni (mese standard 30gg, non slitta
        // rispetto al calendario); quelli settimanali quella a settimane
        // (già esatta di suo).
        activeQuoteSite.serviceType === "PASS_MENSILE" ? (
          <input type="hidden" name="intervalDays" value={30} />
        ) : (
          <input type="hidden" name="intervalWeeks" value={1} />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Cadenza
              <select
                value={cadenzaUnit}
                onChange={(e) => setCadenzaUnit(e.target.value as "SETTIMANE" | "MESI")}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              >
                <option value="SETTIMANE">{frequenzaLabels.settimanale}</option>
                <option value="MESI">{frequenzaLabels.mensile}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ogni quant{cadenzaUnit === "MESI" ? "i mesi" : "e settimane"}
              <input
                type="number"
                min={1}
                max={cadenzaUnit === "MESI" ? 24 : 52}
                value={cadenzaN}
                onChange={(e) => setCadenzaN(Number(e.target.value))}
                className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            {cadenzaUnit === "MESI" && (
              <p className="pb-2 text-xs text-zinc-400">
                Mese standard di 30 giorni: si piazza nel primo giorno scelto
                sopra a partire da ogni traguardo di {cadenzaN * 30} giorni.
              </p>
            )}
          </div>
          {cadenzaUnit === "SETTIMANE" ? (
            <input type="hidden" name="intervalWeeks" value={cadenzaN} />
          ) : (
            <input type="hidden" name="intervalDays" value={cadenzaN * 30} />
          )}
        </>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Dalle
          <input
            type="time"
            name="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        {selectedUserIds.length > 1 && !activeQuoteSite && (
          <label className="flex flex-col gap-1 text-sm">
            Ore intervento (totali)
            <input
              type="number"
              step="0.25"
              min="0"
              value={manualOre}
              onChange={(e) => setManualOre(e.target.value)}
              placeholder="es. 6"
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Alle
          <input
            type="time"
            name="endTime"
            value={displayedEndTime}
            onChange={(e) => setEndTime(e.target.value)}
            readOnly={isMultiAuto}
            required
            className={`rounded-lg border border-zinc-300 px-3 py-2 ${
              isMultiAuto ? "bg-zinc-100 text-zinc-500" : ""
            }`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data inizio
          <input
            type="date"
            name="dataInizio"
            defaultValue={toDateInputValue(new Date())}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data fine (opzionale)
          <input
            type="date"
            name="dataFine"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {selectedUserIds.length > 1 && (
        <p className="text-sm text-zinc-500">
          {isMultiAuto
            ? `${selectedUserIds.length} collaboratori × ${(oreNum / selectedUserIds.length).toFixed(2)}h ciascuno = ${oreNum}h intervento totali, ad ogni occorrenza.`
            : quoteSites.some((q) => q.siteId === siteId)
              ? "Scegli il preventivo continuativo qui sopra per calcolare automaticamente l'orario di fine di ciascun collaboratore."
              : "Inserisci le ore totali dell'intervento per calcolare automaticamente l'orario di fine di ciascun collaboratore."}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Crea turno ricorrente"}
      </button>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
