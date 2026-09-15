-- CreateEnum
CREATE TYPE "TipoCollaboratore" AS ENUM ('OPERATIVO', 'AMMINISTRATIVO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tipoCollaboratore" "TipoCollaboratore" NOT NULL DEFAULT 'OPERATIVO';
