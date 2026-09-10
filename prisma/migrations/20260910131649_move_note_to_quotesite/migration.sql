-- AlterTable: note diventa per-sede (QuoteSite) invece che per-preventivo
ALTER TABLE "QuoteSite" ADD COLUMN "note" TEXT;

-- Migra le note esistenti: ogni sede di un preventivo riceve la nota
-- che prima era condivisa da tutto il documento.
UPDATE "QuoteSite" qs
SET "note" = q."note"
FROM "Quote" q
WHERE qs."quoteId" = q."id" AND q."note" IS NOT NULL;

ALTER TABLE "Quote" DROP COLUMN "note";
