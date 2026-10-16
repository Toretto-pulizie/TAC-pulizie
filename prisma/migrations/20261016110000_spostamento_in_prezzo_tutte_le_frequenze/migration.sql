-- La casella "Includi spostamento nel prezzo" vale per tutte le frequenze.
-- Una tantum, passaggio settimanale e passaggi annuali includevano già lo
-- spostamento: le righe esistenti si segnano come "incluso" per non cambiare i
-- loro valori. Il passaggio mensile resta falso (non lo includeva).
UPDATE "QuoteSite"
SET "spostamentoInPrezzo" = true
WHERE "serviceType" IN ('ONE_SHOT', 'PASS_SETTIMANALE', 'PASS_ANNUALE');
