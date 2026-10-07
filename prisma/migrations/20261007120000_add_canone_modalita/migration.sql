-- CreateEnum
CREATE TYPE "CanoneModalita" AS ENUM ('DODICI_MESI', 'UNDICI_MESI', 'ENTRAMBE');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "canoneModalita" "CanoneModalita" NOT NULL DEFAULT 'DODICI_MESI',
ADD COLUMN "meseSenzaFattura" INTEGER;
