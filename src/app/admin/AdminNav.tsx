import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/actions/auth";

export function AdminNav({
  active,
}: {
  active:
    | "dashboard"
    | "pianificazione"
    | "preventivi"
    | "consuntivi"
    | "permessi"
    | "presenze"
    | "dipendenti"
    | "clienti"
    | "impostazioni";
}) {
  const linkClass = (key: typeof active) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      key === active
        ? "bg-zinc-900 text-white"
        : "text-zinc-600 hover:bg-zinc-100"
    }`;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-8">
      <Link href="/admin" className="shrink-0">
        <Image src="/logo.png" alt="Toretto" width={120} height={35} priority />
      </Link>
      <nav className="flex flex-wrap gap-2">
        <Link href="/admin" className={linkClass("dashboard")}>
          Timbrature
        </Link>
        <Link
          href="/admin/pianificazione"
          className={linkClass("pianificazione")}
        >
          Pianificazione
        </Link>
        <Link href="/admin/preventivi" className={linkClass("preventivi")}>
          Preventivi
        </Link>
        <Link href="/admin/consuntivi" className={linkClass("consuntivi")}>
          Consuntivi
        </Link>
        <Link href="/admin/permessi" className={linkClass("permessi")}>
          Permessi
        </Link>
        <Link href="/admin/presenze" className={linkClass("presenze")}>
          Presenze
        </Link>
        <Link href="/admin/dipendenti" className={linkClass("dipendenti")}>
          Dipendenti
        </Link>
        <Link href="/admin/clienti" className={linkClass("clienti")}>
          Clienti
        </Link>
        <Link
          href="/admin/impostazioni"
          className={linkClass("impostazioni")}
        >
          Impostazioni
        </Link>
      </nav>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
        >
          Esci
        </button>
      </form>
    </header>
  );
}
