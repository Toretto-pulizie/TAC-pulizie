import { prisma } from "@/lib/prisma";
import { getNotificationSettings } from "@/lib/notificationSettings";

export async function notifyUser(userId: string, message: string, link?: string) {
  await prisma.notification.create({ data: { userId, message, link } });
}

export async function notifyAdmins(message: string, link?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, message, link })),
  });
}

type NotificationCategory = "permessi" | "preventivi" | "sopralluoghi";

const CATEGORY_SETTING_KEYS = {
  permessi: "amministrativoPermessi",
  preventivi: "amministrativoPreventivi",
  sopralluoghi: "amministrativoSopralluoghi",
} as const;

// Le notifiche gestionali (nuova richiesta permesso, preventivo
// accettato/rifiutato, sopralluogo compilato) vanno sempre al titolare
// (notifyAdmins) e, in più, ai Collaboratori Amministrativi solo se
// abilitato per quella categoria da Impostazioni. Gli Operativi non le
// ricevono mai — non è una scelta configurabile per loro.
export async function notifyAmministrativiIfEnabled(
  category: NotificationCategory,
  message: string,
  link?: string
) {
  const settings = await getNotificationSettings();
  if (!settings[CATEGORY_SETTING_KEYS[category]]) return;

  const amministrativi = await prisma.user.findMany({
    where: { role: "EMPLOYEE", tipoCollaboratore: "AMMINISTRATIVO", active: true },
    select: { id: true },
  });
  if (amministrativi.length === 0) return;
  await prisma.notification.createMany({
    data: amministrativi.map((a) => ({ userId: a.id, message, link })),
  });
}

export async function getRecentNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
