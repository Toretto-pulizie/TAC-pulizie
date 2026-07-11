-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "ore" REAL NOT NULL,
    "spostamento" REAL NOT NULL DEFAULT 0,
    "oneShotCount" REAL NOT NULL DEFAULT 1,
    "passSettimanale" REAL,
    "passMensile" REAL,
    "oreVetri" REAL NOT NULL DEFAULT 0,
    "passVetriAnno" REAL NOT NULL DEFAULT 0,
    "tariffaOraria" REAL NOT NULL DEFAULT 25,
    "tariffaVetri" REAL NOT NULL DEFAULT 30,
    "tariffaConsuntivo" REAL NOT NULL DEFAULT 25,
    "prezzoVenduto" REAL,
    "status" TEXT NOT NULL DEFAULT 'IN_TRATTATIVA',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Quote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Quote_siteId_status_idx" ON "Quote"("siteId", "status");
