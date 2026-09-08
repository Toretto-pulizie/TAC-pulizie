-- CreateTable
CREATE TABLE "Fornitore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partitaIva" TEXT,
    "codiceFiscale" TEXT,
    "indirizzo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "note" TEXT,
    "codiceFornitore" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornitore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collaboratore" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT,
    "codiceFiscale" TEXT,
    "indirizzo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "note" TEXT,
    "codiceCollaboratore" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collaboratore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fornitore_codiceFornitore_key" ON "Fornitore"("codiceFornitore");

-- CreateIndex
CREATE UNIQUE INDEX "Collaboratore_codiceCollaboratore_key" ON "Collaboratore"("codiceCollaboratore");
