import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { NotificationBell } from "@/app/NotificationBell";
import { getRecentNotifications } from "@/lib/notifications";
import { isModuleKey } from "@/lib/modules";

function ProduzioneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <path d="M4 21V9l8-6 8 6v12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-7h6v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AmministrazioneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-10 w-10"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DipendentePage() {
  const session = await verifySession();

  const [user, notifications] = await Promise.all([
    getCurrentUser(),
    getRecentNotifications(session.userId),
  ]);

  const allowed = new Set((user?.allowedModules ?? []).filter(isModuleKey));
  if (!allowed.has("amministrazione")) {
    redirect("/dipendente/produzione");
  }

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
            unoptimized
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm text-zinc-500">Ciao,</p>
            <h1 className="truncate text-xl font-semibold text-zinc-900">
              {session.name}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell initial={notifications} />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dipendente/produzione"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-green-800 bg-green-700 p-4 text-center shadow-sm active:bg-green-800"
        >
          <span className="text-yellow-300">
            <ProduzioneIcon />
          </span>
          <span className="text-base font-semibold text-yellow-300">
            Produzione
          </span>
        </Link>

        <Link
          href="/dipendente/amministrazione"
          className="flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white p-4 text-center shadow-sm active:bg-zinc-50"
        >
          <span className="text-zinc-700">
            <AmministrazioneIcon />
          </span>
          <span className="text-base font-semibold text-zinc-800">
            Amministrazione
          </span>
        </Link>
      </div>
    </div>
  );
}
