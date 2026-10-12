import type { Quote, QuoteSite, Site } from "@prisma/client";
import { computeListPrice } from "@/lib/quotes";
import type { ChiusureContext } from "@/lib/chiusureData";
import { buildDescriptionBlocks, flattenDescriptionBlocks } from "@/lib/quotePrint";
import type { getServiceTypeLabels, getServiceTypeMostraCadenza } from "@/lib/serviceTypeLabels";

type QuoteWithSites = Quote & { sites: (QuoteSite & { site: Site })[] };

// Un cantiere selezionabile per fattura: una riga per ciascuna sede di ogni
// preventivo accettato (non raggruppate per preventivo), così in
// InvoiceForm si può scegliere liberamente di fatturarne uno solo o più
// insieme, anche se vengono da preventivi diversi.
export function buildSiteOptions(
  quotes: QuoteWithSites[],
  serviceLabels: Awaited<ReturnType<typeof getServiceTypeLabels>>,
  mostraCadenzaSettings: Awaited<ReturnType<typeof getServiceTypeMostraCadenza>>,
  chiusure: ChiusureContext,
  // Righe fattura già emesse/in bozza collegate alle righe d'offerta.
  fatturate: Map<string, { numero: string; mese: string }[]> = new Map()
) {
  return quotes.flatMap((q) =>
    q.sites.map((qs) => {
      const listPrice = computeListPrice(qs);
      const importo = qs.adeguamento ?? qs.prezzoVenduto ?? listPrice;
      const blocks = buildDescriptionBlocks(
        qs,
        serviceLabels[qs.serviceType],
        mostraCadenzaSettings[qs.serviceType]
      );
      return {
        siteId: qs.id,
        clientId: q.clientId,
        quoteId: q.id,
        numeroOfferta: q.numeroOfferta,
        siteName: qs.site.name,
        descrizione: flattenDescriptionBlocks(blocks),
        importo,
        // Dati per proporre l'importo ridotto nel mese di chiusura aziendale.
        serviceType: qs.serviceType,
        fatturazioni: fatturate.get(qs.id) ?? [],
        chiusuraScelta: q.chiusuraScelta,
        accessoSenzaCliente: qs.site.accessoSenzaCliente,
        weekdays: chiusure.weekdaysByQuoteSite.get(qs.id) ?? null,
      };
    })
  );
}
