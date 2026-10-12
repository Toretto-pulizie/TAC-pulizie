-- Nuova frequenza "Passaggi annuali" (es. 6 passaggi l'anno).
ALTER TYPE "ServiceType" ADD VALUE 'PASS_ANNUALE';

-- Passaggi in un anno (solo righe PASS_ANNUALE).
ALTER TABLE "QuoteSite" ADD COLUMN "passAnnuali" DOUBLE PRECISION;
