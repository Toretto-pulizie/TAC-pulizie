import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { MONTH_LABELS, monthRange } from "@/lib/dates";
import { buildAttendance, buildPresenzeWorkbook } from "@/lib/presenzeExcel";

export async function GET(request: Request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year =
    parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
  const month =
    parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;
  const { start, end } = monthRange(year, month);

  const [employees, timeEntries, leaveRequests] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      where: {
        timestamp: { gte: start, lte: end },
        type: { in: ["WORK_START", "WORK_END"] },
      },
      select: { userId: true, type: true, timestamp: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        stato: "APPROVATO",
        dataInizio: { lte: end },
        dataFine: { gte: start },
      },
      select: {
        userId: true,
        tipo: true,
        dataInizio: true,
        dataFine: true,
        stato: true,
      },
    }),
  ]);

  const attendance = buildAttendance(employees, timeEntries, leaveRequests, year, month);
  const buffer = await buildPresenzeWorkbook(attendance, year, month);
  const filename = `Presenze ${MONTH_LABELS[month - 1]} ${year}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
