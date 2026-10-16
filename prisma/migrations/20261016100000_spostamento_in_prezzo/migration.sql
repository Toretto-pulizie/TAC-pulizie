-- Spostamento incluso nel prezzo dei Passaggi mensili: falso per le righe esistenti (valori invariati), vero per quelle nuove (impostato dall'app).
ALTER TABLE "QuoteSite" ADD COLUMN "spostamentoInPrezzo" BOOLEAN NOT NULL DEFAULT false;
