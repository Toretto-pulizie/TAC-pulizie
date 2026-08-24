import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./backupCrypto";

const BACKUPS_DIR = path.resolve(__dirname, "..", "..", "backups");
const BACKUP_ENV_PATH = path.join(BACKUPS_DIR, "backup.env");
const CONFIRM_FLAG = "--yes-overwrite-database";

function loadConfig() {
  if (!fs.existsSync(BACKUP_ENV_PATH)) {
    console.error(`File di configurazione non trovato: ${BACKUP_ENV_PATH}`);
    process.exit(1);
  }
  const parsed = loadEnv({ path: BACKUP_ENV_PATH }).parsed ?? {};
  return { ...parsed, ...process.env };
}

async function main() {
  const filePath = process.argv[2];
  const confirmed = process.argv.includes(CONFIRM_FLAG);

  if (!filePath) {
    console.error(
      `Uso: npx tsx prisma/restore.ts <percorso-backup.json.enc> ${CONFIRM_FLAG}\n\n` +
        `Per puntare a un database diverso da quello in backups/backup.env,\n` +
        `imposta la variabile d'ambiente RESTORE_DATABASE_URL.`
    );
    process.exit(1);
  }
  if (!confirmed) {
    console.error(
      `ATTENZIONE: questo script CANCELLA tutti i dati esistenti nel database di destinazione\n` +
        `e li sostituisce con quelli del backup. Se sei sicuro, riesegui aggiungendo ${CONFIRM_FLAG}`
    );
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    process.exit(1);
  }

  const env = loadConfig();
  const databaseUrl = env.RESTORE_DATABASE_URL || env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Nessun DATABASE_URL disponibile (backup.env o RESTORE_DATABASE_URL).");
    process.exit(1);
  }
  if (!env.BACKUP_ENCRYPTION_PASSPHRASE) {
    console.error(`BACKUP_ENCRYPTION_PASSPHRASE mancante in ${BACKUP_ENV_PATH}`);
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  const encrypted = fs.readFileSync(filePath);
  const backup = JSON.parse(decrypt(encrypted, env.BACKUP_ENCRYPTION_PASSPHRASE));
  const { data } = backup;

  console.log(`Ripristino da backup del ${backup.createdAt}...`);

  // Cancella nell'ordine inverso delle dipendenze.
  await prisma.timeEntry.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.site.deleteMany();
  await prisma.quotePhrase.deleteMany();
  await prisma.tipoPrestazione.deleteMany();
  await prisma.serviceTypeLabel.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // Reinserisce nell'ordine delle dipendenze (genitori prima).
  if (data.users?.length) await prisma.user.createMany({ data: data.users });
  if (data.clients?.length) await prisma.client.createMany({ data: data.clients });
  if (data.tipiPrestazione?.length)
    await prisma.tipoPrestazione.createMany({ data: data.tipiPrestazione });
  if (data.quotePhrases?.length)
    await prisma.quotePhrase.createMany({ data: data.quotePhrases });
  if (data.serviceTypeLabels?.length)
    await prisma.serviceTypeLabel.createMany({ data: data.serviceTypeLabels });
  if (data.sites?.length) await prisma.site.createMany({ data: data.sites });
  if (data.leaveRequests?.length)
    await prisma.leaveRequest.createMany({ data: data.leaveRequests });
  if (data.quotes?.length) await prisma.quote.createMany({ data: data.quotes });
  if (data.shifts?.length) await prisma.shift.createMany({ data: data.shifts });
  if (data.timeEntries?.length)
    await prisma.timeEntry.createMany({ data: data.timeEntries });

  // Riallinea i contatori auto-incrementali agli ID più alti effettivamente inseriti.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Client"', 'codiceCliente'), COALESCE((SELECT MAX("codiceCliente") FROM "Client"), 1))`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Quote"', 'numeroOfferta'), COALESCE((SELECT MAX("numeroOfferta") FROM "Quote"), 1))`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"QuotePhrase"', 'codice'), COALESCE((SELECT MAX(codice) FROM "QuotePhrase"), 1))`
  );

  await prisma.$disconnect();
  console.log("Ripristino completato.");
}

main().catch((err) => {
  console.error("Ripristino fallito:", err);
  process.exit(1);
});
