import { NextRequest, NextResponse } from "next/server";
import { generateAllActivePlans } from "@/lib/shiftPlanGenerator";

export const maxDuration = 60;

// Chiamata quotidianamente da Vercel Cron (vedi vercel.json): estende in
// avanti la finestra di turni generati per ogni ShiftPlan attivo. Richiede
// la variabile d'ambiente CRON_SECRET, che Vercel invia automaticamente
// come header Authorization per i job pianificati.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const result = await generateAllActivePlans();
  return NextResponse.json(result);
}
