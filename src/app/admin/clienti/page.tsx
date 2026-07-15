import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../AdminNav";
import { ClientForm } from "./ClientForm";
import { SiteForm } from "./SiteForm";
import { SiteCapacityEdit } from "./SiteCapacityEdit";
import { SiteActions } from "./SiteActions";

export default async function ClientiPage() {
  await requireAdmin();
  const clients = await prisma.client.findMany({
    include: { sites: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="clienti" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <ClientForm />
        <SiteForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />

        <section className="flex flex-col gap-3">
          {clients.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">
                  {String(c.codiceCliente).padStart(6, "0")}
                </span>
                <p className="font-medium text-zinc-900">{c.name}</p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {c.tipo === "AZIENDA" ? "Azienda" : "Persona fisica"}
                </span>
                <Link
                  href={`/admin/clienti/${c.id}`}
                  className="text-xs text-zinc-500 underline"
                >
                  Modifica
                </Link>
              </div>
              {!c.partitaIva && !c.codiceFiscale && (
                <p className="text-xs text-amber-600">
                  Mancano P. IVA / Codice fiscale — completa i dati per lo stampato del preventivo.
                </p>
              )}
              {(c.indirizzo || c.citta) && (
                <p className="text-sm text-zinc-500">
                  {[c.indirizzo, c.cap, c.citta, c.provincia]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {c.notes && <p className="text-sm text-zinc-500">{c.notes}</p>}
              <ul className="mt-2 flex flex-col gap-1">
                {c.sites.map((s) => (
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
                {c.sites.length === 0 && (
                  <li className="text-sm text-zinc-400">
                    Nessuna sede/cantiere.
                  </li>
                )}
              </ul>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-zinc-400">Nessun cliente ancora.</p>
          )}
        </section>
      </div>
    </div>
  );
}
