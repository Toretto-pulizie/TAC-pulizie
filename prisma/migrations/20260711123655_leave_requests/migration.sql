-- CreateEnum
CREATE TYPE "TipoAssenza" AS ENUM ('INFORTUNIO', 'MALATTIA', 'PERMESSO', 'PERMESSO_RETRIBUITO', 'LEGGE_104', 'FERIE_RICHIESTE', 'FERIE_AZIENDALI', 'MATERNITA_ANTICIPATA', 'MATERNITA_FACOLTATIVA');

-- CreateEnum
CREATE TYPE "StatoRichiesta" AS ENUM ('IN_ATTESA', 'APPROVATO', 'RIFIUTATO');

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoAssenza" NOT NULL,
    "dataInizio" TIMESTAMP(3) NOT NULL,
    "dataFine" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "stato" "StatoRichiesta" NOT NULL DEFAULT 'IN_ATTESA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisoAt" TIMESTAMP(3),

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_dataInizio_idx" ON "LeaveRequest"("userId", "dataInizio");

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
