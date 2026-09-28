"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AutoRefresh({ intervalMs = 150000 }: { intervalMs?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get("pdf") === "1";

  useEffect(() => {
    if (isPdfMode) return;

    let id: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (id != null) return;
      id = setInterval(() => router.refresh(), intervalMs);
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
  }, [router, intervalMs, isPdfMode]);

  return null;
}
