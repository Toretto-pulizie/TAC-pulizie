import { prisma } from "@/lib/prisma";

export async function getCompanySettings() {
  const settings = await prisma.companySettings.findUnique({
    where: { id: "singleton" },
  });
  return (
    settings ?? {
      id: "singleton",
      denominazione: null,
      nome: null,
      cognome: null,
      partitaIva: "",
      codiceFiscale: "",
      indirizzo: "",
      cap: "",
      citta: "",
      provincia: "",
      regimeFiscale: "RF01",
      telefono: "",
      email: "",
      pec: "",
    }
  );
}

// Nome da mostrare nell'header dei documenti: la denominazione se presente
// (società), altrimenti nome+cognome (ditta individuale).
export function companyDisplayName(company: {
  denominazione: string | null;
  nome: string | null;
  cognome: string | null;
}): string {
  if (company.denominazione?.trim()) return company.denominazione.trim();
  return [company.nome, company.cognome].filter(Boolean).join(" ").trim();
}
