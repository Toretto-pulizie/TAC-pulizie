import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { encrypt } from "./backupCrypto";

// Backups live OUTSIDE the git repo, in TAC-TORETTO/backups (sibling of pulizie-app).
const BACKUPS_DIR = path.resolve(__dirname, "..", "..", "backups");
const BACKUP_ENV_PATH = path.join(BACKUPS_DIR, "backup.env");
const DUMPS_DIR = path.join(BACKUPS_DIR, "dumps");
const KEEP_LAST = 30;

function loadConfig() {
  if (!fs.existsSync(BACKUP_ENV_PATH)) {
    console.error(
      `File di configurazione non trovato: ${BACKUP_ENV_PATH}\n` +
        `Crealo con dentro almeno: DATABASE_URL e BACKUP_ENCRYPTION_PASSPHRASE`
    );
    process.exit(1);
  }
  const parsed = loadEnv({ path: BACKUP_ENV_PATH }).parsed ?? {};
  const env = { ...parsed, ...process.env };

  if (!env.DATABASE_URL) {
    console.error(`DATABASE_URL mancante in ${BACKUP_ENV_PATH}`);
    process.exit(1);
  }
  if (!env.BACKUP_ENCRYPTION_PASSPHRASE) {
    console.error(`BACKUP_ENCRYPTION_PASSPHRASE mancante in ${BACKUP_ENV_PATH}`);
    process.exit(1);
  }
  return env;
}

async function uploadToS3(
  env: Record<string, string | undefined>,
  fileName: string,
  payload: Buffer
) {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BACKUP_BUCKET } =
    env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BACKUP_BUCKET) {
    console.log("Configurazione S3 assente: salto il caricamento cloud.");
    return;
  }
  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BACKUP_BUCKET,
      Key: `backups/${fileName}`,
      Body: payload,
      ServerSideEncryption: "AES256",
    })
  );
  console.log(`Caricato su S3: s3://${S3_BACKUP_BUCKET}/backups/${fileName}`);
}

async function pingHealthcheck(
  env: Record<string, string | undefined>,
  suffix: "" | "/fail",
  body?: string
) {
  if (!env.HEALTHCHECK_URL) return;
  try {
    await fetch(env.HEALTHCHECK_URL + suffix, {
      method: "POST",
      body: body?.slice(0, 10000),
    });
    console.log(`Ping healthchecks.io inviato (${suffix || "ok"})`);
  } catch (err) {
    console.error("Ping a healthchecks.io fallito (non blocca il backup):", err);
  }
}

async function main(env: Record<string, string | undefined>) {
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

  const [
    users,
    leaveRequests,
    clients,
    sites,
    quotes,
    tipiPrestazione,
    quotePhrases,
    serviceTypeLabels,
    shifts,
    timeEntries,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.leaveRequest.findMany(),
    prisma.client.findMany(),
    prisma.site.findMany(),
    prisma.quote.findMany(),
    prisma.tipoPrestazione.findMany(),
    prisma.quotePhrase.findMany(),
    prisma.serviceTypeLabel.findMany(),
    prisma.shift.findMany(),
    prisma.timeEntry.findMany(),
  ]);

  await prisma.$disconnect();

  const data = {
    users,
    leaveRequests,
    clients,
    sites,
    quotes,
    tipiPrestazione,
    quotePhrases,
    serviceTypeLabels,
    shifts,
    timeEntries,
  };
  const counts = Object.fromEntries(
    Object.entries(data).map(([key, rows]) => [key, rows.length])
  );

  const now = new Date();
  const plaintext = JSON.stringify(
    { createdAt: now.toISOString(), counts, data },
    null,
    2
  );
  const encrypted = encrypt(plaintext, env.BACKUP_ENCRYPTION_PASSPHRASE!);

  fs.mkdirSync(DUMPS_DIR, { recursive: true });
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const fileName = `backup-${stamp}.json.enc`;
  const outPath = path.join(DUMPS_DIR, fileName);
  fs.writeFileSync(outPath, encrypted);

  console.log(`Backup cifrato salvato in ${outPath}`);
  console.log(counts);

  try {
    await uploadToS3(env, fileName, encrypted);
  } catch (err) {
    console.error("Caricamento su S3 fallito (il backup locale è comunque salvo):", err);
  }

  // Rotazione: tiene solo gli ultimi KEEP_LAST dump locali.
  const files = fs
    .readdirSync(DUMPS_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json.enc"))
    .sort();
  const toDelete = files.slice(0, Math.max(0, files.length - KEEP_LAST));
  for (const f of toDelete) {
    fs.unlinkSync(path.join(DUMPS_DIR, f));
    console.log(`Rimosso backup locale vecchio: ${f}`);
  }

  await pingHealthcheck(env, "", JSON.stringify(counts));
}

const env = loadConfig();
main(env).catch((err) => {
  console.error("Backup fallito:", err);
  pingHealthcheck(env, "/fail", String(err?.message ?? err)).finally(() => {
    process.exit(1);
  });
});
