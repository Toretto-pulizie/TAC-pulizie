import { prisma } from "@/lib/prisma";

export async function getHomeSettings() {
  const settings = await prisma.homeSettings.findUnique({
    where: { id: "singleton" },
  });
  return (
    settings ?? {
      id: "singleton",
      showAlLavoro: true,
      showPermessi: true,
      showPreventivi: true,
      showTurni: true,
      showTotalePreventiviAccettati: true,
      showTotaleConsuntivi: true,
      showAlLavoroBar: true,
      showPreventiviBar: true,
      showTotaleConsuntiviBar: true,
    }
  );
}
