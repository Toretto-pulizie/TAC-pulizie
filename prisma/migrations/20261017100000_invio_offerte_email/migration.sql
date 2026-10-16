-- Invio delle offerte via email: testo predefinito e cronologia degli invii.
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "oggetto" TEXT NOT NULL DEFAULT '',
    "corpo" TEXT NOT NULL DEFAULT '',
    "ccnIndirizzo" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteEmailLog" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "destinatari" TEXT NOT NULL,
    "cc" TEXT NOT NULL DEFAULT '',
    "oggetto" TEXT NOT NULL,
    "esito" TEXT NOT NULL,
    "errore" TEXT,
    "inviatoDa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuoteEmailLog_quoteId_createdAt_idx" ON "QuoteEmailLog"("quoteId", "createdAt");

ALTER TABLE "QuoteEmailLog" ADD CONSTRAINT "QuoteEmailLog_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
