import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { computeListPrice } from "@/lib/quotes";
import { buildDescriptionBlocks, flattenDescriptionBlocks } from "@/lib/quotePrint";
import { getServiceTypeLabels, getServiceTypeMostraCadenza } from "@/lib/serviceTypeLabels";
import { InvoiceForm } from "../InvoiceForm";

export default async function NuovaFatturaPage() {
  await requireModule("fatturazione");

  const [clientsRaw, quotesRaw, serviceLabels, mostraCadenzaSettings] = await Promise.all([
    prisma.client.findMany(),
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      include: { sites: { include: { site: true } } },
      orderBy: { numeroOfferta: "desc" },
    }),
    getServiceTypeLabels(),
    getServiceTypeMostraCadenza(),
  ]);

  const clients = clientsRaw
    .map((c) => ({ id: c.id, name: clientDisplayName(c), tipo: c.tipo }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  // Una voce per Preventivo accettato, con una riga per ciascuna sede:
  // descrizione ripresa identica da quella del PDF Preventivo (sede, tipo
  // servizio, cadenza, note), importo = Adeguamento se presente altrimenti
  // Netto altrimenti il listino calcolato.
  const quotes = quotesRaw.map((q) => ({
    quoteId: q.id,
    clientId: q.clientId,
    numeroOfferta: q.numeroOfferta,
    righe: q.sites.map((qs) => {
      const listPrice = computeListPrice(qs);
      const importo = qs.adeguamento ?? qs.prezzoVenduto ?? listPrice;
      const blocks = buildDescriptionBlocks(
        qs,
        serviceLabels[qs.serviceType],
        mostraCadenzaSettings[qs.serviceType]
      );
      return {
        descrizione: flattenDescriptionBlocks(blocks),
        importo,
      };
    }),
  }));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/fatturazione" className="text-sm text-zinc-500">
          ← Fatturazione
        </Link>
      </div>
      <h1 className="text-lg font-semibold text-zinc-900">Nuova fattura</h1>
      <InvoiceForm
        clients={clients}
        quotes={quotes}
        defaultData={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
