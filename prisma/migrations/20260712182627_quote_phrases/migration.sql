-- CreateTable
CREATE TABLE "QuotePhrase" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotePhrase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotePhrase_categoria_idx" ON "QuotePhrase"("categoria");
