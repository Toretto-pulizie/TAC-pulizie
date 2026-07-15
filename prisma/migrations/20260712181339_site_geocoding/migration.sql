/*
  Warnings:

  - Made the column `address` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- Backfill any existing NULL addresses before enforcing NOT NULL
UPDATE "Site" SET "address" = '' WHERE "address" IS NULL;

ALTER TABLE "Site" ALTER COLUMN "address" SET NOT NULL;
