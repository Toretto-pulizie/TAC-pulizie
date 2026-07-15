-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "codiceCliente" TEXT,
ADD COLUMN     "codiceFiscale" TEXT,
ADD COLUMN     "partitaIva" TEXT,
ADD COLUMN     "personaRiferimento" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "condizioniPagamento" TEXT,
ADD COLUMN     "numeroOfferta" SERIAL NOT NULL;
