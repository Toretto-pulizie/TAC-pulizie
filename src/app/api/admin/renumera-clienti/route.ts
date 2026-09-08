import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

// Rinumerazione una tantum di Clienti.codiceCliente secondo la sequenza
// concordata (ordine di comparsa nell'elenco preventivi di Arca Evolution).
// Endpoint temporaneo: da rimuovere subito dopo l'esecuzione.
const MAPPING: [oldCode: number, newCode: number][] = [
  [5, 1],
  [6, 2],
  [7, 3],
  [8, 4],
  [9, 5],
  [10, 6],
  [11, 7],
  [12, 8],
  [38, 9],
  [13, 10],
  [14, 11],
  [15, 12],
  [16, 13],
  [19, 14],
  [18, 15],
  [37, 16],
  [20, 17],
  [21, 18],
  [36, 19],
  [22, 20],
  [35, 21],
  [23, 22],
  [24, 23],
  [25, 24],
  [26, 25],
  [27, 26],
  [28, 27],
  [29, 28],
  [30, 29],
  [31, 30],
  [34, 31],
  [32, 32],
  [3, 33],
  [4, 34],
  [33, 35],
];

export async function POST() {
  await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
    for (const [oldCode, newCode] of MAPPING) {
      await tx.client.update({
        where: { codiceCliente: oldCode },
        data: { codiceCliente: -newCode },
      });
    }
    for (const [, newCode] of MAPPING) {
      await tx.client.update({
        where: { codiceCliente: -newCode },
        data: { codiceCliente: newCode },
      });
    }
    return tx.client.findMany({
      orderBy: { codiceCliente: "asc" },
      select: { codiceCliente: true, name: true },
    });
  });

  return NextResponse.json({ ok: true, clients: result });
}
