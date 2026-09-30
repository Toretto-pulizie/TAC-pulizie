-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BOZZA', 'INVIATA', 'SCARTATA', 'CONSEGNATA', 'ACCETTATA', 'RIFIUTATA', 'ERRORE_INVIO');

-- CreateEnum
CREATE TYPE "RegimeIva" AS ENUM ('STANDARD', 'REVERSE_CHARGE', 'ESENTE');

-- AlterEnum
BEGIN;
CREATE TYPE "ClientTipo_new" AS ENUM ('AZIENDA', 'PERSONA_FISICA', 'ENTE', 'ASSOCIAZIONE');
ALTER TABLE "public"."Client" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "Client" ALTER COLUMN "tipo" TYPE "ClientTipo_new" USING ("tipo"::text::"ClientTipo_new");
ALTER TYPE "ClientTipo" RENAME TO "ClientTipo_old";
ALTER TYPE "ClientTipo_new" RENAME TO "ClientTipo";
DROP TYPE "public"."ClientTipo_old";
ALTER TABLE "Client" ALTER COLUMN "tipo" SET DEFAULT 'AZIENDA';
COMMIT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "pec" TEXT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "anno" INTEGER,
    "numero" INTEGER,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'TD01',
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condizioniPagamento" TEXT,
    "regimeIva" "RegimeIva" NOT NULL DEFAULT 'STANDARD',
    "note" TEXT,
    "stato" "InvoiceStatus" NOT NULL DEFAULT 'BOZZA',
    "arubaUploadFileName" TEXT,
    "sdiIdentificativo" TEXT,
    "xmlGenerato" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "quantita" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "prezzoUnitario" DOUBLE PRECISION NOT NULL,
    "importo" DOUBLE PRECISION NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dettaglio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "denominazione" TEXT,
    "nome" TEXT,
    "cognome" TEXT,
    "partitaIva" TEXT NOT NULL DEFAULT '',
    "codiceFiscale" TEXT NOT NULL DEFAULT '',
    "indirizzo" TEXT NOT NULL DEFAULT '',
    "cap" TEXT NOT NULL DEFAULT '',
    "citta" TEXT NOT NULL DEFAULT '',
    "provincia" TEXT NOT NULL DEFAULT '',
    "regimeFiscale" TEXT NOT NULL DEFAULT 'RF01',
    "telefono" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "pec" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_quoteId_idx" ON "Invoice"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_anno_numero_key" ON "Invoice"("anno", "numero");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEvent_invoiceId_idx" ON "InvoiceEvent"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'EMESSA' AFTER 'BOZZA';
