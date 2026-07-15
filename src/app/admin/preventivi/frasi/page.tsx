import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../../AdminNav";
import { PhraseForm } from "./PhraseForm";
import { PhraseRow } from "./PhraseRow";

export default async function FrasiPreimpostatePage() {
  await requireAdmin();

  const phrases = await prisma.quotePhrase.findMany({
    orderBy: [{ categoria: "asc" }, { ordine: "asc" }, { titolo: "asc" }],
  });

  const categorie = [...new Set(phrases.map((p) => p.categoria))];

  const byCategoria = new Map<string, typeof phrases>();
  for (const p of phrases) {
    const list = byCategoria.get(p.categoria) ?? [];
    list.push(p);
    byCategoria.set(p.categoria, list);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="preventivi" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
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

        <PhraseForm categorie={categorie} />

        <div className="flex flex-col gap-4">
          {[...byCategoria.entries()].map(([categoria, list]) => (
            <section key={categoria} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                {categoria}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((p) => (
                  <PhraseRow key={p.id} id={p.id} titolo={p.titolo} testo={p.testo} />
                ))}
              </ul>
            </section>
          ))}
          {phrases.length === 0 && (
            <p className="text-sm text-zinc-400">
              Nessuna frase preimpostata ancora creata.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
