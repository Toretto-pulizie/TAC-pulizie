import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { SopralluogoForm } from "./SopralluogoForm";

export default async function SopralluoghiPage() {
  await requireModule("amministrazione");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/dipendente/amministrazione" className="shrink-0 text-sm text-zinc-500">
          ← Indietro
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Sopralluoghi</h1>
      </header>

      <SopralluogoForm />
    </div>
  );
}
