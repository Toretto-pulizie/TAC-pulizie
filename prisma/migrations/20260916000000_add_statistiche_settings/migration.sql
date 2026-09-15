-- CreateTable
CREATE TABLE "StatisticheSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "oreDisponibiliNette" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StatisticheSettings_pkey" PRIMARY KEY ("id")
);
