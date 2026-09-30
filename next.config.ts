import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permette di aprire il server di sviluppo dal telefono tramite l'IP
  // locale del PC (es. per testare la Timbratura da mobile) senza che
  // Next.js blocchi le richieste cross-origin agli asset di sviluppo.
  allowedDevOrigins: ["192.168.2.2"],
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/admin/preventivi/\\[id\\]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
