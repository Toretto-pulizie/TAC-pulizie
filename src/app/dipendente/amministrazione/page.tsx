import Link from "next/link";
import { requireModule } from "@/lib/dal";

function SopralluoghiIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PreventiviIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <path d="M7 3h8l4 4v14H7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" strokeLinecap="round" />
    </svg>
  );
}

export default async function AmministrazionePage() {
  await requireModule("amministrazione");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/dipendente" className="shrink-0 text-sm text-zinc-500">
          ← Indietro
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Amministrazione</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dipendente/amministrazione/sopralluoghi"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white p-4 text-center shadow-sm active:bg-zinc-50"
        >
          <span className="text-zinc-700">
            <SopralluoghiIcon />
          </span>
          <span className="text-base font-semibold text-zinc-800">
            Sopralluoghi
          </span>
        </Link>

        <Link
          href="/dipendente/amministrazione/preventivi"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white p-4 text-center shadow-sm active:bg-zinc-50"
        >
          <span className="text-zinc-700">
            <PreventiviIcon />
          </span>
          <span className="text-base font-semibold text-zinc-800">
            Preventivi
          </span>
        </Link>
      </div>
    </div>
  );
}
