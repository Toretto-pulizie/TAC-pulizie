-- AlterTable
ALTER TABLE "Client" ADD COLUMN "codiceUnivoco" TEXT;
ALTER TABLE "Client" ADD COLUMN "condizioniPagamento" TEXT;

-- CreateTable
CREATE TABLE "CondizionePagamento" (
    "id" TEXT NOT NULL,
    "etichetta" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CondizionePagamento_pkey" PRIMARY KEY ("id")
);
