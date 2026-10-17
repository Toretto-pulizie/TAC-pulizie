-- Dati SMTP inseriti dall'app (password cifrata) per l'invio delle offerte via email.
ALTER TABLE "EmailSettings"
  ADD COLUMN "smtpHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 465,
  ADD COLUMN "smtpUser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpPassCifrata" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpFrom" TEXT NOT NULL DEFAULT '';
