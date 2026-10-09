import Link from "next/link";
import { Trunc } from "@/app/Trunc";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { loadCommesse } from "@/lib/commesseData";
import { InvoiceListActions } from "./InvoiceListActions";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

const STATO_LABELS: Record<string, string> = {
  BOZZA: "Bozza",
  EMESSA: "Emessa",
  INVIATA: "Inviata",
  SCARTATA: "Scartata",
  CONSEGNATA: "Consegnata",
  ACCETTATA: "Accettata",
  RIFIUTATA: "Rifiutata",
  ERRORE_INVIO: "Errore invio",
};

const STATO_COLORS: Record<string, string> = {
  BOZZA: "bg-zinc-100 text-zinc-600",
  EMESSA: "bg-blue-100 text-blue-700",
  INVIATA: "bg-amber-100 text-amber-700",
  SCARTATA: "bg-rose-100 text-rose-700",
  CONSEGNATA: "bg-emerald-100 text-emerald-700",
  ACCETTATA: "bg-emerald-100 text-emerald-700",
  RIFIUTATA: "bg-rose-100 text-rose-700",
  ERRORE_INVIO: "bg-rose-100 text-rose-700",
};

export default async function FatturazionePage() {
  await requireModule("fatturazione");

  const [invoices, commesse] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: true, righe: true },
      // Per numero decrescente (anno e numero); le bozze, ancora senza numero,
      // stanno in cima perché sono quelle da completare.
      orderBy: [
        { anno: { sort: "desc", nulls: "first" } },
        { numero: { sort: "desc", nulls: "first" } },
        { createdAt: "desc" },
      ],
    }),
    loadCommesse(null),
  ]);

  // Clienti con offerte accettate di cui resta ancora qualcosa da fatturare
  // (stesso calcolo delle Commesse, su tutto il periodo).
  const daFatturare = commesse
    .filter((c) => (c.daFatturare ?? 0) > 0.005)
    .sort((a, b) => (b.daFatturare ?? 0) - (a.daFatturare ?? 0));
  const totaleDaFatturare = daFatturare.reduce((s, c) => s + (c.daFatturare ?? 0), 0);

  const rows = invoices.map((inv) => ({
    id: inv.id,
    numero: inv.numero != null ? `${inv.numero}/${inv.anno}` : "—",
    clientName: clientDisplayName(inv.client),
    data: inv.data.toLocaleDateString("it-IT"),
    isCreditNote: inv.tipoDocumento === "TD04",
    // Una nota di credito riduce il totale: gli importi sono salvati positivi.
    totale:
      (inv.tipoDocumento === "TD04" ? -1 : 1) *
      inv.righe.reduce((sum, r) => sum + r.importo, 0),
    stato: inv.stato,
  }));

  const totaleAnnoCorrente = rows
    .filter((r) => r.stato !== "BOZZA")
    .reduce((sum, r) => sum + r.totale, 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Fatturazione</h1>
          <p className="text-sm text-zinc-500">
            Fatture emesse: {formatEuro(totaleAnnoCorrente)} totali, note di credito sottratte (bozze escluse).
          </p>
        </div>
        <Link prefetch={false}
          href="/admin/fatturazione/nuova"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Nuova fattura
        </Link>
      </div>

      {daFatturare.length > 0 && (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Da fatturare: {formatEuro(totaleDaFatturare)}
            </h2>
            <p className="text-xs text-zinc-400">
              Clienti con offerte accettate di cui non è ancora stato fatturato tutto il lavoro
              svolto (contrattualizzato meno fatturato, dall&apos;inizio a oggi).
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
                <tr>
                  {["Offerte N°", "Cliente", "Contrattualizzato", "Fatturato", "Da fatturare", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daFatturare.map((c) => (
                  <tr key={c.clientId} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2 text-zinc-500">{c.numeri.join(", ") || "—"}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      <Trunc text={c.clientName} />
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{formatEuro(c.contratto)}</td>
                    <td className="px-3 py-2 text-zinc-500">{formatEuro(c.fatturato)}</td>
                    <td className="px-3 py-2 font-semibold text-zinc-900">
                      {formatEuro(c.daFatturare ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link prefetch={false}
                        href={`/admin/fatturazione/nuova?clientId=${c.clientId}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        Crea fattura
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
            <tr>
              {["N.", "Cliente", "Data", "Totale", "Stato", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-blue-50/40">
                <td className="px-3 py-2">
                  <Link prefetch={false} href={`/admin/fatturazione/${r.id}`} className="font-medium text-zinc-900 hover:underline">
                    {r.numero}
                  </Link>
                  {r.isCreditNote && (
                    <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      Nota di credito
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  <Trunc text={r.clientName} />
                </td>
                <td className="px-3 py-2 text-zinc-500">{r.data}</td>
                <td className="px-3 py-2 text-zinc-700">{formatEuro(r.totale)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATO_COLORS[r.stato]}`}>
                    {STATO_LABELS[r.stato]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <InvoiceListActions id={r.id} stato={r.stato} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Nessuna fattura ancora creata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
