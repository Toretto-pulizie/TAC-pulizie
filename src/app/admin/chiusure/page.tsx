import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Trunc } from "@/app/Trunc";
import { clientDisplayName } from "@/lib/clients";
import { MONTH_LABELS, toDateInputValue } from "@/lib/dates";
import { loadChiusureContext } from "@/lib/chiusureData";
import { fattoreChiusura, modalitaApplicata } from "@/lib/chiusure";
import { ChiusuraRowEdit } from "./ChiusuraRowEdit";
import { PeriodiChiusura } from "./PeriodiChiusura";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

const fmtDate = (d: Date) => d.toLocaleDateString("it-IT");

// Riepilogo della chiusura aziendale: per ogni offerta accettata con servizi
// continuativi, cosa vale (scelta del cliente o regola predefinita), quanto
// si fattura nel mese di chiusura e quante ore di pulizia vanno programmate.
export default async function ChiusurePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireModule("chiusure");
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();

  const [ctx, quotes] = await Promise.all([
    loadChiusureContext(),
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      include: { client: true, sites: { where: { confermata: true }, include: { site: true } } },
      orderBy: { numeroOfferta: "desc" },
    }),
  ]);

  const periodiAnno = ctx.closures.filter((c) => new Date(c.dal).getFullYear() === year);
  const closuresYear = periodiAnno;

  // Mesi toccati dai periodi di chiusura dell'anno.
  const mesi = new Set<number>();
  for (const c of closuresYear) {
    const dal = new Date(c.dal);
    const al = new Date(c.al);
    for (let d = new Date(dal.getFullYear(), dal.getMonth(), 1); d <= al; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      if (d.getFullYear() === year) mesi.add(d.getMonth() + 1);
    }
  }
  const mesiOrdinati = [...mesi].sort((a, b) => a - b);

  const periodsDb = await prisma.closurePeriod.findMany({ orderBy: { dal: "asc" } });
  const periodsList = periodsDb
    .filter((p) => p.dal.getFullYear() === year)
    .map((p) => ({ id: p.id, nome: p.nome, dal: fmtDate(p.dal), al: fmtDate(p.al) }));

  const vendita = (qs: { adeguamento: number | null; prezzoVenduto: number | null }) =>
    qs.adeguamento ?? qs.prezzoVenduto ?? 0;

  const rows = quotes
    .map((q) => {
      const lines = q.sites.filter((qs) => qs.serviceType !== "ONE_SHOT");
      if (lines.length === 0) return null;
      let pieno = 0;
      let ridotto = 0;
      // Passaggi saltati: si mostrano quelli della sede con il canone più alto
      // (sommare più sedi darebbe un rapporto senza senso).
      let saltati = 0;
      let programmati = 0;
      let maxCanone = -1;
      let ore = 0;
      let stima = false;
      const mods = new Set<"a" | "b">();
      let accessoSi = 0;
      for (const qs of lines) {
        const accesso = qs.site.accessoSenzaCliente;
        if (accesso) accessoSi++;
        mods.add(modalitaApplicata(q.chiusuraScelta, accesso));
        const weekdays = ctx.weekdaysByQuoteSite.get(qs.id) ?? null;
        const passiMese =
          qs.serviceType === "PASS_SETTIMANALE" ? (qs.passSettimanale ?? 0) * 4.3 : (qs.passMensile ?? 0);
        for (const m of mesiOrdinati) {
          const f = fattoreChiusura({
            year,
            month: m,
            closures: closuresYear,
            scelta: q.chiusuraScelta,
            accessoSenzaCliente: accesso,
            weekdays,
          });
          pieno += vendita(qs);
          ridotto += vendita(qs) * f.fattore;
          if (vendita(qs) > maxCanone) {
            maxCanone = vendita(qs);
            saltati = f.saltati;
            programmati = f.programmati;
          }
          if (f.metodo === "giorni") stima = true;
          if (f.modalita === "a" && f.programmati > 0) {
            ore += qs.ore * passiMese * (f.saltati / f.programmati);
          }
        }
      }
      return {
        id: q.id,
        numero: q.numeroOfferta,
        cliente: clientDisplayName(q.client),
        sedi: lines.length,
        canone: lines.reduce((s, qs) => s + vendita(qs), 0),
        accesso: accessoSi === 0 ? "no" : accessoSi === lines.length ? "sì" : "parziale",
        scelta: q.chiusuraScelta,
        note: q.chiusuraNote ?? "",
        sceltaIl: q.chiusuraSceltaIl ? fmtDate(q.chiusuraSceltaIl) : null,
        modalita: [...mods].sort().join("/"),
        predefinita: q.chiusuraScelta === "DA_DEFINIRE",
        pieno,
        ridotto,
        saltati,
        programmati,
        ore,
        stima,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const nA = rows.filter((r) => r.modalita === "a").length;
  const nB = rows.filter((r) => r.modalita === "b").length;
  const nMisti = rows.length - nA - nB;
  const nDaDefinire = rows.filter((r) => r.scelta === "DA_DEFINIRE").length;
  const totPieno = rows.reduce((s, r) => s + r.pieno, 0);
  const totRidotto = rows.reduce((s, r) => s + r.ridotto, 0);
  const totOre = rows.reduce((s, r) => s + r.ore, 0);
  const years = [year - 1, year, year + 1];

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Chiusure aziendali</h1>
          <p className="text-sm text-zinc-500">
            Cosa vale per ogni cliente quando chiudiamo (art. III delle clausole): scelta, canone del mese e pulizie da
            programmare.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2 text-sm">
          <select
            name="year"
            defaultValue={year}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
            Mostra
          </button>
        </form>
      </div>

      <PeriodiChiusura periods={periodsList} year={year} />

      {mesiOrdinati.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Inserisci un periodo di chiusura per vedere il riepilogo dei clienti.
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Clienti per modalità</p>
              <p className="text-sm text-zinc-900">
                <span className="text-xl font-semibold">{nA}</span> in a ·{" "}
                <span className="text-xl font-semibold">{nB}</span> in b
                {nMisti > 0 && <> · {nMisti} miste</>}
              </p>
              <p className="text-xs text-zinc-400">{nDaDefinire} ancora da definire (regola predefinita)</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">
                Fatturabile {mesiOrdinati.map((m) => MONTH_LABELS[m - 1]).join(", ")}
              </p>
              <p className="text-xl font-semibold text-zinc-900">{formatEuro(totRidotto)}</p>
              <p className="text-xs text-zinc-400">
                invece di {formatEuro(totPieno)} (−{formatEuro(totPieno - totRidotto)})
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Ore di pulizia da programmare</p>
              <p className="text-xl font-semibold text-zinc-900">{totOre.toFixed(1)}h</p>
              <p className="text-xs text-zinc-400">per chi è in a: due interventi prima e dopo la chiusura</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Giorni di chiusura</p>
              <p className="text-sm text-zinc-900">
                {periodiAnno.map((c, i) => (
                  <span key={i} className="block">
                    {fmtDate(new Date(c.dal))} – {fmtDate(new Date(c.al))}
                  </span>
                ))}
              </p>
            </div>
          </section>

          <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
                <tr>
                  {["N°", "Cliente", "Sedi", "Canone mensile", "Chiavi", "Scelta del cliente", "Applicata", "Passaggi saltati", "Fatturabile", "Ore da programmare"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 align-top last:border-0">
                    <td className="px-3 py-3 font-medium text-zinc-900">{r.numero}</td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      <Trunc text={r.cliente} />
                    </td>
                    <td className="px-3 py-3 text-zinc-500">{r.sedi}</td>
                    <td className="px-3 py-3 text-zinc-500">{formatEuro(r.canone)}</td>
                    <td className="px-3 py-3 text-zinc-500">{r.accesso}</td>
                    <td className="px-3 py-3">
                      <ChiusuraRowEdit
                        quoteId={r.id}
                        scelta={r.scelta}
                        note={r.note}
                        sceltaIl={r.sceltaIl}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          r.modalita === "a"
                            ? "bg-green-100 text-green-700"
                            : r.modalita === "b"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {r.modalita}
                      </span>
                      <span className="mt-1 block text-[11px] text-zinc-400">
                        {r.predefinita ? "predefinita" : "scelta del cliente"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-500">
                      {r.saltati}/{r.programmati}
                      {r.stima && <span className="block text-[11px] text-zinc-400">stima sui giorni</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {formatEuro(r.ridotto)}
                      {r.ridotto < r.pieno - 0.005 && (
                        <span className="block text-[11px] font-normal text-amber-700">
                          −{formatEuro(r.pieno - r.ridotto)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-500">{r.ore > 0 ? `${r.ore.toFixed(1)}h` : "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-zinc-400">
                      Nessuna offerta accettata con servizi continuativi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-zinc-400">
            Passaggi: se la sede ha un turno ricorrente in Pianificazione si contano i passaggi veri, altrimenti si stima
            sui giorni lavorativi. L&apos;importo nelle fatture resta sempre modificabile. Data di oggi:{" "}
            {toDateInputValue(new Date())}.
          </p>
        </>
      )}
    </div>
  );
}
