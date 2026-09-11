import { prisma } from "@/lib/prisma";
import { startOfDay, startOfWeek, addDays } from "@/lib/dates";

// Orizzonte di generazione: quanti giorni in avanti (da oggi) materializzare
// come Shift reali. Ogni esecuzione (manuale o da cron) ripete la stessa
// finestra: le date già generate vengono semplicemente saltate (vincolo
// unique su planId+start), quindi è sicuro chiamarla più volte.
const HORIZON_DAYS = 42;

function combineDateTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const result = new Date(day);
  result.setHours(h, m, 0, 0);
  return result;
}

type PlanForGeneration = {
  id: string;
  userId: string;
  siteId: string;
  daysOfWeek: number[];
  intervalWeeks: number;
  startTime: string;
  endTime: string;
  dataInizio: Date;
  dataFine: Date | null;
  note: string | null;
};

// Le date generate da un piano per la finestra [oggi, oggi+HORIZON_DAYS].
function datesForPlan(plan: PlanForGeneration, today: Date): Date[] {
  const planWeekStart = startOfWeek(plan.dataInizio);
  const dates: Date[] = [];
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const day = addDays(today, i);
    if (day < startOfDay(plan.dataInizio)) continue;
    if (plan.dataFine && day > startOfDay(plan.dataFine)) continue;
    if (!plan.daysOfWeek.includes(day.getDay())) continue;
    const weeksSinceStart = Math.floor(
      (startOfWeek(day).getTime() - planWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    if (weeksSinceStart % plan.intervalWeeks !== 0) continue;
    dates.push(day);
  }
  return dates;
}

export async function generateShiftsForPlan(plan: PlanForGeneration) {
  const today = startOfDay(new Date());
  const dates = datesForPlan(plan, today);
  if (dates.length === 0) return 0;

  const existing = await prisma.shift.findMany({
    where: { planId: plan.id, start: { in: dates.map((d) => combineDateTime(d, plan.startTime)) } },
    select: { start: true },
  });
  const existingTimes = new Set(existing.map((s) => s.start.getTime()));

  const toCreate = dates
    .map((d) => ({
      start: combineDateTime(d, plan.startTime),
      end: combineDateTime(d, plan.endTime),
    }))
    .filter((s) => !existingTimes.has(s.start.getTime()));

  if (toCreate.length === 0) return 0;

  await prisma.shift.createMany({
    data: toCreate.map((s) => ({
      userId: plan.userId,
      siteId: plan.siteId,
      planId: plan.id,
      start: s.start,
      end: s.end,
      notes: plan.note,
    })),
  });

  return toCreate.length;
}

export async function generateAllActivePlans() {
  const today = startOfDay(new Date());
  const plans = await prisma.shiftPlan.findMany({
    where: {
      OR: [{ dataFine: null }, { dataFine: { gte: today } }],
    },
  });

  let total = 0;
  for (const plan of plans) {
    total += await generateShiftsForPlan(plan);
  }
  return { plansChecked: plans.length, shiftsCreated: total };
}
