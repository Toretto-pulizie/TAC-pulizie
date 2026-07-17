-- AlterTable
ALTER TABLE "QuotePhrase" ADD COLUMN "codice" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "QuotePhrase_codice_key" ON "QuotePhrase"("codice");
