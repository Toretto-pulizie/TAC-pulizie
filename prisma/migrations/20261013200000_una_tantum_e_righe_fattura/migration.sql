-- AlterTable
ALTER TABLE "QuoteSite" ADD COLUMN "meseUnaTantum" TEXT;

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN "quoteSiteId" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceLine_quoteSiteId_idx" ON "InvoiceLine"("quoteSiteId");
