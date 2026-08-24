-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
