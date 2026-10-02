-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "rettificaDiId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_rettificaDiId_idx" ON "Invoice"("rettificaDiId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_rettificaDiId_fkey" FOREIGN KEY ("rettificaDiId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
