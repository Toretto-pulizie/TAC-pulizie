# Manuale — Toretto (gestione impresa di pulizie)

> Questo file va aggiornato ogni volta che una funzionalità visibile all'utente cambia, viene aggiunta o rimossa. Non descrive il codice: descrive cosa vede e può fare chi usa l'app.

## Chi usa l'app

- **Titolare (Amministratore)**: accesso completo a tutto, incluse le pagine Utenti e Impostazioni che nessun altro può vedere.
- **Collaboratore**: ha sempre accesso alla propria area personale (timbratura e richiesta permessi). In più può avere accesso a singole pagine del programma, se il titolare gliele ha assegnate da Utenti.

## Accesso

Login con email e password. Dopo l'accesso:
- Il titolare atterra sulla home del programma.
- Un collaboratore **senza** nessun permesso assegnato atterra sulla propria area personale.
- Un collaboratore **con** almeno un permesso assegnato atterra direttamente sul programma (non più sull'area personale), e da lì può tornare alla sua area cliccando "La mia area" in fondo al menu laterale.

## Home (dashboard)

Prima pagina del programma. Mostra, in base a cosa il titolare ha attivato in Impostazioni → Visualizzazione → Home:
- **Al lavoro adesso** (con barra: al lavoro/in spostamento/liberi) e **Preventivi in trattativa** (con barra: in trattativa/accettati/rifiutati).
- **Totale preventivi accettati**: somma del prezzo venduto di tutti i preventivi accettati (solo il numero, senza riepilogo).
- **Totale consuntivi (mese)**: valore a consuntivo del mese corrente (ore lavorate × tariffa), stesso calcolo della pagina Consuntivi — con riepilogo di quanto viene da cantieri in utile e quanto da cantieri in perdita.
- **Turni di oggi**: chi lavora dove, con orario (visibile solo con accesso a Pianificazione).
- **Permessi in attesa**: elenco delle richieste da approvare, cliccabili per andare ad approvarle (visibile solo con accesso a Permessi).
- Ogni sezione appare solo se hai anche accesso al modulo corrispondente (es. Totale consuntivi richiede l'accesso a Consuntivi).
- La pagina (come tutte le altre) si aggiorna da sola ogni 20 secondi: non serve ricaricare per vedere dati nuovi (es. una timbratura appena fatta da un collaboratore).

## Notifiche

Campanella fissa in alto a destra su ogni pagina, con un numero rosso per le notifiche non lette. Avvisa quando:
- un collaboratore invia una richiesta di permesso (avvisa il titolare);
- una richiesta di permesso viene approvata o rifiutata (avvisa chi l'ha inviata);
- un preventivo viene accettato o rifiutato (avvisa il titolare).

Cliccando una notifica si viene portati alla pagina pertinente e la notifica si segna come letta. C'è anche "Segna tutte come lette".

## Area personale del collaboratore (`/dipendente`)

**Timbratura** — si timbra in tre fasi:
1. Si seleziona **Cliente / cantiere**.
2. Si preme **Inizia spostamento** (se si deve raggiungere il cantiere) oppure **Inizia lavoro (senza spostamento)**.
3. Arrivati sul posto, si preme **Sono arrivato, inizio lavoro**; a fine turno, **Fine lavoro**.

La pagina mostra anche i turni programmati nei prossimi 7 giorni e le timbrature già fatte oggi. Se il dispositivo lo consente, viene registrata anche la posizione GPS.

**Richiedi permesso** — si compila: **Tipo** (Infortunio, Malattia, Permesso, Permesso retribuito, Legge 104, Ferie, Ferie aziendali, Maternità anticipata, Maternità facoltativa), **Dal**, **Al**, **Note** (facoltative), poi **Invia richiesta**. Sotto è visibile lo storico delle proprie richieste con lo stato.

## Moduli del programma (menu laterale)

Il menu è diviso in due gruppi: **Clienti** (Pianificazione, Preventivi, Consuntivi, Clienti) e **Collaboratori** (Timbrature, Presenze, Permessi), più **Statistiche** a parte. **Utenti** e **Impostazioni** sono visibili solo al titolare.

Ogni azione di eliminazione (o "Annulla" per le richieste di permesso) chiede conferma prima di procedere.

### Timbrature (`/admin/timbrature`)
Elenco delle timbrature registrate, filtrabile per **Da**/**A** (intervallo di date) e **Collaboratore**. Mostra per ciascun collaboratore le ore totali di lavoro e spostamento nel periodo, e la tabella dettagliata delle sessioni (collaboratore, cliente/cantiere, inizio, fine, se georeferenziata).

### Pianificazione (`/admin/pianificazione`)
Calendario settimanale dei turni assegnati, navigabile con "← Settimana precedente" / "Settimana successiva →". Modulo per assegnare un turno: **Collaboratore**, **Cliente/cantiere**, **Data**, **Dalle**, **Alle**, **Note**. Se il cantiere ha una **capienza** massima impostata, il modulo mostra quante persone sono già assegnate quel giorno e avvisa (senza bloccare) se il limite è superato.

### Presenze (`/admin/presenze`)
Griglia mensile (**Mese**/**Anno** + **Mostra**): una riga per collaboratore, una colonna per giorno, con ore lavorate o il codice dell'assenza approvata (F, M, P, FA, ecc.). Pulsante **Esporta Excel** per il file dettagliato da dare al consulente del lavoro (stesso file scaricabile anche da Timbrature).

### Permessi (`/admin/permessi`)
Elenco di tutte le richieste di permesso/assenza inviate dai collaboratori (in attesa per prime), con azioni **Approva**, **Rifiuta**, **Riapri**, **Elimina**.

### Preventivi (`/admin/preventivi`)
- Pulsante **+ Nuovo preventivo** in cima: apre/chiude il modulo di creazione (rimane chiuso finché non serve, per non intasare la vista). Cliccando **Modifica** su un preventivo esistente il modulo si apre già compilato.
- Il modulo comprende: Cliente, Tipo di prestazione, Tipo di servizio, Ore, Spostamento, Interventi/settimana o mese, Ore/pass vetri, Tariffe, Sconto, Prezzo venduto, Condizioni di pagamento, Note (anche da frasi preimpostate).
- Sotto: tre statistiche (Preventivi in trattativa, Contratti accettati/mese, Valore annuo contratti) e l'elenco preventivi con Cliente/cantiere, Servizio (breve, senza il testo lungo della descrizione), Prezzo listino, Prezzo venduto, Sconto, Stato. Azioni per riga: **Scarica PDF**, **Modifica**, **Accetta/Rifiuta/Riapri**, **Elimina**.
- "Gestisci frasi preimpostate →" porta alla libreria di frasi riutilizzabili nelle note dei preventivi.

### Consuntivi (`/admin/consuntivi`)
Confronta, per **Mese**/**Anno** scelti, quanto contrattualizzato (dai preventivi accettati) con quanto effettivamente lavorato (dalle timbrature): ore lavorate, ore spostamento, importo a consuntivo e scostamento in euro/percentuale (rosso se in perdita, verde se in surplus), per ogni cantiere. Totali generali in cima.

### Clienti (`/admin/clienti`)
- Pulsanti **+ Nuovo cliente** e **+ Nuova sede/cantiere** in cima: aprono/chiudono i rispettivi moduli (restano chiusi finché non servono).
- L'elenco clienti mostra, per riga, solo l'essenziale: codice cliente, nome/ragione sociale, tipo (Azienda/Privato), città e provincia della prima sede con icona di geolocalizzazione, e i link **Modifica**/**Elimina**. Cliccando **Sedi (N) ▾** si espande la riga con l'indirizzo completo di ogni sede, la capienza modificabile e le azioni **Modifica**/**Elimina** per ciascuna.
- **Elimina cliente**: possibile solo se il cliente non ha più sedi/cantieri collegati (vanno eliminati prima, uno per uno, con lo stesso vincolo: un cantiere non si può eliminare se ha preventivi, turni o timbrature collegati).
- **Aggiungi cliente**: Azienda/Persona fisica, poi il campo proposto cambia in base al tipo: **P. IVA** per Azienda (con verifica automatica su VIES che compila da sola Ragione sociale/Indirizzo/CAP/Città/Provincia) oppure **Codice fiscale** per Persona fisica. Seguono Ragione sociale (o Nome+Cognome), Indirizzo, CAP, Persona di riferimento, Note.
- Automatismi sul CAP: se scrivi l'**Indirizzo** e lasci il CAP vuoto, il sistema prova a trovarlo da solo (in base all'indirizzo); se invece scrivi direttamente il **CAP**, compila da sola Città e Provincia. In entrambi i campi un popup al passaggio del mouse ricorda questi automatismi.
- **Aggiungi sede/cantiere**: Cliente, Nome sede, Indirizzo, Capienza (posti) facoltativa.
- Modifica cliente e modifica cantiere hanno pagine dedicate con gli stessi campi. La Capienza di un cantiere si può modificare anche direttamente dall'elenco.

### Statistiche (`/admin/statistiche`)
Solo lettura, quattro tabelle: andamento preventivi ultimi 6 mesi (creati/accettati/conversione/sconto medio/valore), marginalità cantieri del mese corrente, ore lavorate per collaboratore del mese corrente, qualità anagrafica (quanti clienti/cantieri hanno dati completi o sono georeferenziati).

### Utenti (`/admin/utenti`, solo titolare)
- Elenco utenti (Nome, Cognome, Telefono, Email, Ruolo, Stato).
- **Aggiungi utente** / **Modifica utente**: Nome, Cognome, Telefono, Email, Password (o "Nuova password" in modifica, vuoto per non cambiarla), Ruolo (Collaboratore o Amministratore).
- Per i Collaboratori, sezione **Pagine accessibili** con un interruttore per ogni pagina, raggruppate come nel menu (Clienti / Collaboratori / Altro). Utenti e Impostazioni non sono mai assegnabili. Pulsante **Salva permessi**.

### Impostazioni (`/admin/impostazioni`, solo titolare)
- **Tipi di servizio**: rinomina le tre etichette (una tantum/passaggio settimanale/passaggio mensile) usate nei preventivi — cambia solo il nome mostrato, non i calcoli. Per ciascun tipo, l'interruttore **"Mostra cadenza/riepilogo in stampa"** decide se nel PDF compare anche il dettaglio (es. "Cadenza: n° 2 passaggi settimanali così distribuiti") oppure solo l'etichetta — di default acceso per i passaggi settimanali/mensili, spento per una tantum.
- **Tipo di prestazione**: elenco personalizzabile delle voci che aprono la descrizione nei preventivi (es. "PRESTAZIONE ORDINARIA DI PULIZIA UFFICI"). Si aggiungono da "Nuova voce" + Aggiungi; modificarle o eliminarle non cambia i preventivi già creati.
- **Visualizzazione** (schede in alto: Tipi di servizio / Tipo di prestazione / Visualizzazione / Banca — si vede una scheda alla volta) → **Home**: un interruttore per ciascuna sezione della home (Al lavoro adesso, Preventivi in trattativa, Turni di oggi, Permessi in attesa, Totale preventivi accettati, Totale consuntivi) — decide cosa vedono tutti, titolare compreso. Per le card che hanno un riepilogo a colori (Al lavoro adesso, Preventivi in trattativa, Totale consuntivi), un secondo interruttore annidato decide se mostrarlo o lasciare solo il numero.
- **Banca**: Nome banca, IBAN, Intestatario conto, SWIFT/BIC — questi dati compaiono come "Banca d'appoggio" nel PDF dei preventivi stampati. Finché non li compili, quel riquadro resta vuoto nel PDF.

## Backup dei dati

Ogni notte alle 3:00, se il PC dell'ufficio è acceso e con un utente collegato, un'attività pianificata (Utilità di pianificazione Windows) esegue automaticamente `TAC-TORETTO\backups\run-backup.cmd`, che:
1. estrae tutti i dati dal database di produzione;
2. li cifra (AES-256) con una password salvata su Bitwarden;
3. salva la copia cifrata in `TAC-TORETTO\backups\dumps\` (tiene le ultime 30);
4. carica la stessa copia su un bucket privato Amazon S3;
5. segnala l'esito a healthchecks.io, che manda un'email automatica se una notte il backup non arriva.

Se quella notte il PC è spento o nessuno è collegato, il backup salta silenziosamente: è una scelta consapevole (evita di salvare la password di Windows nell'attività pianificata) e per questo esiste l'avviso via email — arrivata quella, il backup riparte da solo alla notte successiva senza bisogno di intervenire.

In caso di disastro (perdita di accesso a Vercel, guasto del database), i dati si possono recuperare da uno di questi due posti con lo script `npm run db:restore` — operazione delicata, da fare insieme con calma.

## Note per chi lavora sul codice

- Progetto in `C:\Users\enrico\Desktop\CLAUDE\TAC-TORETTO\pulizie-app`, avviabile in locale con il preview `pulizie-app` (`.claude/launch.json` nella cartella `CLAUDE`).
- Pubblicazione: commit + `git push origin master` → deploy automatico su Vercel, online su `tac.toret-to.it` in un paio di minuti.
- Aggiornare questo manuale in un commit separato (o nello stesso) quando una modifica cambia cosa l'utente vede o può fare.
