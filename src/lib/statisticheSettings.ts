import { prisma } from "@/lib/prisma";

export async function getStatisticheSettings() {
  const settings = await prisma.statisticheSettings.findUnique({
    where: { id: "singleton" },
  });
  return settings ?? { id: "singleton", oreDisponibiliNette: false };
}
