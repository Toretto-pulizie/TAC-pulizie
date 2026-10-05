"use client";

import { useState, useTransition } from "react";
import { punch } from "@/app/actions/timeEntries";
import { SearchSelect } from "@/app/SearchSelect";

type Site = { id: string; label: string };
type Status = "NESSUNA_GIORNATA" | "SCEGLI_CANTIERE" | "LAVORO" | "SOPRALLUOGO" | "HUB";
type PunchType =
  | "DAY_START"
  | "DAY_END"
  | "WORK_START"
  | "WORK_END"
  | "SOPRALLUOGO_START"
  | "SOPRALLUOGO_END"
  | "PAUSE_START"
  | "PAUSE_END";

const SOPRALLUOGO_VALUE = "__sopralluogo__";

function getPosition(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve({}),
      { timeout: 5000 }
    );
  });
}

// Scelta del cantiere (o del sopralluogo) in sospeso, in attesa della
// conferma esplicita prima di avviare davvero il lavoro.
type PendingChoice = { siteId: string | null; label: string; sopralluogo: boolean };

export function ClockPanel({
  sites,
  status,
  inPausa,
  currentSiteLabel,
}: {
  sites: Site[];
  status: Status;
  inPausa: boolean;
  currentSiteLabel: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);

  function doPunch(type: PunchType, siteId?: string) {
    setError(null);
    startTransition(async () => {
      const coords = await getPosition();
      await punch({ type, siteId, ...coords });
    });
  }

  function handleSelect(value: string) {
    if (!value) return;
    if (value === SOPRALLUOGO_VALUE) {
      setPendingChoice({ siteId: null, label: "Sopralluogo", sopralluogo: true });
    } else {
      const site = sites.find((s) => s.id === value);
      if (site) setPendingChoice({ siteId: site.id, label: site.label, sopralluogo: false });
    }
  }

  function confirmChoice() {
    if (!pendingChoice) return;
    doPunch(
      pendingChoice.sopralluogo ? "SOPRALLUOGO_START" : "WORK_START",
      pendingChoice.siteId ?? undefined
    );
    setPendingChoice(null);
  }

  const siteOptions = [
    ...sites.map((s) => ({ value: s.id, label: s.label })),
    { value: SOPRALLUOGO_VALUE, label: "Sopralluogo" },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {pendingChoice ? (
        <>
          <p className="text-sm text-zinc-500">Confermi?</p>
          <p className="text-lg font-semibold text-zinc-900">{pendingChoice.label}</p>
          <button
            disabled={isPending}
            onClick={confirmChoice}
            className="rounded-lg bg-zinc-900 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
          >
            Conferma
          </button>
          <button
            disabled={isPending}
            onClick={() => setPendingChoice(null)}
            className="rounded-lg border border-zinc-300 px-4 py-4 text-base font-medium text-zinc-800 disabled:opacity-50"
          >
            Annulla
          </button>
        </>
      ) : (
        <>
          {status === "NESSUNA_GIORNATA" && (
            <button
              disabled={isPending}
              onClick={() => doPunch("DAY_START")}
              className="rounded-lg bg-zinc-900 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
            >
              Inizio giornata
            </button>
          )}

          {status === "SCEGLI_CANTIERE" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">
                Scegli il cantiere
              </span>
              <SearchSelect
                options={siteOptions}
                onChange={handleSelect}
                placeholder="Scrivi il cliente o scegli..."
                className="rounded-lg border border-zinc-300 px-3 py-3 text-base"
              />
            </label>
          )}

          {status === "LAVORO" && (
            <>
              <p className="text-sm text-zinc-500">Al lavoro presso</p>
              <p className="text-lg font-semibold text-zinc-900">{currentSiteLabel}</p>
              <button
                disabled={isPending}
                onClick={() => doPunch("WORK_END")}
                className="rounded-lg bg-red-600 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
              >
                Fine lavoro
              </button>
            </>
          )}

          {status === "SOPRALLUOGO" && (
            <>
              <p className="text-sm text-zinc-500">In sopralluogo presso</p>
              <p className="text-lg font-semibold text-zinc-900">{currentSiteLabel}</p>
              <button
                disabled={isPending}
                onClick={() => doPunch("SOPRALLUOGO_END")}
                className="rounded-lg bg-red-600 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
              >
                Fine sopralluogo
              </button>
            </>
          )}

          {status === "HUB" && (
            <>
              <p className="text-sm text-zinc-500">Cantiere concluso. Cosa fai adesso?</p>
              <button
                disabled={isPending}
                onClick={() => doPunch(inPausa ? "PAUSE_END" : "PAUSE_START")}
                className={
                  inPausa
                    ? "rounded-lg border border-amber-400 bg-amber-50 px-4 py-4 text-base font-medium text-amber-800 disabled:opacity-50"
                    : "rounded-lg border border-zinc-300 px-4 py-4 text-base font-medium text-zinc-800 disabled:opacity-50"
                }
              >
                {inPausa ? "Fine pausa" : "Pausa"}
              </button>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700">
                  Prossimo cantiere
                </span>
                <SearchSelect
                  options={siteOptions}
                  onChange={handleSelect}
                  placeholder="Scrivi il cliente o scegli..."
                  className="rounded-lg border border-zinc-300 px-3 py-3 text-base"
                />
              </label>

              <button
                disabled={isPending}
                onClick={() => doPunch("DAY_END")}
                className="rounded-lg bg-zinc-900 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
              >
                Fine giornata
              </button>
            </>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
