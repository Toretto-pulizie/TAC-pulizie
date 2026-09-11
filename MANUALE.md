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

## Barra superiore

In cima ad ogni pagina, sopra il contenuto: a sinistra il pulsante **☰** apre/chiude il menu laterale (utile su schermi piccoli o per avere più spazio); a destra la campanella delle notifiche e il menu utente (vedi sotto). Subito sotto, una seconda riga mostra il titolo della pagina in cui ci si trova, aggiornato automaticamente in base alla voce di menu selezionata.

## Home (dashboard)

Prima pagina del programma. Mostra, in base a cosa il titolare ha attivato in Impostazioni → Visualizzazione → Home:
- **Al lavoro adesso** (con barra: al lavoro/in spostamento/liberi) e **Preventivi in trattativa** (con barra: in trattativa/accettati/rifiutati).
- **Totale preventivi accettati**: somma del prezzo venduto delle sole sedi ricorrenti (passaggio settimanale/mensile) di tutti i preventivi accettati (solo il numero, senza riepilogo) — le sedi "Una tantum" (es. una pulizia a fondo aggiunta come sede extra nello stesso preventivo) non vengono conteggiate qui, perché non sono un canone che si ripete ogni mese.
- **Totale consuntivi (mese)**: valore a consuntivo del mese corrente (ore lavorate × tariffa), stesso calcolo della pagina Consuntivi — con riepilogo di quanto viene da cantieri in utile e quanto da cantieri in perdita.
- **Turni di oggi**: chi lavora dove, con orario (visibile solo con accesso a Pianificazione).
- **Permessi in attesa**: elenco delle richieste da approvare, cliccabili per andare ad approvarle (visibile solo con accesso a Permessi).
- Ogni sezione appare solo se hai anche accesso al modulo corrispondente (es. Totale consuntivi richiede l'accesso a Consuntivi).
- La pagina (come tutte le altre) si aggiorna da sola ogni 20 secondi: non serve ricaricare per vedere dati nuovi (es. una timbratura appena fatta da un collaboratore).

## Notifiche

Campanella nella barra superiore di ogni pagina, con un numero rosso per le notifiche non lette. Avvisa quando:
- un collaboratore invia una richiesta di permesso (avvisa il titolare);
- una richiesta di permesso viene approvata o rifiutata (avvisa chi l'ha inviata);
- un preventivo viene accettato o rifiutato (avvisa il titolare).

Cliccando una notifica si viene portati alla pagina pertinente e la notifica si segna come letta. C'è anche "Segna tutte come lette".

## Menu utente

Accanto alla campanella, nella barra superiore, il cerchietto con l'iniziale e il proprio nome apre il menu personale:
- **Modifica nome**: cambia il proprio nome visualizzato.
- **Cambia password**: richiede la password attuale, poi la nuova password (due volte per conferma).
- **Gestione utenti** (solo titolare): collegamento rapido alla pagina Utenti.
- **Esci**: chiude la sessione.

## Area personale del collaboratore (`/dipendente`)

**Timbratura** — si timbra in tre fasi:
1. Si seleziona **Cliente / cantiere**.
2. Si preme **Inizia spostamento** (se si deve raggiungere il cantiere) oppure **Inizia lavoro (senza spostamento)**.
3. Arrivati sul posto, si preme **Sono arrivato, inizio lavoro**; a fine turno, **Fine lavoro**.

La pagina mostra anche i turni programmati nei prossimi 7 giorni e le timbrature già fatte oggi. Se il dispositivo lo consente, viene registrata anche la posizione GPS.

**Richiedi permesso** — si compila: **Tipo** (Infortunio, Malattia, Permesso, Permesso retribuito, Legge 104, Ferie, Ferie aziendali, Maternità anticipata, Maternità facoltativa), **Dal**, **Al**, **Note** (facoltative), poi **Invia richiesta**. Sotto è visibile lo storico delle proprie richieste con lo stato.

## Moduli del programma (menu laterale)

Il menu è diviso in quattro gruppi, in quest'ordine:
- **Anagrafiche**: Clienti, Fornitori, Collaboratori (le schede anagrafiche dei collaboratori — dati personali, non l'accesso al programma).
- **Gestione**: Pianificazione, Preventivi, Consuntivi.
- **Produzione**: Timbrature, Presenze, Permessi (i moduli operativi che i collaboratori usano ogni giorno).
- **Utilità**: Statistiche.

In fondo al menu resta solo **Impostazioni** (solo titolare) — **Utenti** ed **Esci** sono nel menu utente in alto a destra (vedi sopra).

Ogni azione di eliminazione (o "Annulla" per le richieste di permesso) chiede conferma prima di procedere.

### Timbrature (`/admin/timbrature`)
Elenco delle timbrature registrate, filtrabile per **Da**/**A** (intervallo di date) e **Collaboratore**. Mostra per ciascun collaboratore le ore totali di lavoro e spostamento nel periodo, e una griglia dati con Collaboratore, Cliente, Sede, Data, Inizio, Fine, Ore lavoro, Spostamento, GPS e Note.
- **Raggruppa per** Dipendente / Cliente / Sede: le stesse sessioni vengono organizzate per gruppo invece che in un unico elenco.
- **Modifica diretta in cella**: un clic su Inizio, Fine, Ore lavoro, Spostamento o Note li rende editabili sul posto — Invio conferma, Esc annulla. Modificare Ore lavoro sposta automaticamente l'orario di Fine; modificare Spostamento crea, aggiorna o rimuove la relativa timbratura di viaggio (mettendolo a 0 la elimina). Una sessione "In corso" (senza Fine) può essere chiusa impostando direttamente Fine oppure Ore lavoro.
- **"+ Aggiungi timbratura manuale"**: apre un modulo per inserire una sessione da zero (Collaboratore, Sede, Data, Spostamento opzionale, Note) — per i casi in cui il collaboratore non abbia timbrato dall'app. Inizio e Fine sono entrambi facoltativi: se conosci gli orari esatti li scrivi (Inizio + Fine), altrimenti basta compilare solo **Ore lavorate** (es. "2:30" per 2 ore e 30 minuti, oppure "1,5" per un'ora e mezza — un numero semplice è sempre in ore, non in minuti) — l'importante è il tempo complessivo, non l'orario preciso. In questo caso, in griglia, Inizio e/o Fine (quelli che non hai scritto tu) restano mostrati come **"—"** invece di un orario inventato: contano comunque ai fini del calcolo delle ore, ma non vengono spacciati per un dato reale. Cliccandoci sopra puoi impostare in qualsiasi momento l'orario vero — da quel momento in poi quella colonna mostra il valore inserito. Non ha coordinate GPS (colonna GPS vuota). Il campo Ore lavoro segue la stessa convenzione dei numeri decimali (in ore, non minuti) quando lo modifichi direttamente in griglia.

### Pianificazione (`/admin/pianificazione`)
Calendario settimanale dei turni assegnati, navigabile con "← Settimana precedente" / "Settimana successiva →". Modulo per assegnare un turno singolo: **Collaboratore**, **Cliente/cantiere**, **Data**, **Dalle**, **Alle**, **Note**. Se il cantiere ha una **capienza** massima impostata, il modulo mostra quante persone sono già assegnate quel giorno e avvisa (senza bloccare) se il limite è superato.

**Turni ricorrenti**: "+ Nuovo turno ricorrente" apre un modulo per generare automaticamente i turni di un servizio continuativo, invece di crearli uno a uno ogni settimana. Si può partire da un preventivo accettato con sede a Passaggio settimanale/mensile (menu "Da preventivo continuativo") — cliente/cantiere e "Ogni quante settimane" (1 per il settimanale, 4 per il mensile) si compilano da soli, restano da scegliere Collaboratore, giorni della settimana, orario, data inizio ed eventuale data fine. Appena creato, il sistema genera subito i turni per le prossime 6 settimane; un controllo automatico giornaliero estende poi la finestra man mano che il tempo passa, così i turni futuri restano sempre generati con anticipo. Eliminare un turno singolo dal calendario (×) non tocca il piano, che continua a generarne altri; eliminare il piano stesso rimuove solo i turni futuri non ancora svolti — quelli passati restano come storico. L'elenco "Turni ricorrenti attivi" mostra tutti i piani in corso con **Elimina**.

### Presenze (`/admin/presenze`)
Griglia mensile (**Mese**/**Anno** + **Mostra**): una riga per collaboratore, una colonna per giorno, con ore lavorate o il codice dell'assenza approvata (F, M, P, FA, ecc.). Pulsante **Esporta Excel** per il file dettagliato da dare al consulente del lavoro (stesso file scaricabile anche da Timbrature).

### Permessi (`/admin/permessi`)
Elenco di tutte le richieste di permesso/assenza inviate dai collaboratori (in attesa per prime), con azioni **Approva**, **Rifiuta**, **Riapri**, **Elimina**.

### Preventivi (`/admin/preventivi`)
- Pulsante **+ Nuovo preventivo** in cima: apre/chiude il modulo di creazione (rimane chiuso finché non serve, per non intasare la vista). Cliccando **Modifica** su un preventivo esistente il modulo si apre già compilato.
- Il modulo comprende: il Cliente (comune a tutto il preventivo) — appena selezionato, accanto compare il pulsante **"+ Aggiungi sede"**, che apre un popup (Nome sede/cantiere, Indirizzo, Capienza opzionale) per creare al volo una nuova sede per quel cliente, senza dover passare da Clienti → "+ Nuova sede/cantiere"; una volta salvata è subito selezionabile in tutti i blocchi Sede del preventivo. Poi **una o più sedi**: ogni sede ha il proprio blocco indipendente con Sede, Tipo servizio, Frequenza, Ore, Spostamento, Interventi/settimana o mese, Tariffe e — sulla stessa riga — **Totale** (calcolato in automatico da ore/tariffe/frequenza, sola lettura — è il prezzo di listino), **Sconto %** (opzionale), **Netto** (calcolato in automatico e sola lettura come Totale: coincide col Totale finché non si imposta uno Sconto %, poi diventa Totale meno lo sconto), **Adeguamento** (importo facoltativo in euro: se compilato, **sostituisce** il Netto come prezzo venduto finale di quella sede — utile per mettere mano al prezzo, es. arrotondamenti o accordi verbali; si può scrivere il numero come viene, col punto o la virgola — appena si esce dal campo si formatta da solo, es. "150.5" diventa "150,50 €"). Per i servizi non "una tantum" (passaggio settimanale/mensile), i campi per i vetri (Ore vetri/anno, Pass vetri/anno, Tariffa vetri €/h) sono nascosti dietro il pulsante **"▸ Supplementi (vetri)"**, per non intasare la vista quando non servono. Ogni sede ha anche il proprio riquadro **Note** grande e ben visibile, con una piccola barra **B / I / U** per formattare il testo (grassetto, corsivo, sottolineato: seleziona il testo e clicca il pulsante) — la formattazione applicata compare anche nella stampa/PDF. Incollare testo da altre fonti (Word, pagine web) inserisce solo il testo semplice, senza portarsi dietro stili indesiderati. Un pulsante **"Scegli frasi preimpostate"** dedicato inserisce le frasi scelte in coda alle note di quella sede soltanto. Il campo Sede propone quelle già esistenti per il cliente; in alternativa al popup di cui sopra, la voce "Altro (nuova sede)" nel menu a tendina apre due campi — Nome sede e Indirizzo — per crearne una nuova al volo solo per quel blocco. Il pulsante **"+ Aggiungi sede al preventivo"** (in fondo al blocco) aggiunge invece un altro blocco per coprire più cantieri dello stesso cliente in un unico preventivo, ciascuno con Tipo servizio, calcoli, note e frasi preimpostate indipendenti; con più sedi appare anche un Totale complessivo. In fondo al modulo: Condizioni di pagamento. Esempio per una sede: Totale 200€, Sconto 10% → Netto 180€, ma inserendo Adeguamento 150€ il prezzo venduto finale diventa 150€. Lo sconto mostrato in elenco e in stampa riflette sempre Totale→Netto di quella sede e non cambia con l'Adeguamento; il prezzo venduto mostrato ovunque (elenco, stampa, PDF, consuntivi) è l'Adeguamento se presente, altrimenti il Netto. In stampa/PDF, quando una sede ha un Adeguamento, compare una riga **"Adeguamento"** a parte sotto "Valore del servizio": così lo Sconto% resta sempre coerente col Netto sulla riga sopra (niente numeri che sembrano non tornare), e il prezzo finale concordato è comunque ben visibile per intero. Con più sedi, se almeno una ha un Adeguamento, anche il Totale complessivo ha la sua riga "Adeguamento complessivo" a parte. **Accetta/Rifiuta** riguarda il preventivo nel suo insieme, non le singole sedi.
- In cima alla pagina: tre statistiche (Preventivi in trattativa, Contratti accettati/mese — solo il canone ricorrente: una sede "Una tantum" nello stesso preventivo, es. una pulizia a fondo iniziale, non vi entra, pur restando conteggiata nella Vendita del documento e nel Valore annuo contratti — non moltiplicata per 12), poi **+ Nuovo preventivo** e **Gestisci frasi preimpostate** sulla stessa riga, poi l'elenco preventivi con colonne Cliente, N° sedi/cantieri (solo il numero, non i nomi), Tipo servizio, Cadenza (Abbreviazione della frequenza + numero, es. "PS 1"), Listino, Sconto, Netto, Vendita (l'Adeguamento se presente, altrimenti il Netto), Stato — filtro e ordinamento su ogni colonna come in Excel (vedi sotto). Con più di una sede la riga mostra sempre i **totali** e il numero di sedi diventa cliccabile (**N ▾**): espande, sotto la stessa colonna, una riga per sede con l'indirizzo (es. "Via Verdi 8 - Chieri") al posto del numero e il dettaglio (Cadenza, Listino, Sconto, Netto, Vendita) di quella sede nelle stesse colonne — utile perché anche a parità di Cadenza gli importi tra un cantiere e l'altro sono spesso diversi. Se le sedi hanno Tipo servizio o Cadenza diversi, la cella di riepilogo corrispondente mostra "Vario". Azioni per riga: **Stampa**, **Modifica**, **Accetta/Rifiuta/Riapri**, **Elimina**.
- "Gestisci frasi preimpostate →" porta alla libreria di frasi riutilizzabili nelle note dei preventivi (raggiungibile anche da Impostazioni). Nel selettore frasi di ogni sede, passando il mouse su una frase ne appare l'anteprima completa senza doverla selezionare.
- **Allegati in stampa**: nel modulo preventivo, in fondo, un elenco con una casella per ciascun allegato caricato in Impostazioni (es. Clausole contratto): quelli spuntati vengono accodati al PDF così come sono stati creati, senza alterarne la formattazione — restano pagine a parte, dopo quelle del preventivo. Un link "anteprima" per ciascuno apre il file originale in una nuova scheda. Nella pagina di stampa a schermo compare un richiamo "Allegati inclusi in stampa" con i link agli originali (non visibile in stampa/PDF, dove gli allegati sono già pagine a sé).

### Consuntivi (`/admin/consuntivi`)
Confronta, per **Mese**/**Anno** scelti, quanto contrattualizzato (dai preventivi accettati) con quanto effettivamente lavorato (dalle timbrature): ore lavorate, ore spostamento, importo a consuntivo e scostamento in euro/percentuale (rosso se in perdita, verde se in surplus), per ogni cantiere — un preventivo con più sedi produce una riga indipendente per ciascuna. Totali generali in cima; filtro e ordinamento su ogni colonna come in Excel.

### Clienti (`/admin/clienti`)
- Pulsanti **+ Nuovo cliente** e **+ Nuova sede/cantiere** in cima: aprono/chiudono i rispettivi moduli (restano chiusi finché non servono).
- L'elenco clienti è una tabella con colonne Codice, Tipo (Azienda/Privato/Ente/Associazione), Denominazione, Città, Telefono, Email, e i link **Modifica**/**Elimina**. Cliccando **Sedi (N) ▾** si espande la riga con l'indirizzo completo di ogni sede, la capienza modificabile e le azioni **Modifica**/**Elimina** per ciascuna.
- **Filtro e ordinamento come in Excel**: cliccando il nome di una colonna la si ordina subito (crescente/decrescente); l'icona a imbuto accanto apre invece un piccolo campo di ricerca per quella colonna, che filtra le righe in tempo reale mentre si scrive (ogni carattere in più restringe subito il risultato). Un pallino sull'icona indica che un filtro è attivo su quella colonna. Funziona così su tutte le tabelle di Anagrafiche, Preventivi e Consuntivi. Nelle Anagrafiche (Clienti, Fornitori, Collaboratori) la tabella si apre di default ordinata per Codice decrescente. Per i Clienti Persona fisica la colonna Denominazione mostra ed ordina sempre "Cognome Nome" (es. "VOLPE ALESSIA"), anche per i record più vecchi salvati in origine con l'ordine inverso; per i Collaboratori vale lo stesso comportamento.
- **Elimina cliente**: possibile solo se il cliente non ha più sedi/cantieri collegati (vanno eliminati prima, uno per uno, con lo stesso vincolo: un cantiere non si può eliminare se ha preventivi, turni o timbrature collegati).
- **Aggiungi cliente**: si sceglie il tipo tra **Azienda**, **Persona fisica**, **Ente** e **Associazione**; il campo proposto cambia di conseguenza: **P. IVA** solo per Azienda (con verifica automatica su VIES che compila da sola Ragione sociale/Indirizzo/CAP/Città/Provincia — nota: VIES copre solo le posizioni registrate per operazioni intracomunitarie, quindi può non trovare ditte individuali o associazioni che lavorano solo in Italia) oppure **Codice fiscale** per Persona fisica, Ente e Associazione. Seguono Ragione sociale/Denominazione (o Cognome+Nome per la Persona fisica, in quest'ordine), Indirizzo, CAP, Persona di riferimento, Telefono, Email, Note. Se la P. IVA o il codice fiscale coincidono con un cliente già esistente, il sistema blocca il salvataggio e segnala di chi si tratta (probabile doppione).
- Automatismi sul CAP: se scrivi l'**Indirizzo** e lasci il CAP vuoto, il sistema prova a trovarlo da solo (in base all'indirizzo); se invece scrivi direttamente il **CAP**, compila da sola Città e Provincia. In entrambi i campi un popup al passaggio del mouse ricorda questi automatismi. Tutto ciò che il sistema compila da solo (da CAP o da P. IVA) viene scritto in STAMPATELLO MAIUSCOLO; quello che scrivi tu a mano resta come lo digiti.
- **Aggiungi sede/cantiere**: Cliente, Nome sede, Indirizzo, Capienza (posti) facoltativa.
- Modifica cliente e modifica cantiere hanno pagine dedicate con gli stessi campi. La Capienza di un cantiere si può modificare anche direttamente dall'elenco.
- Dalla pagina **Modifica cliente** si vedono anche tutte le sue sedi/cantieri esistenti e si può aggiungerne una nuova direttamente lì (senza dover tornare all'elenco Clienti e riselezionare il cliente dal menu a tendina di "+ Nuova sede/cantiere").

### Fornitori (`/admin/fornitori`)
Anagrafica semplice: **+ Nuovo fornitore** con Nome/Ragione sociale, P. IVA, Codice fiscale, Indirizzo, Città, Telefono, Email, Note. Elenco in tabella con colonne Codice, Denominazione, Città, Telefono, Email (filtro/ordinamento come in Excel su ogni colonna, vedi sopra), e i link **Modifica**/**Elimina**. Stesso controllo doppioni di Clienti: P. IVA o codice fiscale già in uso su un altro fornitore bloccano il salvataggio.

### Collaboratori — anagrafica (`/admin/collaboratori`)
Scheda anagrafica dei collaboratori (dati personali: Cognome, Nome, Codice fiscale, Indirizzo, Città, Telefono, Email, Note — Cognome prima del Nome, sia nel modulo che nell'elenco), distinta dall'account di accesso al programma (quello si gestisce da Utenti). Stesso stile di Fornitori: tabella con Codice, Denominazione, Città, Telefono, Email, filtro/ordinamento come in Excel, controllo doppioni sul codice fiscale.

Le righe degli elenchi di Clienti, Fornitori e Collaboratori sono compatte (una riga di testo ciascuna) per vederne di più senza scorrere.

### Statistiche (`/admin/statistiche`)
Solo lettura, quattro tabelle: andamento preventivi ultimi 6 mesi (creati/accettati/conversione/sconto medio/valore), marginalità cantieri del mese corrente, ore lavorate per collaboratore del mese corrente, qualità anagrafica (quanti clienti/cantieri hanno dati completi o sono georeferenziati).

### Utenti (`/admin/utenti`, solo titolare)
Raggiungibile da **Gestione utenti** nel menu utente in alto a destra (non più dal menu laterale).
- Elenco utenti (Nome, Cognome, Telefono, Email, Ruolo, Stato).
- **Aggiungi utente** / **Modifica utente**: Nome, Cognome, Telefono, Email, Password (o "Nuova password" in modifica, vuoto per non cambiarla), Ruolo (Collaboratore o Amministratore).
- Per i Collaboratori, sezione **Pagine accessibili** con un interruttore per ogni pagina, raggruppate come nel menu (Anagrafiche / Gestione / Produzione / Utilità). Utenti e Impostazioni non sono mai assegnabili. Pulsante **Salva permessi**.

### Impostazioni (`/admin/impostazioni`, solo titolare)
- **Frequenza**: per ciascuna delle tre frequenze (una tantum/passaggio settimanale/passaggio mensile), un'**Abbreviazione** (mostrata nella colonna Cadenza dell'elenco Preventivi insieme al numero inserito — es. "PS 1"; se non impostata si usa l'Etichetta per intero) e un'**Etichetta** (il nome usato nei preventivi — cambia solo il nome mostrato, non i calcoli). Per ciascuna, l'interruttore **"Mostra cadenza/riepilogo in stampa"** decide cosa compare nel PDF al posto della semplice etichetta: acceso mostra il dettaglio (es. "Cadenza: n° 2 passaggi settimanali così distribuiti", oppure per una tantum "Intervento una tantum di pulizia (1 intervento)."), spento mostra solo l'etichetta — mai entrambi insieme, e senza mai citare ore o spostamento. Di default acceso per i passaggi settimanali/mensili, spento per una tantum.
- **Tipo servizio**: elenco personalizzabile delle voci che aprono la descrizione nei preventivi (es. "PRESTAZIONE ORDINARIA DI PULIZIA UFFICI"), ciascuna con un'**Abbreviazione** (mostrata nella colonna "Tipo servizio" dell'elenco Preventivi al posto del testo completo; se non impostata resta il testo per intero). Si aggiungono da "Nuova voce" + Aggiungi; modificarle o eliminarle non cambia i preventivi già creati.
- **Visualizzazione** (schede in alto: Frequenza / Tipo servizio / Visualizzazione / Banca / Allegati / Frasi preimpostate — si vede una scheda alla volta) → **Home**: un interruttore per ciascuna sezione della home (Al lavoro adesso, Preventivi in trattativa, Turni di oggi, Permessi in attesa, Totale preventivi accettati, Totale consuntivi) — decide cosa vedono tutti, titolare compreso. Per le card che hanno un riepilogo a colori (Al lavoro adesso, Preventivi in trattativa, Totale consuntivi), un secondo interruttore annidato decide se mostrarlo o lasciare solo il numero.
- **Banca**: Nome banca, IBAN, Intestatario conto, SWIFT/BIC — questi dati compaiono come "Banca d'appoggio" nel PDF dei preventivi stampati. Finché non li compili, quel riquadro resta vuoto nel PDF.
- **Allegati**: libreria di documenti riutilizzabili (nome + file PDF, PNG o JPG) da poter aggiungere ai preventivi in stampa — es. clausole contrattuali, condizioni generali, planimetrie. Si caricano una volta sola e restano disponibili per tutti i preventivi; un allegato collegato ad almeno un preventivo non si può eliminare (bisogna prima toglierlo dai preventivi che lo usano). Il pulsante "Anteprima" apre il file originale.
- **Frasi preimpostate**: stessa gestione raggiungibile anche da Preventivi → "Gestisci frasi preimpostate" (è la stessa identica lista, comoda da entrambi i posti). Ogni frase ha un codice assegnato automaticamente; il contenuto si vede aprendo "Contenuto ▾" sulla riga.

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
