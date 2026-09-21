ALTER TABLE "Shift" ADD COLUMN "groupId" TEXT;
UPDATE "Shift" SET "groupId" = gen_random_uuid()::text WHERE "groupId" IS NULL;
ALTER TABLE "Shift" ALTER COLUMN "groupId" SET NOT NULL;
CREATE INDEX "Shift_groupId_idx" ON "Shift"("groupId");

ALTER TABLE "ShiftPlan" ADD COLUMN "groupId" TEXT;
UPDATE "ShiftPlan" SET "groupId" = gen_random_uuid()::text WHERE "groupId" IS NULL;
ALTER TABLE "ShiftPlan" ALTER COLUMN "groupId" SET NOT NULL;
CREATE INDEX "ShiftPlan_groupId_idx" ON "ShiftPlan"("groupId");
