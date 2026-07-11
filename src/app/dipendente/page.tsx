import Image from "next/image";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getTodayEntries } from "@/app/actions/timeEntries";
import { currentStatus } from "@/lib/timeCalc";
import { logout } from "@/app/actions/auth";

const STATUS_LABELS = {
  FREE: "Libera",
  TRAVELING: "In spostamento",
  WORKING: "Al lavoro",
} as const;

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PermessoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

export default async function DipendentePage() {
  const session = await verifySession();

  const [entries, pendingRequests] = await Promise.all([
    getTodayEntries(session.userId),
    prisma.leaveRequest.count({
      where: { userId: session.userId, stato: "IN_ATTESA" },
    }),
  ]);

  const status = currentStatus(entries);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="Toretto"
            width={90}
            height={26}
            priority
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm text-zinc-500">Ciao,</p>
            <h1 className="truncate text-xl font-semibold text-zinc-900">
              {session.name}
            </h1>
          </div>
        </div>
        <form action={logout} className="shrink-0">
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
          >
            Esci
          </button>
        </form>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dipendente/timbratura"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-green-800 bg-green-700 p-4 text-center shadow-sm active:bg-green-800"
        >
          <span className="text-yellow-300">
            <ClockIcon />
          </span>
          <span className="text-base font-semibold text-yellow-300">
            Timbratura
          </span>
          <span className="text-xs text-yellow-200">
            {STATUS_LABELS[status.status]}
          </span>
        </Link>

        <Link
          href="/dipendente/permessi"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-green-800 bg-green-700 p-4 text-center shadow-sm active:bg-green-800"
        >
          <span className="text-yellow-300">
            <PermessoIcon />
          </span>
          <span className="text-base font-semibold text-yellow-300">
            Richiedi permesso
          </span>
          <span className="text-xs text-yellow-200">
            {pendingRequests > 0
              ? `${pendingRequests} in attesa`
              : "Nessuna in attesa"}
          </span>
        </Link>
      </div>
    </div>
  );
}
