-- Nomi e dimensioni degli allegati esterni aggiunti a un invio email (i file non sono archiviati).
ALTER TABLE "QuoteEmailLog" ADD COLUMN "allegatiEsterni" TEXT NOT NULL DEFAULT '';
