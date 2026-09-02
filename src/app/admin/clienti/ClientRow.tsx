"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteCapacityEdit } from "./SiteCapacityEdit";
import { SiteActions } from "./SiteActions";
import { ClientActions } from "./ClientActions";

type Site = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  capienza: number | null;
};

function cittaProvincia(address: string) {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} (${parts[parts.length - 1]})`;
  }
  return address;
}

export function ClientRow({
  clientId,
  codiceCliente,
  name,
  tipo,
  sites,
  editHref,
}: {
  clientId: string;
  codiceCliente: number;
  name: string;
  tipo: "AZIENDA" | "PERSONA_FISICA";
  sites: Site[];
  editHref: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstSite = sites[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-zinc-400">
          {String(codiceCliente).padStart(6, "0")}
        </span>
        <p className="font-medium text-zinc-900">{name}</p>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
          {tipo === "AZIENDA" ? "Azienda" : "Privato"}
        </span>
        {firstSite && (
          <>
            <span className="text-sm text-zinc-500">
              {cittaProvincia(firstSite.address)}
            </span>
            <span
              className={
                firstSite.lat && firstSite.lng
                  ? "text-xs text-green-600"
                  : "text-xs text-amber-600"
              }
              title={
                firstSite.lat && firstSite.lng
                  ? "Coordinate GPS trovate"
                  : "Coordinate GPS non trovate per questo indirizzo"
              }
            >
              📍
            </span>
          </>
        )}
        <Link href={editHref} className="text-xs text-zinc-500 underline">
          Modifica
        </Link>
        <ClientActions clientId={clientId} />
        {sites.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-zinc-500 underline"
          >
            Sedi ({sites.length}) {expanded ? "▴" : "▾"}
          </button>
        )}
      </div>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1">
          {sites.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 text-sm text-zinc-600"
            >
              <span>
                — {s.name} ({s.address})
              </span>
              <span
                className={
                  s.lat && s.lng
                    ? "text-xs text-green-600"
                    : "text-xs text-amber-600"
                }
                title={
                  s.lat && s.lng
                    ? "Coordinate GPS trovate"
                    : "Coordinate GPS non trovate per questo indirizzo"
                }
              >
                {s.lat && s.lng ? "📍 georeferenziato" : "📍 non trovato"}
              </span>
              <span className="text-xs text-zinc-400">Capienza:</span>
              <SiteCapacityEdit siteId={s.id} capienza={s.capienza} />
              <SiteActions siteId={s.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
