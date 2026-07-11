import ExcelJS from "exceljs";
import { MONTH_LABELS } from "@/lib/dates";
import { TIPO_LABELS } from "@/lib/leaveRequests";
import { computeMonthlyAttendance, type EmployeeAttendance } from "@/lib/presenze";
import type { EntryType, StatoRichiesta, TipoAssenza } from "@prisma/client";

const TIPI_ORDINE: TipoAssenza[] = [
  "INFORTUNIO",
  "MALATTIA",
  "PERMESSO",
  "PERMESSO_RETRIBUITO",
  "LEGGE_104",
  "FERIE_RICHIESTE",
  "FERIE_AZIENDALI",
  "MATERNITA_ANTICIPATA",
  "MATERNITA_FACOLTATIVA",
];

type EmployeeLite = { id: string; name: string; cognome: string | null };
type TimeEntryLite = { userId: string; type: EntryType; timestamp: Date };
type LeaveRequestLite = {
  userId: string;
  tipo: TipoAssenza;
  dataInizio: Date;
  dataFine: Date;
  stato: StatoRichiesta;
};

export function buildAttendance(
  employees: EmployeeLite[],
  timeEntries: TimeEntryLite[],
  leaveRequests: LeaveRequestLite[],
  year: number,
  month: number
): EmployeeAttendance[] {
  return computeMonthlyAttendance(employees, timeEntries, leaveRequests, year, month);
}

export async function buildPresenzeWorkbook(
  attendance: EmployeeAttendance[],
  year: number,
  month: number
): Promise<ExcelJS.Buffer> {
  const daysInMonth = new Date(year, month, 0).getDate();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("FOGLIO PRESENZE");

  const firstDayCol = 3; // colonna C
  const totaleOreCol = firstDayCol + daysInMonth;
  const firstAssenzaCol = totaleOreCol + 1;
  const lastCol = firstAssenzaCol + TIPI_ORDINE.length - 1;

  sheet.getCell(1, 2).value = "Ditta:";
  sheet.getCell(1, 2).font = { bold: true };
  sheet.getCell(1, 4).value = "TORETTO";

  sheet.getCell(3, 2).value = "Periodo:";
  sheet.getCell(3, 2).font = { bold: true };
  sheet.getCell(3, 5).value = "MESE:";
  sheet.getCell(3, 5).font = { bold: true };
  sheet.getCell(3, 7).value = MONTH_LABELS[month - 1].toUpperCase();
  sheet.getCell(3, 12).value = "ANNO:";
  sheet.getCell(3, 12).font = { bold: true };
  sheet.getCell(3, 14).value = year;

  const headerRow = 5;
  sheet.getCell(headerRow, 1).value = "n.";
  sheet.getCell(headerRow, 2).value = "Cognome e Nome";
  for (let d = 1; d <= daysInMonth; d++) {
    sheet.getCell(headerRow, firstDayCol + d - 1).value = d;
  }
  sheet.getCell(headerRow, totaleOreCol).value = "Totale\nOre";
  TIPI_ORDINE.forEach((tipo, i) => {
    sheet.getCell(headerRow, firstAssenzaCol + i).value =
      `Totale\n${TIPO_LABELS[tipo]}`;
  });

  for (let c = 1; c <= lastCol; c++) {
    const cell = sheet.getCell(headerRow, c);
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin" } };
  }

  let row = headerRow + 1;
  for (const [idx, a] of attendance.entries()) {
    sheet.getCell(row, 1).value = idx + 1;
    sheet.getCell(row, 2).value = `${a.cognome} ${a.nome}`.trim();

    a.days.forEach((d, i) => {
      const cell = sheet.getCell(row, firstDayCol + i);
      cell.value = d.code ?? d.hours ?? "";
      cell.alignment = { horizontal: "center" };
    });

    sheet.getCell(row, totaleOreCol).value = a.totaleOre;
    sheet.getCell(row, totaleOreCol).font = { bold: true };

    TIPI_ORDINE.forEach((tipo, i) => {
      const count = a.totaliAssenza[tipo] ?? 0;
      if (count > 0) {
        sheet.getCell(row, firstAssenzaCol + i).value = count;
      }
    });

    row++;
  }

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 24;
  for (let d = 0; d < daysInMonth; d++) {
    sheet.getColumn(firstDayCol + d).width = 4;
  }
  sheet.getColumn(totaleOreCol).width = 9;
  for (let i = 0; i < TIPI_ORDINE.length; i++) {
    sheet.getColumn(firstAssenzaCol + i).width = 10;
  }

  return workbook.xlsx.writeBuffer();
}
