import { prisma } from "@/lib/prisma";
import { monthRange, workingDaysInMonth } from "@/lib/dates";
import { hoursLostToApprovedLeave } from "@/lib/leaveRequests";
import { getStatisticheSettings } from "@/lib/statisticheSettings";

// Ore disponibili nel mese/anno dato: giorni lavorativi (esclusi sabati,
// domeniche, feste comandate e il Patrono di Torino) × 8h × Collaboratori
// Operativi attivi. Se l'interruttore "Ore disponibili al netto dei
// permessi" in Impostazioni è acceso, sottrae le ore dei permessi
// approvati che cadono in quel mese (Ferie aziendali comprese) — stesso
// calcolo condiviso da Consuntivi e Statistiche, per restare coerenti.
export async function getOreDisponibili(year: number, month: number) {
  const [collaboratoriOperativi, settings] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: "EMPLOYEE", tipoCollaboratore: "OPERATIVO" },
      select: { id: true },
    }),
    getStatisticheSettings(),
  ]);

  const lorde = workingDaysInMonth(year, month) * 8 * collaboratoriOperativi.length;

  if (!settings.oreDisponibiliNette) {
    return { ore: lorde, netto: false };
  }

  const { start, end } = monthRange(year, month);
  const approvedLeave = await prisma.leaveRequest.findMany({
    where: {
      stato: "APPROVATO",
      userId: { in: collaboratoriOperativi.map((u) => u.id) },
      dataInizio: { lte: end },
      dataFine: { gte: start },
    },
    select: { dataInizio: true, dataFine: true },
  });
  const perse = hoursLostToApprovedLeave(approvedLeave, year, month);

  return { ore: Math.max(0, lorde - perse), netto: true };
}
