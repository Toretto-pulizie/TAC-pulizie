-- CreateTable
CREATE TABLE "ServiceTypeLabel" (
    "tipo" "ServiceType" NOT NULL,
    "etichetta" TEXT NOT NULL,

    CONSTRAINT "ServiceTypeLabel_pkey" PRIMARY KEY ("tipo")
);
