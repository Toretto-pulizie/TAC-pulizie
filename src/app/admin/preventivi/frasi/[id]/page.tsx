import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../../../AdminNav";
import { EditPhraseForm } from "./EditPhraseForm";

export default async function EditPhrasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const phrase = await prisma.quotePhrase.findUnique({ where: { id } });
  if (!phrase) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="preventivi" />
      <div className="flex flex-col gap-6 p-4 sm:max-w-md sm:p-8">
        <h1 className="text-lg font-semibold text-zinc-900">
          Modifica frase preimpostata
        </h1>
        <EditPhraseForm
          id={phrase.id}
          codice={phrase.codice}
          categoria={phrase.categoria}
          titolo={phrase.titolo}
          testo={phrase.testo}
        />
      </div>
    </div>
  );
}
