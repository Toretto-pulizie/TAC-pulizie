-- Riallinea "codice" all'ordine cronologico reale di inserimento (createdAt),
-- perche' ALTER TABLE ... ADD COLUMN SERIAL assegna in base all'ordine fisico
-- delle righe, che puo' differire da createdAt se una frase e' stata modificata.

DROP INDEX IF EXISTS "QuotePhrase_codice_key";

UPDATE "QuotePhrase" AS t
SET "codice" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "QuotePhrase"
) AS sub
WHERE t.id = sub.id;

CREATE UNIQUE INDEX "QuotePhrase_codice_key" ON "QuotePhrase"("codice");

SELECT setval(pg_get_serial_sequence('"QuotePhrase"', 'codice'), (SELECT COALESCE(MAX(codice), 0) FROM "QuotePhrase"));
