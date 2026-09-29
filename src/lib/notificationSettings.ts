import { prisma } from "@/lib/prisma";

export async function getNotificationSettings() {
  const settings = await prisma.notificationSettings.findUnique({
    where: { id: "singleton" },
  });
  return (
    settings ?? {
      id: "singleton",
      amministrativoPermessi: false,
      amministrativoPreventivi: false,
      amministrativoSopralluoghi: false,
    }
  );
}
