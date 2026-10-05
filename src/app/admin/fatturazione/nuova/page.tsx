import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { getServiceTypeLabels, getServiceTypeMostraCadenza } from "@/lib/serviceTypeLabels";
import { InvoiceForm } from "../InvoiceForm";
import { buildSiteOptions } from "../buildSiteOptions";

export default async function NuovaFatturaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireModule("fatturazione");
  const { clientId } = await searchParams;

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

  const sites = buildSiteOptions(quotesRaw, serviceLabels, mostraCadenzaSettings);

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
        sites={sites}
        defaultData={new Date().toISOString().slice(0, 10)}
        initialClientId={clients.some((c) => c.id === clientId) ? clientId : undefined}
      />
    </div>
  );
}
