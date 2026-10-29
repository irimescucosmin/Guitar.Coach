# Il percorso didattico

Cosa insegna l'app, in che ordine, e quando una cosa si considera fatta. Il codice sta in `src/lib/music`; qui c'è il perché.

## 1. Chi c'è dall'altra parte

Un principiante con la chitarra acustica: non conosce ancora gli accordi né le note sulla tastiera, vuole accompagnare brani country e folk con la pennata e il boom-chick. Ogni accordo si mostra sempre con il suo diagramma, le dita numerate e le corde a vuoto o mute.

## 2. Le lezioni

| # | Lezione | Accordi nuovi | Esercizio | Perché in quest'ordine |
|---|---|---|---|---|
| 0 | Le note sulla tastiera | nessuno | trova le note (`notes`) | prima i nomi: Mi La Re Sol Si Mi, e le prime note sulle corde acute |
| 1 | Em e Am | Em, Am | `drill-em-am` | stessa forma spostata di una corda |
| 2 | G e D | G, D | `drill-g-d` | l'anulare si sposta di una sola corda |
| 3 | C e i giri country | C | `drill-g-c-d` | da Am a C indice e medio restano fermi |
| 4 | Dm | Dm | `drill-dm-c` | stessa zona di D |
| 5 | E e A | E, A | `drill-e-a` | E è la forma di Am spostata verso il basso |

Ogni nuovo accordo condivide qualcosa con uno già imparato. Un test in `music.test.ts` pretende che nessun brano di una lezione usi accordi non ancora insegnati.

## 3. Il questionario

Al primo avvio il percorso propone `/start`: nove domande (esperienza, corde a vuoto, accordi conosciuti, tablature, mano, chitarra, tempo al giorno, stile, obiettivo) e una prova al microfono sugli accordi dichiarati. Le risposte stanno in `Progress.profile`.

- Un accordo dichiarato diventa imparato solo se il microfono lo sente pulito. Chi salta la prova si fida della propria dichiarazione (`placedChords`).
- Chi sa le corde a vuoto salta la lezione 0.
- Chi ha già suonato (non *Mai*) e ha tutti gli accordi di una lezione ne salta anche gli esercizi *Passo passo* e *A tempo* (`skipsDrillsFor`). Un principiante assoluto li fa sempre: i cambi si costruiscono lì.
- Dopo 14 giorni il percorso propone di rispondere di nuovo (`needsRecheck`).

Il tempo al giorno decide la routine, lo stile quali brani arrivano prima.

## 3 bis. La pratica di oggi

`/today` è la pagina di ogni giorno: dopo l'accesso si arriva lì. La costruisce `dailyRoutine` in `routine.ts`.

| Minuti | Accordatura | Riscaldamento | Prossimo passo | Cambi | Brano |
|---|---|---|---|---|---|
| 10 | 1 | 0 | 5 | 4 | 0 |
| 20 | 1 | 3 | 7 | 4 | 5 |
| 30 | 1 | 4 | 10 | 6 | 9 |

- **Prossimo passo**: lo stesso compito del percorso (`nextTask`).
- **Cambi**: una coppia di accordi imparati che i brani usano davvero (`practisedPairs`). Prima le coppie mai provate, poi quella col record più basso nel test dei cambi (`weakPair`).
- **Brano**: uno al giorno tra quelli con tutti gli accordi imparati, prima i ritmi dello stile scelto (`songOfTheDay`).
- Un blocco senza niente da fare passa i minuti agli altri.
- Fare la cosa segna l'attività (`blocksDoneBy`), ovunque nell'app; accordatura e riscaldamento si segnano a mano. I giorni di fila (`streak`) contano fino a ieri finché oggi non è finito.

## 4. I compiti di una lezione

Sempre questi, in quest'ordine, perché ognuno prepara il successivo:

1. **Impara** ogni accordo nuovo: tre pennate pulite sentite dal microfono (o *Segna come imparato* senza microfono).
2. **Passo passo** sull'esercizio: il brano aspetta l'accordo giusto. Fatto alla prima prova completa.
3. **A tempo** sull'esercizio: fatto quando almeno il 70% delle battute ha l'accordo giusto (`PASS_SCORE`).

La lezione 0 ha un compito solo: completare l'esercizio delle note.

In alto nel percorso c'è sempre un solo prossimo passo, il primo compito non fatto (`nextTask`). Un compito è fatto quando lo hai fatto tu, o quando il questionario ti ha messo oltre (`isDone`).

## 5. I tre modi di suonare un brano

| Modo | Cosa fa | Cosa si salva |
|---|---|---|
| Ascolta | chitarra guida, basso e batteria, gli accordi scorrono | niente |
| Passo passo | aspetta l'accordo giusto, poi va avanti; barra spaziatrice per saltare | media in ms per cambio, il record è la più bassa |
| A tempo | basso, batteria e clic; ogni battuta si giudica | quota di battute giuste, il record è la più alta |

Dopo *Passo passo* l'app dice se sei pronto per *A tempo*: lo sei quando il cambio medio sta dentro una battuta al tempo scelto (a 100 bpm in 4/4, 2,4 s).

Dopo un *A tempo* superato, il prossimo modo di quel brano diventa *Più veloce*: 5 bpm in più.

## 6. Cosa dice il microfono

- **Giusto**: tre fotogrammi puliti di fila (`CLEAN_FRAMES`).
- **Sento un altro accordo**: quando un altro accordo somiglia molto di più.
- **Manca una nota**: il dito da sistemare, la corda e il tasto, e la corda segnata in rosso sul diagramma (`fixFor` in `feedback.ts`).
- **Corda a vuoto muta**: qualche dito la tocca.
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
