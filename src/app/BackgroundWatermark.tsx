"use client";

import { useSearchParams } from "next/navigation";

export function BackgroundWatermark() {
  const searchParams = useSearchParams();
  if (searchParams.get("pdf") === "1") return null;

  return (
    <img
      src="/icon-toretto.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen object-cover opacity-[0.15]"
      style={{
        maskImage: "radial-gradient(circle, black 0%, black 55%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(circle, black 0%, black 55%, transparent 85%)",
      }}
    />
  );
}
