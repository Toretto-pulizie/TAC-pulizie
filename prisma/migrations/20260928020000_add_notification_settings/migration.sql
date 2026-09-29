CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "amministrativoPermessi" BOOLEAN NOT NULL DEFAULT false,
    "amministrativoPreventivi" BOOLEAN NOT NULL DEFAULT false,
    "amministrativoSopralluoghi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);
