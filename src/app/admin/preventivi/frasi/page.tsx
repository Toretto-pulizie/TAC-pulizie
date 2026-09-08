import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PhraseForm } from "./PhraseForm";
import { PhraseRow } from "./PhraseRow";

export default async function FrasiPreimpostatePage() {
  await requireModule("preventivi");

  const phrases = await prisma.quotePhrase.findMany({
    orderBy: [{ ordine: "asc" }, { titolo: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            Frasi preimpostate
          </h1>
          <Link
            href="/admin/preventivi"
            className="text-sm text-zinc-600 underline"
          >
            ← Torna ai preventivi
          </Link>
        </div>

        <PhraseForm />

        <ul className="flex flex-col gap-2">
          {phrases.map((p) => (
            <PhraseRow
              key={p.id}
              id={p.id}
              codice={p.codice}
              titolo={p.titolo}
              testo={p.testo}
            />
          ))}
        </ul>
        {phrases.length === 0 && (
          <p className="text-sm text-zinc-400">
            Nessuna frase preimpostata ancora creata.
          </p>
        )}
    </div>
  );
}
