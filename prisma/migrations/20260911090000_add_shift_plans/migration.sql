-- CreateTable
CREATE TABLE "ShiftPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "quoteSiteId" TEXT,
    "daysOfWeek" INTEGER[],
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "dataInizio" TIMESTAMP(3) NOT NULL,
    "dataFine" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftPlan_siteId_idx" ON "ShiftPlan"("siteId");

-- CreateIndex
CREATE INDEX "ShiftPlan_userId_idx" ON "ShiftPlan"("userId");

-- CreateIndex
CREATE INDEX "ShiftPlan_quoteSiteId_idx" ON "ShiftPlan"("quoteSiteId");

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_quoteSiteId_fkey" FOREIGN KEY ("quoteSiteId") REFERENCES "QuoteSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add planId to Shift
ALTER TABLE "Shift" ADD COLUMN "planId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shift_planId_start_key" ON "Shift"("planId", "start");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ShiftPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
