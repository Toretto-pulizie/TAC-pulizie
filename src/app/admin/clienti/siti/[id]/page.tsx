import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../../../AdminNav";
import { EditSiteForm } from "./EditSiteForm";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!site) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="clienti" />
      <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
        <h1 className="text-lg font-semibold text-zinc-900">
          Modifica cantiere
        </h1>
        <p className="-mt-4 text-sm text-zinc-500">Cliente: {site.client.name}</p>
        <EditSiteForm
          id={site.id}
          name={site.name}
          address={site.address}
          capienza={site.capienza}
        />
      </div>
    </div>
  );
}
