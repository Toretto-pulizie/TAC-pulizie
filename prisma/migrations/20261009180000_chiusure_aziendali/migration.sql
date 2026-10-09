-- Sostituisce il canone su 11 mesi (mai pubblicato) con la gestione delle chiusure aziendali
ALTER TABLE "Quote" DROP COLUMN "canoneModalita",
DROP COLUMN "meseSenzaFattura";

DROP TYPE "CanoneModalita";

-- CreateEnum
CREATE TYPE "ChiusuraScelta" AS ENUM ('DA_DEFINIRE', 'CON_PULIZIE', 'SENZA_PULIZIE');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "chiusuraScelta" "ChiusuraScelta" NOT NULL DEFAULT 'DA_DEFINIRE',
ADD COLUMN "chiusuraNote" TEXT,
ADD COLUMN "chiusuraSceltaIl" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Site" ADD COLUMN "accessoSenzaCliente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClosurePeriod" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dal" TIMESTAMP(3) NOT NULL,
    "al" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosurePeriod_pkey" PRIMARY KEY ("id")
);
