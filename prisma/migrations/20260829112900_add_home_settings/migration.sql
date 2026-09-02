-- CreateTable
CREATE TABLE "HomeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "showAlLavoro" BOOLEAN NOT NULL DEFAULT true,
    "showPermessi" BOOLEAN NOT NULL DEFAULT true,
    "showPreventivi" BOOLEAN NOT NULL DEFAULT true,
    "showTurni" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HomeSettings_pkey" PRIMARY KEY ("id")
);
