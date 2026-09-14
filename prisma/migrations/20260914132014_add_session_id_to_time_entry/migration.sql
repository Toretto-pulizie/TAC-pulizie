-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "TimeEntry_sessionId_idx" ON "TimeEntry"("sessionId");
