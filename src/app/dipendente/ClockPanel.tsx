"use client";

import { useState, useTransition } from "react";
import { punch } from "@/app/actions/timeEntries";

type Site = { id: string; label: string };
type Status = "FREE" | "TRAVELING" | "WORKING";

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

export function ClockPanel({
  sites,
  status,
  currentSiteLabel,
}: {
  sites: Site[];
  status: Status;
  currentSiteLabel: string | null;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doPunch(type: "TRAVEL_START" | "WORK_START" | "WORK_END") {
    setError(null);
    if (type !== "WORK_END" && !siteId) {
      setError("Seleziona prima un cliente/cantiere.");
      return;
    }
    startTransition(async () => {
      const coords = await getPosition();
      await punch({ type, siteId: type === "WORK_END" ? undefined : siteId, ...coords });
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {status === "FREE" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">
              Cliente / cantiere
            </span>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-3 text-base"
            >
              {sites.length === 0 && <option value="">Nessun cantiere</option>}
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={isPending}
            onClick={() => doPunch("TRAVEL_START")}
            className="rounded-lg bg-zinc-900 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
          >
            Inizia spostamento
          </button>
          <button
            disabled={isPending}
            onClick={() => doPunch("WORK_START")}
            className="rounded-lg border border-zinc-300 px-4 py-4 text-base font-medium text-zinc-800 disabled:opacity-50"
          >
            Inizia lavoro (senza spostamento)
          </button>
        </>
      )}

      {status === "TRAVELING" && (
        <>
          <p className="text-sm text-zinc-500">In spostamento verso</p>
          <p className="text-lg font-semibold text-zinc-900">
            {currentSiteLabel}
          </p>
          <button
            disabled={isPending}
            onClick={() => doPunch("WORK_START")}
            className="rounded-lg bg-zinc-900 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
          >
            Sono arrivato, inizio lavoro
          </button>
        </>
      )}

      {status === "WORKING" && (
        <>
          <p className="text-sm text-zinc-500">Al lavoro presso</p>
          <p className="text-lg font-semibold text-zinc-900">
            {currentSiteLabel}
          </p>
          <button
            disabled={isPending}
            onClick={() => doPunch("WORK_END")}
            className="rounded-lg bg-red-600 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
          >
            Fine lavoro
          </button>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
