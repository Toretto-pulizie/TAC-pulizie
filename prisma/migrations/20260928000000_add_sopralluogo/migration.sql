CREATE TYPE "TipoRichiestaSopralluogo" AS ENUM ('VERBALE', 'SCRITTA', 'TELEFONICA');

CREATE TABLE "Sopralluogo" (
    "id" TEXT NOT NULL,
    "effettuatoDaId" TEXT NOT NULL,
    "richiestaTipo" "TipoRichiestaSopralluogo",
    "richiestaData" TIMESTAMP(3),
    "clienteNome" TEXT,
    "clienteIndirizzo" TEXT,
    "clienteCap" TEXT,
    "clienteCitta" TEXT,
    "clienteTelefono" TEXT,
    "clienteEmail" TEXT,
    "clientePec" TEXT,
    "clientePartitaIva" TEXT,
    "clienteCodiceUnivoco" TEXT,
    "luogoIndirizzo" TEXT,
    "luogoCitta" TEXT,
    "referenteNome" TEXT,
    "referenteCellulare" TEXT,
    "referenteEmail" TEXT,
    "contenutiCapitolati" BOOLEAN NOT NULL DEFAULT false,
    "contenutiPlanimetrie" BOOLEAN NOT NULL DEFAULT false,
    "contenutiAltro" TEXT,
    "note" TEXT,
    "tipologiaLavoro" TEXT,
    "dataSopralluogo" TIMESTAMP(3),
    "mqComplessivi" DOUBLE PRECISION,
    "numDipendenti" INTEGER,
    "numPostazioni" INTEGER,
    "numeroAmbienti" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sopralluogo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SopralluogoAmbiente" (
    "id" TEXT NOT NULL,
    "sopralluogoId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "numero" TEXT,
    "mq" TEXT,
    "pavimento" TEXT,
    "finestre" TEXT,
    "note" TEXT,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SopralluogoAmbiente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SopralluogoRichiesta" (
    "id" TEXT NOT NULL,
    "sopralluogoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "frequenza" TEXT,
    "attrezzature" TEXT,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SopralluogoRichiesta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sopralluogo_effettuatoDaId_idx" ON "Sopralluogo"("effettuatoDaId");

CREATE INDEX "SopralluogoAmbiente_sopralluogoId_idx" ON "SopralluogoAmbiente"("sopralluogoId");

CREATE INDEX "SopralluogoRichiesta_sopralluogoId_idx" ON "SopralluogoRichiesta"("sopralluogoId");

ALTER TABLE "Sopralluogo" ADD CONSTRAINT "Sopralluogo_effettuatoDaId_fkey" FOREIGN KEY ("effettuatoDaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SopralluogoAmbiente" ADD CONSTRAINT "SopralluogoAmbiente_sopralluogoId_fkey" FOREIGN KEY ("sopralluogoId") REFERENCES "Sopralluogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SopralluogoRichiesta" ADD CONSTRAINT "SopralluogoRichiesta_sopralluogoId_fkey" FOREIGN KEY ("sopralluogoId") REFERENCES "Sopralluogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
