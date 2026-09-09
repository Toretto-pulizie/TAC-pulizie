-- CreateTable QuoteSite
CREATE TABLE "QuoteSite" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "ore" DOUBLE PRECISION NOT NULL,
    "spostamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oneShotCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "passSettimanale" DOUBLE PRECISION,
    "passMensile" DOUBLE PRECISION,
    "oreVetri" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passVetriAnno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tariffaOraria" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "tariffaVetri" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "tariffaConsuntivo" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "prezzoVenduto" DOUBLE PRECISION,
    "adeguamento" DOUBLE PRECISION,

    CONSTRAINT "QuoteSite_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add clientId to Quote (nullable until backfilled below)
ALTER TABLE "Quote" ADD COLUMN "clientId" TEXT;

-- Backfill: one QuoteSite row per existing Quote, copying its old site/pricing fields
INSERT INTO "QuoteSite" (
  "id", "quoteId", "siteId", "serviceType", "ore", "spostamento", "oneShotCount",
  "passSettimanale", "passMensile", "oreVetri", "passVetriAnno",
  "tariffaOraria", "tariffaVetri", "tariffaConsuntivo", "prezzoVenduto", "adeguamento"
)
SELECT
  gen_random_uuid()::text, "id", "siteId", "serviceType", "ore", "spostamento", "oneShotCount",
  "passSettimanale", "passMensile", "oreVetri", "passVetriAnno",
  "tariffaOraria", "tariffaVetri", "tariffaConsuntivo", "prezzoVenduto", "adeguamento"
FROM "Quote";

-- Backfill Quote.clientId from the site it used to point at
UPDATE "Quote" q SET "clientId" = s."clientId"
FROM "Site" s
WHERE q."siteId" = s."id";

ALTER TABLE "Quote" ALTER COLUMN "clientId" SET NOT NULL;

-- Drop the old single-site/pricing columns from Quote (now on QuoteSite)
ALTER TABLE "Quote"
  DROP COLUMN "siteId",
  DROP COLUMN "serviceType",
  DROP COLUMN "ore",
  DROP COLUMN "spostamento",
  DROP COLUMN "oneShotCount",
  DROP COLUMN "passSettimanale",
  DROP COLUMN "passMensile",
  DROP COLUMN "oreVetri",
  DROP COLUMN "passVetriAnno",
  DROP COLUMN "tariffaOraria",
  DROP COLUMN "tariffaVetri",
  DROP COLUMN "tariffaConsuntivo",
  DROP COLUMN "prezzoVenduto",
  DROP COLUMN "adeguamento";

DROP INDEX IF EXISTS "Quote_siteId_status_idx";
CREATE INDEX "Quote_clientId_status_idx" ON "Quote"("clientId", "status");

CREATE INDEX "QuoteSite_siteId_idx" ON "QuoteSite"("siteId");
CREATE INDEX "QuoteSite_quoteId_idx" ON "QuoteSite"("quoteId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteSite" ADD CONSTRAINT "QuoteSite_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteSite" ADD CONSTRAINT "QuoteSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
