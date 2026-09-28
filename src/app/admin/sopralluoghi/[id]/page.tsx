import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatDateLabel } from "@/lib/dates";

const RICHIESTA_TIPO_LABELS = {
  VERBALE: "Verbale",
  SCRITTA: "Scritta",
  TELEFONICA: "Telefonica",
} as const;

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400 uppercase">{label}</p>
      <p className="text-sm text-zinc-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function SopralluogoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("sopralluoghi");
  const { id } = await params;

  const s = await prisma.sopralluogo.findUnique({
    where: { id },
    include: {
      effettuatoDa: true,
      ambienti: { orderBy: { ordine: "asc" } },
      richieste: { orderBy: { ordine: "asc" } },
    },
  });
  if (!s) notFound();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900">Sopralluogo</h1>
        <Link href="/admin/sopralluoghi" className="text-sm text-zinc-500">
          ← Torna all'elenco
        </Link>
      </header>

      <Section title="Richiesta di offerta">
        <Field label="Tipo" value={s.richiestaTipo ? RICHIESTA_TIPO_LABELS[s.richiestaTipo] : null} />
        <Field label="Del" value={s.richiestaData ? formatDateLabel(s.richiestaData) : null} />
        <Field label="Effettuato da" value={s.effettuatoDa.name} />
      </Section>

      <Section title="Dati del cliente">
        <Field label="Nome / Ragione sociale" value={s.clienteNome} />
        <Field label="Indirizzo" value={s.clienteIndirizzo} />
        <Field label="CAP" value={s.clienteCap} />
        <Field label="Città" value={s.clienteCitta} />
        <Field label="Telefono" value={s.clienteTelefono} />
        <Field label="Email" value={s.clienteEmail} />
        <Field label="PEC" value={s.clientePec} />
        <Field label="P.IVA" value={s.clientePartitaIva} />
        <Field label="Codice univoco" value={s.clienteCodiceUnivoco} />
      </Section>

      <Section title="Dati del luogo del servizio">
        <Field label="Indirizzo" value={s.luogoIndirizzo} />
        <Field label="Città" value={s.luogoCitta} />
        <Field label="Nome referente" value={s.referenteNome} />
        <Field label="Cellulare" value={s.referenteCellulare} />
        <Field label="Email" value={s.referenteEmail} />
      </Section>

      <Section title="Contenuti ricevuti">
        <Field label="Capitolati" value={s.contenutiCapitolati ? "Sì" : "No"} />
        <Field label="Planimetrie" value={s.contenutiPlanimetrie ? "Sì" : "No"} />
        <Field label="Altro" value={s.contenutiAltro} />
        <Field label="Note" value={s.note} />
      </Section>

      <Section title="Tipologia lavoro e sopralluogo">
        <Field label="Tipologia lavoro richiesto" value={s.tipologiaLavoro} />
        <Field label="Data sopralluogo" value={s.dataSopralluogo ? formatDateLabel(s.dataSopralluogo) : null} />
      </Section>

      <Section title="Descrizione dei locali">
        <Field label="Mq complessivi" value={s.mqComplessivi != null ? String(s.mqComplessivi) : null} />
        <Field label="N° dipendenti" value={s.numDipendenti != null ? String(s.numDipendenti) : null} />
        <Field label="N° postazioni" value={s.numPostazioni != null ? String(s.numPostazioni) : null} />
        <Field label="Numero di ambienti" value={s.numeroAmbienti != null ? String(s.numeroAmbienti) : null} />
      </Section>

      {s.ambienti.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ambiente</th>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Mq</th>
                <th className="px-4 py-3 font-medium">Tipo pavimento</th>
                <th className="px-4 py-3 font-medium">Finestre</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {s.ambienti.map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 text-zinc-900">{a.ambiente}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.numero ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.mq ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.pavimento ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.finestre ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">{a.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {s.richieste.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo di pulizia</th>
                <th className="px-4 py-3 font-medium">Frequenza</th>
                <th className="px-4 py-3 font-medium">Attrezzature</th>
              </tr>
            </thead>
            <tbody>
              {s.richieste.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 text-zinc-900">{r.tipo}</td>
                  <td className="px-4 py-2 text-zinc-500">{r.frequenza ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">{r.attrezzature ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
