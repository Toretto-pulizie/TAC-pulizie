-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "tipoPrestazione" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TipoPrestazione" (
    "id" TEXT NOT NULL,
    "etichetta" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoPrestazione_pkey" PRIMARY KEY ("id")
);
