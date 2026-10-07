"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Pagine "live" (chi sta lavorando adesso, timbrature del giorno) si
// aggiornano ogni `intervalMs`; tutte le altre, dove i dati cambiano di rado,
// ogni `slowIntervalMs`: meno richieste e meno calcolo sul server (limiti del
// piano Vercel) senza perdere i dati che contano in tempo reale.
export function AutoRefresh({
  intervalMs = 150000,
  slowIntervalMs,
  livePaths,
}: {
  intervalMs?: number;
  slowIntervalMs?: number;
  livePaths?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLive = !livePaths || livePaths.includes(pathname);
  const effectiveMs = isLive || !slowIntervalMs ? intervalMs : slowIntervalMs;
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get("pdf") === "1";

  useEffect(() => {
    if (isPdfMode) return;

    let id: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (id != null) return;
      id = setInterval(() => router.refresh(), effectiveMs);
    }
    function stop() {
      if (id == null) return;
      clearInterval(id);
      id = null;
    }

    // In pausa mentre la scheda è in background (telefono con schermo
    // spento, tab non attiva): un dispositivo dimenticato aperto non deve
    // tenere sveglio il database (compute a consumo) quando nessuno lo sta
    // guardando davvero — causa nota di consumo eccessivo di ore di calcolo
    // su Neon.
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, effectiveMs, isPdfMode]);

  return null;
}
