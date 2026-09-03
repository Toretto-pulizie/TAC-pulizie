import { prisma } from "@/lib/prisma";

export function formatBancaAppoggio(bank: {
  nomeBanca: string;
  iban: string;
  intestatario: string;
  swiftBic: string;
}): string {
  const parts: string[] = [];
  if (bank.nomeBanca) parts.push(bank.nomeBanca);
  if (bank.iban) parts.push(`IBAN: ${bank.iban}`);
  if (bank.intestatario) parts.push(`Intestatario: ${bank.intestatario}`);
  if (bank.swiftBic) parts.push(`SWIFT/BIC: ${bank.swiftBic}`);
  return parts.join(" - ");
}

export async function getBankSettings() {
  const settings = await prisma.bankSettings.findUnique({
    where: { id: "singleton" },
  });
  return (
    settings ?? {
      id: "singleton",
      nomeBanca: "",
      iban: "",
      intestatario: "",
      swiftBic: "",
    }
  );
}
