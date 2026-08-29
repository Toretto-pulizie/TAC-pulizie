"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function markNotificationRead(id: string) {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead() {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { userId: session.userId, read: false },
    data: { read: true },
  });
}
