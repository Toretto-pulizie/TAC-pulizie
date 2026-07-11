-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('TRAVEL_START', 'WORK_START', 'WORK_END');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ONE_SHOT', 'PASS_SETTIMANALE', 'PASS_MENSILE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('IN_TRATTATIVA', 'ACCETTATO', 'RIFIUTATO');

-- CreateEnum
CREATE TYPE "ClientTipo" AS ENUM ('AZIENDA', 'PERSONA_FISICA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cognome" TEXT,
    "telefono" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tipo" "ClientTipo" NOT NULL DEFAULT 'AZIENDA',
    "name" TEXT NOT NULL,
    "ragioneSociale" TEXT,
    "nome" TEXT,
    "cognome" TEXT,
    "indirizzo" TEXT,
    "citta" TEXT,
    "cap" TEXT,
    "provincia" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "capienza" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "ore" DOUBLE PRECISION NOT NULL,
    "spostamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oneShotCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "passSettimanale" DOUBLE PRECISION,
    "passMensile" DOUBLE PRECISION,
    "oreVetri" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passVetriAnno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tariffaOraria" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "tariffaVetri" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "tariffaConsuntivo" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "prezzoVenduto" DOUBLE PRECISION,
    "status" "QuoteStatus" NOT NULL DEFAULT 'IN_TRATTATIVA',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" "EntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Quote_siteId_status_idx" ON "Quote"("siteId", "status");

-- CreateIndex
CREATE INDEX "Shift_userId_start_idx" ON "Shift"("userId", "start");

-- CreateIndex
CREATE INDEX "Shift_siteId_start_idx" ON "Shift"("siteId", "start");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
