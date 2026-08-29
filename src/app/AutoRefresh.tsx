"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get("pdf") === "1";

  useEffect(() => {
    if (isPdfMode) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, isPdfMode]);

  return null;
}
