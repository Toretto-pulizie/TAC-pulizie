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

export function ClientRow({
  clientId,
  codiceCliente,
  name,
  tipo,
  citta,
  telefono,
  email,
  sites,
  editHref,
}: {
  clientId: string;
  codiceCliente: number;
  name: string;
  tipo: "AZIENDA" | "PERSONA_FISICA";
  citta: string | null;
  telefono: string | null;
  email: string | null;
  sites: Site[];
  editHref: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0">
        <td className="px-3 py-1.5 font-mono text-xs text-zinc-400">
          {String(codiceCliente).padStart(6, "0")}
        </td>
        <td className="px-3 py-1.5">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {tipo === "AZIENDA" ? "Azienda" : "Privato"}
          </span>
        </td>
        <td className="px-3 py-1.5 font-medium text-zinc-900">{name}</td>
        <td className="px-3 py-1.5 text-zinc-500">{citta ?? "—"}</td>
        <td className="px-3 py-1.5 text-zinc-500">{telefono ?? "—"}</td>
        <td className="px-3 py-1.5 text-zinc-500">{email ?? "—"}</td>
        <td className="px-3 py-1.5 text-right whitespace-nowrap">
          <div className="flex justify-end items-center gap-2 text-sm">
            {sites.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-zinc-500 underline"
              >
                Sedi ({sites.length}) {expanded ? "▴" : "▾"}
              </button>
            )}
            <Link href={editHref} className="text-xs text-zinc-500 underline">
              Modifica
            </Link>
            <ClientActions clientId={clientId} />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-100 last:border-0">
          <td colSpan={7} className="bg-zinc-50/60 px-3 py-2">
            <ul className="flex flex-col gap-1">
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
          </td>
        </tr>
      )}
    </>
  );
}
