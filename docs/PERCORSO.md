# Il percorso didattico

Cosa insegna l'app, in che ordine, e quando una cosa si considera fatta. Il codice sta in `src/lib/music`; qui c'è il perché.

## 1. Chi c'è dall'altra parte

Un principiante con la chitarra acustica: non conosce ancora gli accordi né le note sulla tastiera, vuole accompagnare brani country e folk con la pennata e il boom-chick. Ogni accordo si mostra sempre con il suo diagramma, le dita numerate e le corde a vuoto o mute.

## 2. Le lezioni

| # | Lezione | Accordi nuovi | Esercizio | Perché in quest'ordine |
|---|---|---|---|---|
| 0 | Em e Am | Em, Am | `drill-em-am` | due dita, stessa forma spostata di una corda: un suono al primo giorno |
| 1 | G e D | G, D | `drill-g-d` | l'anulare si sposta di una sola corda; sblocca i primi quattro brani |
| 2 | Le note sulla tastiera | nessuno | trova le note (`notes`) | i nomi Mi La Re Sol Si Mi quando le mani sanno già fare quattro accordi |
| 3 | C e i giri country | C | `drill-g-c-d` | da Am a C indice e medio restano fermi |
| 4 | Dm | Dm | `drill-dm-c` | stessa zona di D |
| 5 | E e A | E, A | `drill-e-a` | E è la forma di Am spostata verso il basso |

Prima un suono, poi la teoria: chi inizia vuole sentire un accordo il primo giorno, e i nomi delle note si ricordano meglio quando ci sono già accordi a cui attaccarli.

Ogni nuovo accordo condivide qualcosa con uno già imparato. Un test in `music.test.ts` pretende che nessun brano di una lezione usi accordi non ancora insegnati.

## 3. Il questionario

Al primo avvio il percorso propone `/start`: nove domande (esperienza, corde a vuoto, accordi conosciuti, tablature, mano, chitarra, tempo al giorno, stile, obiettivo) e una prova al microfono sugli accordi dichiarati. Le risposte stanno in `Progress.profile`.

- Un accordo dichiarato diventa imparato solo se il microfono lo sente pulito (`placedChords`). Chi salta la prova non salta niente.
- Chi dice di sapere le corde a vuoto deve suonare quella che l'app chiede per nome, una alla volta, in un ordine sempre diverso (`stringOrder`): solo se le indovina tutte e sei (`openStringsHeard`) salta la lezione delle note. Pizzicarle tutte senza sapere quale è quale non basta.
- Le risposte date prima di questa prova restano dove avevano messo il giocatore: chi aveva detto di sapere le corde non torna alla lezione delle note.
- Chi ha già suonato (non *Mai*) e ha tutti gli accordi di una lezione ne salta anche gli esercizi *Passo passo* e *A tempo* (`skipsDrillsFor`). Un principiante assoluto li fa sempre: i cambi si costruiscono lì.
- Dopo 14 giorni il percorso propone di rispondere di nuovo (`needsRecheck`).

Il tempo al giorno decide la routine, lo stile quali brani arrivano prima.

## 3 bis. La pratica di oggi

`/today` è la pagina di ogni giorno: dopo l'accesso si arriva lì. La costruisce `dailyRoutine` in `routine.ts`.

| Minuti | Accordatura | Riscaldamento | Prossimo passo | Cambi | Brano |
|---|---|---|---|---|---|
| 10 | 1 | 0 | 5 | 4 | 0 |
| 20 | 1 | 2 | 5 | 4 | 5 |
| 30 | 1 | 4 | 9 | 5 | 8 |

Con 20 e 30 minuti, 3 minuti di orecchio dopo il riscaldamento, al primo livello non ancora superato.

- **Prossimo passo**: lo stesso compito del percorso (`nextTask`).
- **Cambi**: una coppia di accordi imparati che i brani usano davvero (`practisedPairs`). Prima le coppie mai provate, poi quella col record più basso nel test dei cambi (`weakPair`).
- **Brano**: uno al giorno tra quelli con tutti gli accordi imparati, prima i ritmi dello stile scelto (`songOfTheDay`).
- Un blocco senza niente da fare passa i minuti agli altri.
- Niente si spunta a mano. Le attività del percorso le segna il server quando salva il risultato che le dimostra (`recordPractice` in `lib/progress/practice.ts`, con `blocksDoneBy`), calcolando la routine com'era prima di quel risultato.
- Accordatura e riscaldamento li verifica il microfono nel browser (`lib/music/checks.ts`): le sei corde ognuna intonata entro 5 cent per 5 letture di fila; almeno 17 delle 23 note del ragno durante il timer (fuori la nota che è anche una corda a vuoto, il Si: uno strum non deve contare).
- Il blocco dell'orecchio conta solo con almeno 6 su 10, meglio del tirare a indovinare; un livello non ancora aperto viene rifiutato dal server. Il browser manda solo la prova (`reportProof`), il server segna il blocco se oggi c'è.
- L'esercizio delle note conta solo senza note saltate; *Passo passo* solo senza cambi saltati.
- I giorni di fila (`streak`) contano fino a ieri finché oggi non è finito.

## 4. I compiti di una lezione

Sempre questi, in quest'ordine, perché ognuno prepara il successivo:

1. **Impara** ogni accordo nuovo: tre pennate pulite sentite dal microfono. Senza microfono non si impara: non c'è un bottone per dichiararlo.
2. **Passo passo** sull'esercizio: il brano aspetta l'accordo giusto. Fatto alla prima prova completa.
3. **A tempo** sull'esercizio: fatto quando almeno il 70% delle battute ha l'accordo giusto (`PASS_SCORE`).

La lezione delle note (la 2) ha un compito solo: completare l'esercizio delle note.

In alto nel percorso c'è sempre un solo prossimo passo, il primo compito non fatto (`nextTask`). Un compito è fatto quando lo hai fatto tu, o quando il questionario ti ha messo oltre (`isDone`).

## 5. I tre modi di suonare un brano

| Modo | Cosa fa | Cosa si salva |
|---|---|---|
| Ascolta | chitarra guida, basso e batteria, gli accordi scorrono | niente |
| Passo passo | aspetta l'accordo giusto, poi va avanti; barra spaziatrice per saltare | media in ms per cambio, il record è la più bassa |
| A tempo | basso, batteria e clic; ogni battuta si giudica | quota di battute giuste, il record è la più alta |

Dopo *Passo passo* l'app dice se sei pronto per *A tempo*: lo sei quando il cambio medio sta dentro una battuta al tempo scelto (a 100 bpm in 4/4, 2,4 s).

Dopo un *A tempo* superato, il prossimo modo di quel brano diventa *Più veloce*: 5 bpm in più.

## 5 bis. Una parte alla volta

Nella *Struttura* si tocca una battuta, o il nome di una parte, per provare solo quella (`setRange`); un secondo tocco più avanti allunga la parte, *Tutto il brano* la toglie. *Ripeti* la manda in loop finché non si preme *Ferma*. *Pausa* ferma l'orologio e l'accompagnamento e *Riprendi* riparte da lì. Una parte, o una ripetizione, è pratica: il risultato si vede ma non si salva e non apre il modo dopo, perché il record vale sul brano intero (`partial`).

## 6. Cosa dice il microfono

Un accordo si giudica **sulla pennata**, mai sull'aria tra due pennate (`lib/audio/judge.ts`, `StrumJudge`). Una pennata è un salto di energia su molte frequenze insieme (flusso spettrale, `OnsetDetector` in `detect.ts`: un accordo che ancora suona non nasconde la pennata dopo); da lì si ascoltano 450 ms (`WINDOW_MS`), o meno se il suono è già sceso sotto il 30% del picco, si fa la media del cromagramma e si giudica una volta. Così la coda di un accordo che si spegne non diventa "manca il Sol diesis", le dita che si spostano tra due accordi non diventano "accordo sbagliato", e il rumore della stanza non diventa un accordo con note mancanti (sotto `TONAL_MIN` non c'è verdetto). È quello che fanno i sistemi che etichettano gli accordi solo agli eventi di pennata ([Joint Transcription of Acoustic Guitar Strumming Directions and Chords, 2025](https://arxiv.org/pdf/2508.07973)) e quello che fa Essentia con una finestra di cromagrammi invece di un fotogramma ([ChordsDetection](https://essentia.upf.edu/tutorial_tonal_chords.html)).

Il suono dell'app non conta: mentre una nota della chitarra sintetica è nella stanza (un *Ascolta*, la chitarra guida) i fotogrammi sono marcati `ownSound` e la pennata che li contiene non dà verdetto. Il basso della band è una sinusoide un'ottava sotto, senza armoniche nella banda analizzata: un'onda triangolare metteva le sue armoniche proprio sulle note dell'accordo e il microfono la prendeva per la pennata del giocatore. Con la **chitarra guida accesa** il giro *A tempo* è solo pratica: non si giudica e non si salva, perché il microfono sentirebbe lei. La cancellazione d'eco del browser è stata provata e scartata: in Chromium azzerava tutta la cattura.

- **Giusto**: una pennata con tutte le note e tutte le corde che devono suonare.
- **Sento un altro accordo**: quando un altro accordo somiglia molto di più.
- **Manca una nota**: il dito da sistemare, la corda e il tasto, e la corda segnata in rosso sul diagramma (`fixFor` in `feedback.ts`).
- **Corda a vuoto muta**: qualche dito la tocca.
- **La corda X non ha suonato**: ogni corda dell'accordo deve avere un picco alla sua fondamentale (`silentStrings` in `detect.ts`, soglia `SILENT_BELOW_DB`). Le note da sole non bastano: una pennata sulle tre corde acute di un G ha tutte le note di G, ma non è un G. Si controllano le corde la cui fondamentale non coincide con un'armonica di una corda più bassa (`checkableStrings`): il Sol a vuoto di G è l'ottava del basso e non si distingue da lui, quindi ha il beneficio del dubbio. Due o più corde mute insieme: "la pennata parte dalla corda più grave".
- In *A tempo* la pennata fino a 0,3 battiti prima della stanghetta appartiene alla battuta nuova (`EARLY_BEATS`).

Nell'esercizio delle note il microfono confronta l'altezza, non la corda: la stessa nota su un'altra corda vale. Dice *più su*, *più giù* o *un'ottava sopra/sotto*.

## 7. Il consiglio sul cambio

Sotto *Dopo* e nella pagina dell'accordo c'è una frase su come passare da un accordo all'altro, calcolata dalle due forme (`transitions.ts`):

- le dita che **restano** (stessa corda, stesso tasto);
- quelle che **scivolano** di una corda allo stesso tasto;
- le altre, che **vanno al loro posto**;
- se nessun dito resta fermo, quale **muovere per primo**: quello che scivola, altrimenti quello sulla corda più grave.

## 8. I brani

Solo due tipi, mai testi o melodie di opere protette:

- **Tradizionali** di pubblico dominio (canti, inni, Stephen Foster).
- **Giri di accordi** di canzoni note (gruppo `progression`): solo la sequenza che si strimpella.

Ogni brano ha un ritmo (`down`, `boomChick`, `waltz`, `folk`) e una o più sezioni ripetute. Per aggiungerne uno: comando `/brano` in Claude Code, o la tabella in `CLAUDE.md`.

## 9. Le tecniche

`/techniques` (`lib/music/techniques.ts`, `lib/music/theory.ts`) viene dopo i primi accordi e segue la stessa regola del resto: una tecnica è fatta quando un risultato salvato lo dimostra.

| Tecnica | Cosa la dimostra |
|---|---|
| Pennate in giù, boom-chick, folk (giù, giù-su, su-giù-su), valzer | un brano del catalogo con quella pennata superato *A tempo* (`strumProvedBy`); la pagina indica in quale brano provarla, prima quelli con tutti gli accordi imparati |
| Arpeggio | il microfono sente le corde dell'accordo una alla volta, dalla più grave, nell'ordine (`arpeggioStep`); una corda sbagliata non fa ricominciare ma non manda avanti; il tempo si salva come risultato *step* su `arp-<accordo>`, il più veloce è il record |
| Palm mute, capotasto, tonalità, power chord e barré | si leggono; niente da spuntare, perché il microfono non li distingue o l'app non li riconosce ancora |

Il capotasto ha un calcolatore: forme in una tonalità, tonalità che si vuole sentire, il tasto (`capoFor`) e cosa suona ogni forma (`transposeName`). La tabella delle tonalità mostra i sei accordi di Sol, Do, Re, La e Mi (`chordsOfKey`), con quelli che l'app insegna nel loro colore e gli altri tratteggiati.
