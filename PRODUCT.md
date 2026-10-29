# Product

<!-- impeccable:product-schema 1 -->

Il prodotto, non il suo aspetto. L'aspetto sta in [`docs/DESIGN.md`](docs/DESIGN.md), il percorso didattico in [`docs/PERCORSO.md`](docs/PERCORSO.md).

## Platform

web

## Users

Un principiante assoluto con la chitarra acustica: non conosce gli accordi né i nomi delle note sulla tastiera, vuole accompagnare brani country e folk con la pennata e il boom-chick. Suona in casa, con lo strumento in mano, su una sessione da 10, 20 o 30 minuti al giorno. I mancini sono parte del pubblico, non un caso limite: i diagrammi si specchiano.

È un prodotto pubblico, usato da principianti che non conosciamo. Quindi la presentazione su `/` deve convincere chi arriva senza sapere niente, `/terms` è un documento che conta davvero, e community e moderazione vanno tenute solide.

Secondo pubblico, già nel codice: chi pubblica un proprio giro di accordi e riceve messaggi dagli altri.

## Product Purpose

Insegnare le note e gli accordi uno alla volta, suonati sopra un accompagnamento, con il microfono che giudica se suonano puliti e dice quale corda sistemare. Il successo non è completare il percorso: è che il principiante continui.

È il motivo per cui l'app esiste. Secondo Fender il 90% di chi compra la prima chitarra smette entro il primo anno ([MusicRadar, 2019](https://www.musicradar.com/news/90-of-beginner-guitar-players-give-up-within-a-year-says-fender)), quasi mai per mancanza di talento, quasi sempre per uno dei problemi tipici lasciato senza risposta.

## Positioning

Niente si dichiara. Ogni compito lo segna il microfono o un risultato salvato, e non esiste un bottone per dirsi che un accordo è imparato. La prova al microfono nel questionario iniziale fa partire il percorso da dove il giocatore è davvero, non da dove dice di essere: chi afferma di conoscere le corde a vuoto deve indovinarle tutte e sei chiamate per nome, in ordine sempre diverso.

Riferimenti studiati, non da imitare: JustinGuitar, Fender Play, Yousician, Chitarra Facile.

## Operating Context

- **La sessione del giorno** si costruisce sui minuti disponibili. L'accordatura è sempre il primo passo fisso.
- **Chitarra in mano, microfono acceso.** Le cuffie servono solo con la chitarra guida accesa in *A tempo*, altrimenti il microfono sente lei invece del giocatore.
- **Il microfono vuole un'origine sicura**: `localhost`, `127.0.0.1` o https. Un indirizzo in chiaro non lo ottiene mai, e questo vincola come si prova l'app e come si distribuisce.
- **Guide da stampare** (le basi, la lezione in corso, la settimana), da stampare o salvare in PDF.
- **Dispositivi**: desktop e portatile sono il bersaglio di oggi. Telefono e tablet sono un obiettivo dichiarato, non ancora servito: il lavoro futuro non deve chiudere quella porta, ma oggi nessuna schermata è disegnata per uno schermo piccolo.
- **Lingue**: italiano e inglese si spediscono entrambe, con la stessa cura. Le schermate devono reggere testi di lunghezza diversa nelle due lingue.

## Capabilities and Constraints

- **Serve un account**, e serve solo a portare i progressi su ogni dispositivo. L'app è gratuita. Email e password, oppure Google e Apple quando configurati; Apple rifiuta `localhost` e vuole un dominio https.
- **Mai testo o melodia di un'opera protetta.** Delle canzoni note sta nel catalogo solo il giro di accordi. Il resto sono tradizionali di pubblico dominio.
- **L'insegnante** è un modello Claude che vede solo i risultati del giocatore nell'app, 20 domande al giorno. Senza chiave API è spento, e le schermate lo dicono invece di fingere.
- **La community**: un brano pubblicato resta una bozza finché l'autore non lo supera *A tempo*; i punti si leggono dai risultati, 10 per brano pubblicato e 5 per ogni giocatore che lo supera; nei messaggi non passano contatti né link, segnalazione e blocco stanno a un clic, e chi viene segnalato da tre persone non scrive più.
- **Una registrazione a settimana**, da riascoltare nei Progressi.
- **Le regole stanno in `src/lib`**, mai in una server action o in un componente. `src/lib/music` e `src/lib/audio/detect.ts` sono puri e devono restarlo: sono la parte più testata.
- **Ciò che arriva dal browser si valida contro il catalogo**, mai creduto.
- Impianto: Next.js 15 App Router, Postgres con Drizzle, better-auth, rilascio su Fly.io con le migrazioni come `release_command`.

## Brand Commitments

- Il nome è **Guitar.Coach**.
- **Codice in inglese, interfaccia in italiano e inglese.** Ogni testo visibile sta in `src/messages`, mai in linea nel JSX; `en.ts` è tipato `typeof it`, quindi una chiave mancante non compila.
- **Niente trattino lungo nei testi italiani**, verificato da un test.
- La voce dei testi esistenti è l'autorità: seconda persona, diretta, dice cosa fare e perché, senza entusiasmo di facciata. Chi scrive testi nuovi la rilegge, non la reinventa.

## Evidence on Hand

- [`docs/PROBLEMI.md`](docs/PROBLEMI.md): i problemi tipici di chi inizia, con le fonti, e gli stessi testi che l'app mostra su `/help`.
- La statistica Fender sopra, con la fonte.
- [`docs/ANALISI.md`](docs/ANALISI.md): cosa deve avere l'app, cosa c'è, cosa viene dopo, con la fonte sulla routine di JustinGuitar.
- [`docs/PERCORSO.md`](docs/PERCORSO.md): l'ordine delle lezioni e quando un compito conta come fatto.
- `public/figures/*.svg`: le quattro illustrazioni delle basi, generate con Recraft da `scripts/figures.json`.
- Il catalogo brani, e i giri pubblicati dai giocatori.

Non esistono, e non si inventano: testimonianze, numeri di utenti, rassegna stampa, prezzi o piani. L'app è gratuita e non c'è niente da citare su quante persone la usino.

## Product Principles

1. **Niente si dichiara.** Lo prova il microfono o un risultato salvato, altrimenti non è fatto.
2. **Un solo prossimo passo alla volta**, sempre visibile, mai una lista di cose da fare.
3. **Il percorso parte da dove il giocatore è davvero**, misurato, non dichiarato.
4. **Si continua per costanza, non per scorciatoie**: sessioni brevi e quotidiane, i giorni di fila contano.
5. **Mai il testo o la melodia di un'opera protetta**, per nessun motivo.

## Accessibility & Inclusion

- **Mancini**: ogni diagramma si specchia.
- **Grafici**: una serie per grafico, il titolo dice cosa misura e se più alto o più basso è meglio, niente legende né colori da distinguere, tooltip al passaggio e tabella dei valori sotto per chi non vede il grafico.
- Nessuno standard formale è stato stabilito. Resta da decidere, e intanto non si dà per raggiunto.
