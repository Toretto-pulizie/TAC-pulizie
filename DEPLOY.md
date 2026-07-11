## Portare l'app online (Vercel + Postgres)

### 1. Database di produzione

1. Vai su [vercel.com/dashboard](https://vercel.com/dashboard) → tab **Storage** → **Create Database** → scegli **Neon (Postgres)** → segui i passaggi (regione: Europa).
2. Collega il database al progetto quando richiesto. Vercel imposta automaticamente `DATABASE_URL` per te.

### 2. Variabili d'ambiente

Nel progetto Vercel → **Settings → Environment Variables**, aggiungi:

| Nome | Valore |
| --- | --- |
| `SESSION_SECRET` | genera con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `INITIAL_ADMIN_EMAIL` | es. `admin@toret-to.it` |
| `INITIAL_ADMIN_PASSWORD` | una password vera, la userai per il primo accesso |

`DATABASE_URL` è già impostata dal passo 1.

### 3. Primo deploy

Il progetto è collegato al repository GitHub: ogni `git push` sul branch principale avvia automaticamente un nuovo deploy.
Il comando di build (`npm run build`) applica le migrazioni del database e crea l'account amministratore da solo — non serve nessun comando manuale.

Dopo il primo deploy, accedi con `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` e cambia la password dalla pagina "Modifica dipendente" del tuo account.

### 4. Collegare il dominio toret-to.it

1. Nel progetto Vercel → **Settings → Domains** → aggiungi il dominio (es. `gestionale.toret-to.it` per un sottodominio dedicato, oppure `toret-to.it` per il dominio principale).
2. Vercel mostra il record DNS da creare (di solito un `CNAME` per un sottodominio, o due record `A` per il dominio principale).
3. Vai dal tuo gestore DNS (dove sono configurate le email `@toret-to.it`) e aggiungi il record indicato da Vercel.
4. La propagazione richiede da pochi minuti a qualche ora; Vercel attiva HTTPS automaticamente una volta rilevato il dominio.

### Aggiornamenti futuri

Ogni volta che il codice viene modificato e caricato su GitHub, Vercel ricostruisce e pubblica automaticamente la nuova versione — non serve alcuna azione manuale sul server.
