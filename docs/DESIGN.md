# Il design

Come si vede l'app e come si mantiene coerente. La fonte è il canvas di design su claude.ai (*Guitar.Coach*); il codice lo segue attraverso i token in `src/app/globals.css`.

Per ora solo web, schermo largo. Sotto 768 px la barra laterale diventa una barra in alto, ma nessuna schermata è disegnata per il telefono.

## 1. Il linguaggio

- **Blu notte** (`navy`) porta la cornice: barra laterale, bottoni principali, il riquadro del prossimo passo, il risultato di un brano.
- **Ottone** (`brass`) segna l'adesso: il prossimo passo, il battito corrente, la linea della corsia, il riquadro *Dopo*, il compito in corso.
- **Ogni accordo ha il suo colore**, uguale ovunque: lettera, chip, blocco nella corsia, cella della struttura. Abbastanza scuro da reggere il testo bianco in entrambi i temi.
- **Verde, rosso, giallo** solo per gli esiti: giusto, da sistemare, attenzione.

Caratteri: Archivo variabile per tutto, stretto all'88% nei titoli (`.display`) e all'85% nelle lettere degli accordi; IBM Plex Mono per numeri, battiti, bpm, tasti. Sono serviti dall'app (`@fontsource`), non da Google Fonts.

## 2. I token

| Gruppo | Token |
|---|---|
| Fondi | `page`, `surface`, `subtle`, `sunken` |
| Linee | `line`, `line-strong` |
| Testo | `ink`, `ink-2`, `muted` |
| Cornice | `navy`, `navy-2`, `navy-line`, `on-navy`, `on-navy-muted`, `primary`, `on-primary` |
| Adesso | `brass`, `brass-ink`, `on-brass` |
| Esiti | `good`, `good-soft`, `good-ink`, `bad`, `bad-soft`, `bad-ink`, `warn`, `warn-soft` |
| Accordi | `chord-Em`, `chord-Am`, `chord-C`, `chord-G`, `chord-D`, `chord-Dm`, `chord-E`, `chord-A` |
| Raggi | `field` 10, `control` 14, `card` 20, `hero` 24 |

Ogni colore ha il valore chiaro e scuro in un solo `light-dark()`. Nelle classi si usano come `bg-navy`, `text-brass-ink`, `rounded-[var(--radius-card)]`; per il colore di un accordo, `style={{ color: \`var(--color-chord-${c})\` }}`.

Due eccezioni note:
- il **canvas** della corsia non capisce `light-dark()`: i colori passano da `resolver()` in `components/play/highway.ts`;
- i **diagrammi** degli accordi hanno classi proprie (`.dg-*`) in `globals.css`.

## 3. Le schermate

| Rotta | Schermata | Componente principale |
|---|---|---|
| `/` | Presentazione: perché esiste, come funziona, cosa c'è, i brani liberi, gratis. Chi ha fatto l'accesso va su `/today` | `components/landing/landing.tsx` |
| `/today` | Oggi: la routine del giorno, blocchi numerati con minuti e azione, giorni di fila. La pagina dopo l'accesso | `components/today/today-view.tsx` |
| `/progress` | Progressi: numeri, da ripassare, calendario, grafici con tooltip e tabella | `components/progress/progress-view.tsx`, `components/charts/line-chart.tsx` |
| `/basics` | Le basi: otto argomenti con disegni al tratto (`components/basics/figures.tsx`) | `components/basics/basics-view.tsx` |
| `/print/basics`, `/print/lesson`, `/print/week` | Guide da stampare, una colonna, bottone di stampa in alto; `@media print` in `globals.css` | `app/print/*`, `components/print/*` |
| `/path` | Percorso: prossimo passo, numeri, lezioni, compiti, brani della lezione | `components/path/path-view.tsx` |
| `/fretboard` | Lezione 0: regole, mappa delle note, esercizio col microfono, nomi | `components/fretboard/*` |
| `/ear` | Orecchio: cinque livelli, giri di dieci domande; `?level=N` evidenzia il livello di oggi | `components/ear/ear-view.tsx` |
| `/chords` | Gli otto accordi nell'ordine del percorso | `components/chords/chord-grid.tsx` |
| `/chords/[chord]` | Impara un accordo: dita, tre pennate pulite, verso dove si va | `components/chords/learn-chord.tsx` |
| `/songs` | Brani: filtri, ricerca, prossimo modo | `components/songs/songs-table.tsx` |
| `/play/[songId]?mode=` | Il brano a schermo pieno, senza barra laterale | `components/play/player.tsx` |
| `/tools` | Accordatore e test dei cambi; `?a=G&b=D#changes` sceglie la coppia | `components/tools/*` |
| `/start` | Questionario: una domanda per schermata, prova al microfono, riepilogo | `components/start/*` |
| `/coach` | Insegnante: una domanda, una risposta, le domande precedenti; spento senza chiave | `components/coach/coach-view.tsx` |
| `/help` | Aiuto: problemi comuni per gruppo, ricerca, `#p-<id>` apre un problema; linkato dalla fascia del microfono | `components/help/help-view.tsx` |
| `/community` | I brani pubblicati dagli altri e i propri; bozze con bordo tratteggiato; segnalazione in riga | `components/community/community-list.tsx` |
| `/community/new`, `/community/[id]/edit` | Procedura guidata in cinque passi, una domanda per schermata | `components/community/song-editor.tsx` |
| `/progress#recordings` | Le registrazioni della settimana, con il lettore audio del browser | `components/progress/recordings.tsx` |
| `/techniques` | Tecniche: una sezione per tecnica, ancora `#id`; arpeggio col microfono, calcolatore del capotasto, tabella delle tonalità | `components/techniques/techniques-view.tsx` |
| `/terms` | Regole della community, pubbliche, senza barra laterale | `app/terms/page.tsx` |
| `/account` | Accesso a due colonne, fuori dalla barra laterale; `?mode=signup` apre la registrazione | `components/account/account-form.tsx` |

Le schermate con la barra laterale stanno nel gruppo `src/app/(app)/`, il cui `layout.tsx` mette barra e contenuto (largo al massimo 1120 px).

### Il brano

Dall'alto: intestazione (indietro, titolo e ritmo, modi, bpm, Avvia/Ferma), *Adesso* largo due terzi con diagramma da 260 px e lettera da 168 px, *Dopo* un terzo con bordo ottone e conto dei battiti, la fascia del microfono, la corsia, poi *Struttura* e *Accompagnamento*. A fine brano un riquadro blu notte con il risultato e il passo successivo.

## 4. I pezzi riusabili

| Pezzo | Dove | Uso |
|---|---|---|
| `ChordDiagram` | `components/chord-diagram.tsx` | diagramma SVG, `flagged` segna corde in rosso, `leftHanded` lo specchia |
| `ChordChip` | `components/ui/chord-chip.tsx` | chip colorato; `pending` tratteggiato per gli accordi non imparati |
| `button.brass/primary/outline` | `components/ui/links.ts` | le tre forme di bottone; l'altezza la decide chi lo usa (`h-12`, `h-[52px]`) |
| `FeedbackBanner` | `components/play/player.tsx` | la fascia del microfono, condivisa con *Impara* |
| `TransitionHint` | `components/play/transition-hint.tsx` | la frase sul cambio tra due accordi |
| Icone | `components/ui/icons.tsx` | tratto 2 px, 20 px nella barra |
| `.eyebrow`, `.display`, `.soon` | `globals.css` | etichetta maiuscola, titolo stretto, pulsazione dell'ultimo battito |

## 5. I grafici

Una serie per grafico, con il titolo che dice cosa misura e se più alto o più basso è meglio: niente legende né colori da distinguere. La linea è in `ink`, il riferimento (il 70% di *A tempo*, l'8 su 10 dell'orecchio) tratteggiato in `brass`. Ogni grafico ha il tooltip al passaggio e la tabella dei valori sotto, per chi non vede il grafico. Il calendario usa una sola tinta, l'ottone, più o meno intensa.

## 6. Per cambiare il design

1. Cambia prima il canvas, così resta la fonte.
2. Un colore nuovo è un token nuovo in `@theme static`, con valore chiaro e scuro.
3. Testi nuovi in `messages/it.ts` ed `en.ts`.
4. `pnpm shots` e confronta gli screenshot con il canvas.
