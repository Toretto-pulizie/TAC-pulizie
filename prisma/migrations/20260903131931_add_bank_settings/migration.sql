-- CreateTable
CREATE TABLE "BankSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nomeBanca" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "intestatario" TEXT NOT NULL DEFAULT '',
    "swiftBic" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BankSettings_pkey" PRIMARY KEY ("id")
);
