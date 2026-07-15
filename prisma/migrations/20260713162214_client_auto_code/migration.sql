-- Replace the free-text codiceCliente with a system-assigned sequential number
ALTER TABLE "Client" DROP COLUMN "codiceCliente";
ALTER TABLE "Client" ADD COLUMN "codiceCliente" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Client_codiceCliente_key" ON "Client"("codiceCliente");
