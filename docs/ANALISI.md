# Cosa deve avere l'app e come aiuta un principiante

Punto di partenza: un principiante assoluto con la chitarra acustica, che vuole migliorare con la costanza, senza scorciatoie. Riferimenti: JustinGuitar, Fender Play, Yousician, Chitarra Facile.

JustinGuitar, per esempio, chiude ogni modulo con una routine fatta di brani già noti come riscaldamento, pochi minuti per ogni tecnica del modulo (tra cui i *one minute changes*) e una decina di minuti sui brani nuovi ([fonte](https://community.justinguitar.com/t/what-is-the-overall-practice-routine-suppose-to-be/207530)). La routine qui sotto segue la stessa idea.

Ogni sezione dice cosa c'è già nell'app e cosa manca. L'ordine in cui farlo è in fondo.

## 1. Le basi che si danno per scontate

- **Postura**: come si tiene la chitarra da seduti, dove appoggia il braccio, la chitarra dritta e non inclinata verso di sé.
- **Mano sinistra**: pollice dietro il manico, dita arcuate, polpastrello vicino al tasto e non sopra.
- **Mano destra e plettro**: come si impugna, quanto deve sporgere, polso morbido, pennata dal polso e non dal braccio.
- **Polpastrelli doloranti**: è normale nelle prime settimane. Sessioni brevi e frequenti, meglio 15 minuti al giorno che 2 ore la domenica.
- **Accordare sempre** prima di suonare: primo passo fisso di ogni sessione.
- **Corde e chitarra**: quando cambiare le corde, come capire se l'action è troppo alta.
- **Ritmo separato dagli accordi**: prima la pennata a vuoto col metronomo contando ad alta voce, poi con gli accordi.
- **Mancini**: chitarra per mancini o destrorsa, con diagrammi specchiati di conseguenza.

C'è già: accordatore, diagrammi da mancino, consigli su pressione, polpastrelli e polso nella pagina di ogni accordo, nota sui polpastrelli nel riepilogo del questionario.
Manca: la lezione su postura e mani, il controllo prima della sessione, la pennata a vuoto col metronomo come esercizio a sé.

**Fatto in parte**: la pagina Aiuto (`/help`, ricerca in `docs/PROBLEMI.md`) spiega i problemi tipici: corde che ronzano o mute, dita e polso, cambi lenti, mano destra, tempo, regolazione della chitarra, come esercitarsi. La fascia del microfono porta alla spiegazione giusta.

## 2. Questionario iniziale e livello

Al primo avvio, poche domande per costruire il percorso:

- Hai mai suonato? Mai, qualche mese, più di un anno.
- Sai il nome delle corde a vuoto?
- Quali accordi conosci? Scelta tra i diagrammi.
- Sai leggere le tablature?
- Con che mano fai la pennata? Che chitarra hai: acustica, classica, elettrica?
- Quanto tempo hai al giorno: 10, 20, 30 minuti.
- Cosa vuoi suonare: accompagnare canzoni, folk e country, fingerstyle.
- Perché: per piacere, per suonare con altri, per una canzone precisa.

Poi una **prova al microfono**: ogni accordo dichiarato si suona una volta. Le risposte si confrontano con quello che il microfono sente.

Da qui l'app sceglie la lezione di partenza, saltando quelle già padroneggiate, la durata della routine e i brani. Il livello si **ricalibra** ogni due settimane sui risultati reali, e la persona può sempre rifare il questionario.

**Fatto** (`/start`, `lib/music/profile.ts`):
- un accordo dichiarato conta come imparato solo se il microfono lo sente pulito; chi salta la prova non salta niente;
- "so le corde a vuoto" va dimostrato: l'app chiede una corda per nome alla volta, in ordine casuale, e solo se il microfono sente quella giusta tutte e sei le volte si salta la lezione 0;
- chi sa le corde a vuoto salta la lezione 0;
- chi ha già suonato e ha tutti gli accordi di una lezione ne salta anche gli esercizi; un principiante assoluto li fa sempre;
- dopo 14 giorni il percorso propone di rispondere di nuovo;
- risposte salvate nell'account (`player_profile`).

Da fare: usare tempo, stile e obiettivo per la routine e per l'ordine dei brani; ricalibrazione automatica sui risultati, non solo su invito.

## 3. La routine giornaliera

Generata dall'app sul tempo disponibile, per esempio 20 minuti:

1. Accordatura, 1 minuto.
2. Riscaldamento delle dita, ragno ed esercizi cromatici, 3 minuti.
3. Orecchio musicale, 3 minuti.
4. Accordo o tecnica nuova, 5 minuti.
5. Cambi deboli, con il test dei cambi al minuto, 4 minuti.
6. Un brano, 4 minuti.

Con 10 minuti si tengono accordatura, accordo nuovo e cambi; con 30 si allungano cambi e brano e si aggiunge il ripasso.

**Fatto** (`/today`, `lib/music/routine.ts`):
- blocchi e minuti dal tempo dichiarato nel questionario (20 se non c'è): accordatura, riscaldamento (il ragno, con timer), prossimo passo del percorso, cambio da ripassare, brano del giorno;
- il cambio da ripassare è una coppia di accordi già imparati che i brani usano davvero: prima quelle mai provate (l'accordo più recente, il cambio più frequente), poi quella con meno cambi puliti al minuto;
- il brano del giorno ruota ogni giorno tra quelli che si sanno già suonare, prima quelli dello stile scelto, nel modo che serve (*Passo passo* o *A tempo*);
- un blocco senza niente da fare passa i suoi minuti agli altri, il totale resta quello dichiarato;
- niente si spunta a mano: le attività del percorso le segna il server dai risultati che salva (accordo imparato, esercizio completato senza saltare, test dei cambi, brano finito, giro dell'orecchio); l'accordatura quando l'accordatore sente le sei corde intonate; il riscaldamento quando il microfono ha sentito almeno 17 delle 23 note del ragno durante il timer;
- giorni di fila, che non si interrompono finché il giorno non è finito;
- il test dei cambi ora si salva nell'account (`change_tests`), i giorni in `routine_log`.

Con 20 e 30 minuti c'è anche un blocco di 3 minuti per l'orecchio.

## 4. Migliorare con la costanza

- **Ripasso mirato**: l'app ricorda quali accordi e quali cambi vengono peggio e li ripropone più spesso.
- **Misure nel tempo**: cambi al minuto per coppia di accordi, precisione in *A tempo*, bpm massimo pulito. Grafico settimanale. La tabella `practice_runs` tiene già ogni prova.
- **Tempo che sale piano**: si aumenta il bpm solo quando il precedente è pulito. C'è già: dopo un *A tempo* superato il prossimo modo è *Più veloce*.
- **Registrarsi**: una registrazione a settimana dello stesso brano, da riascoltare e confrontare.
- **Serie di giorni** e obiettivi settimanali realistici, senza punizioni se si salta un giorno.
- **Brani presto**, anche semplificati, per la motivazione. C'è già: dalla lezione 2.

## 5. Orecchio musicale

Esercizi brevi, a livelli, ognuno sbloccato dal precedente:

1. **Alto o basso**: due note, quale è più acuta.
2. **Corde a vuoto**: riconoscere Mi La Re Sol Si Mi a orecchio, utile per accordare senza accordatore.
3. **Uguale o diverso**: due note o due accordi, sono uguali?
4. **Maggiore o minore**: allegro o triste, prima E contro Em, poi gli altri.
5. **Accordi conosciuti**: l'app ne suona uno tra quelli imparati, lo si indovina.
6. **Cambio nel brano**: si ascolta un giro e si indica quando cambia l'accordo.
7. **Cantare la nota**: il microfono dice se si è intonati.
8. **Intervalli** semplici, più avanti.

Punteggi per esercizio, nel grafico dei progressi.

**Fatto** (`/ear`, `lib/music/ear.ts`), livelli 1-5:
- giri di dieci domande suonati dal sintetizzatore, generati da un seme (stesso seme, stesso giro: si possono provare);
- livello 1 da un'ottava a mezzo tono dentro lo stesso giro; livello 2 sempre col Mi grave come riferimento, perché riconoscere una nota senza riferimento è orecchio assoluto, non un esercizio da principianti; livello 3 prima note poi accordi gemelli (E ed Em); livello 4 maggiore o minore sulle tre coppie E/Em, A/Am, D/Dm; livello 5 tra gli accordi imparati, al massimo quattro scelte;
- 8 su 10 apre il livello dopo; il risultato si salva come le altre prove (`ear-1`... `ear-5`).

Da fare: livelli 6-8 (cambio nel brano, cantare la nota con il microfono, intervalli).

**Limite noto**: i risultati li misura il browser, dove sta il microfono. Il server rifiuta ciò che è impossibile (livelli non aperti, accordi sentiti ma non dichiarati, date lontane da oggi, coppie e brani fuori catalogo) ma non può riascoltare: chi chiama le azioni a mano con valori inventati può falsare i propri progressi. Per un'app gratuita e personale è accettabile; se un giorno ci saranno classifiche o punti scambiabili, servirà una verifica sul server (per esempio l'audio di una prova campione).

## 6. Teoria minima, quando serve

Note sulla tastiera (c'è: lezione 0), cosa sono tasto e semitono (c'è), cosa rende un accordo maggiore o minore, il capotasto e come cambia la tonalità, la lettura delle tablature e dei simboli ritmici. Sempre collegata a quello che si sta suonando.

## 7. Tecniche dopo i primi accordi

Ritmi di pennata in giù e in su (in parte: `folk`), boom-chick (c'è), accenti, palm mute, arpeggi semplici, primo fingerpicking, capotasto, power chord, primo barré con F semplificato.

## 8. Account e presentazione

L'app è gratuita, ma si usa solo con un account: serve a tenere traccia dei progressi, non a far pagare.

**Fatto**: presentazione pubblica su `/` (perché esiste, come funziona, cosa c'è, i brani liberi con accordi, ritmo e lezione da cui si suonano, gratis), tutto il resto dietro accesso, registrazione che porta al questionario, accesso con Google e Apple attivato dalle credenziali.

Brani di pubblico dominio nel catalogo: 18 tradizionali (canti, spiritual, inni, Stephen Foster, canti marinareschi) più 4 giri di accordi di canzoni protette. Per un tradizionale sono liberi testo e melodia; restano protetti i singoli arrangiamenti e le registrazioni, per questo l'app genera da sé accompagnamento e diagrammi ([fonte](https://legalclarity.org/is-when-the-saints-go-marching-in-in-the-public-domain/)).

## 9. Community: brani pubblicati dagli utenti

L'idea: chi ha imparato un brano lo pubblica per gli altri, con una procedura guidata, e ci si aiuta a vicenda.

**Procedura guidata**, una domanda per schermata come il questionario:

1. Titolo e provenienza: tradizionale (pubblico dominio) o canzone protetta. Per una canzone protetta si pubblica **solo il giro di accordi**, mai testo o melodia, come nel catalogo.
2. Tempo (3 o 4) e ritmo, scelti tra quelli che l'app sa suonare.
3. Le sezioni, battuta per battuta, scegliendo tra gli accordi che l'app conosce. L'anteprima suona subito con basso e batteria.
4. Il controllo: l'autore lo suona una volta *A tempo* e deve passare. Così ogni brano pubblicato è suonabile davvero.
5. Pubblicazione: il brano entra nella lezione giusta da solo, perché si sa quali accordi usa.

**Aiutarsi**: segnare "l'ho suonato", proporre una correzione a un accordo (l'autore accetta o no), domande sotto il brano, segnalare un brano.

**Obblighi** (Digital Services Act, valgono anche per piattaforme piccole che ospitano contenuti degli utenti): un modo per chiunque di segnalare contenuti illeciti, termini d'uso pubblici con le regole di moderazione, un punto di contatto, una motivazione a chi si vede rimuovere un brano e un modo interno per contestarla ([fonte](https://ntplusdiritto.ilsole24ore.com/art/digital-services-act-obblighi-carico-servizi-meno-45-milioni-destinatari-attivi-AEDvlV5C)). Da far verificare a un legale prima di aprire la pubblicazione.

Dati: `community_song` (autore, stato: bozza, pubblicato, nascosto; stessa forma di `Song`, validata col catalogo degli accordi), `community_play`, `community_fix`, `community_report`.

## 10. Punti per chi aiuta

Punti per quello che serve agli altri, non per il volume:

- brano pubblicato e superato *A tempo* dall'autore;
- altri che lo suonano e lo superano (il punto va all'autore, una volta per persona);
- correzione accettata dall'autore del brano;
- risposta segnata come utile.

Niente punti per la sola quantità di brani o di commenti: spingerebbero a pubblicare doppioni. I punti si vedono nel profilo pubblico con dei livelli (per esempio *Primo brano*, *Ha aiutato 10 persone*), senza classifiche globali all'inizio. Una segnalazione accolta toglie i punti di quel brano.

## 11. Assistente AI

Con l'API di Claude, solo lato server, solo dove aggiunge qualcosa che le regole fisse non danno. Il riconoscimento degli accordi resta deterministico e provato: l'AI non giudica le pennate.

| Dove | Cosa fa | Perché AI |
|---|---|---|
| Chiedi all'insegnante | domande libere ("perché il Si mi ronza?", "come tengo il plettro?") con il contesto del profilo e degli ultimi risultati | le domande di un principiante non stanno in un elenco |
| Riepilogo della settimana | due righe su cosa è migliorato e cosa ripassare, dai numeri veri di `practice_runs` | i numeri da soli non dicono cosa fare |
| Procedura guidata dei brani | da una sequenza di accordi incollata, la struttura in battute e sezioni; scarta qualunque testo | lavoro noioso e soggetto a errori |
| Moderazione | controllo prima della pubblicazione: niente testo di canzoni, titoli offensivi, accordi incoerenti | primo filtro, poi la segnalazione umana |

Modello: Claude Haiku 5.5 (`claude-haiku-5-5`), 0,10 $ per milione di token in ingresso e 0,50 $ in uscita ([fonte](https://www.llmreference.com/provider/anthropic-api/claude-haiku-5-5)): una risposta dell'insegnante costa una frazione di centesimo. Limite di domande al giorno per account, chiave `ANTHROPIC_API_KEY` solo sul server, risposte in italiano con le stesse regole di tono dei testi dell'app.

## 12. Guide da scaricare in PDF

Per chi non ha mai preso in mano una chitarra, guide brevi da stampare e tenere sul leggio, scelte in base al percorso di ognuno:

- **Prima di iniziare**: le parti della chitarra, come si tiene da seduti, mano sinistra e mano destra, il plettro, come si legge un diagramma.
- **Accordare**: le corde a vuoto, l'accordatore, quando cambiare le corde.
- **La scheda della lezione**: i diagrammi degli accordi della lezione in corso, i consigli sul cambio, il ritmo e i brani che si sbloccano.
- **Il foglio della settimana**: la routine dei prossimi sette giorni, da tenere sul leggio (l'app segna da sola cosa è fatto).

Generate dall'app con i dati dell'account (lezione, accordi, routine), non file fissi: la scheda di chi è alla lezione 2 non è quella di chi è alla 4. Le prime due sono uguali per tutti, con la mano specchiata per i mancini.

## 13. Ordine di sviluppo

| # | Cosa | Stato |
|---|---|---|
| 1 | Questionario e test di livello | fatto |
| 2 | Account obbligatorio, presentazione, accesso con Google e Apple | fatto |
| 3 | Routine giornaliera, giorni di fila, test dei cambi nell'account | fatto |
| 4 | Orecchio musicale, livelli 1-5; niente più spunte a mano, tutto verificato | fatto |
| 5 | Ripasso mirato e grafico dei progressi | da fare |
| 6 | Assistente AI: insegnante e riepilogo settimanale | da fare |
| 7 | Lezione su postura e mani, e guide in PDF | da fare |
| 8 | Community: procedura guidata, segnalazioni, termini | da fare |
| 9 | Punti per chi aiuta | da fare, dopo la community |
| 10 | Registrazione settimanale | da fare |
| 11 | Tecniche e teoria | da fare |
