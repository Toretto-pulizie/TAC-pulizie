"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { startOfToday } from "@/lib/timeCalc";
import type { EntryType } from "@prisma/client";

export type PunchInput = {
  type: EntryType;
  siteId?: string;
  lat?: number;
  lng?: number;
};

export async function punch({ type, siteId, lat, lng }: PunchInput) {
  const session = await verifySession();

  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      siteId: siteId || null,
      type,
      lat: lat ?? null,
      lng: lng ?? null,
    },
  });

  revalidatePath("/dipendente");
  revalidatePath("/admin");
}

export async function getTodayEntries(userId: string) {
  return prisma.timeEntry.findMany({
    where: { userId, timestamp: { gte: startOfToday() } },
    include: { site: { include: { client: true } } },
    orderBy: { timestamp: "asc" },
  });
}
