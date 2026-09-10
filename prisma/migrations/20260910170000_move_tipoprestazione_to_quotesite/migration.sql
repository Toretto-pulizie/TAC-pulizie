-- AlterTable: Tipo servizio diventa per-sede (QuoteSite) invece che per
-- preventivo, per poter differenziarlo da una sede all'altra.
ALTER TABLE "QuoteSite" ADD COLUMN "tipoPrestazione" TEXT NOT NULL DEFAULT '';

-- Migra il valore esistente: ogni sede di un preventivo riceve il Tipo
-- servizio che prima era condiviso da tutto il documento.
UPDATE "QuoteSite" qs
SET "tipoPrestazione" = q."tipoPrestazione"
FROM "Quote" q
WHERE qs."quoteId" = q."id";

ALTER TABLE "Quote" DROP COLUMN "tipoPrestazione";
