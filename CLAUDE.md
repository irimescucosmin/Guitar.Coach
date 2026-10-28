# Convenzioni

Per chi scrive codice qui, persone e agenti.

- `docs/STACK.md`: architettura e tecnologie.
- `docs/SVILUPPO.md`: avvio in locale, microfono, prove, rilascio, problemi noti.
- `docs/PERCORSO.md`: cosa insegna l'app, in che ordine, quando un compito è fatto.
- `docs/DESIGN.md`: token, schermate, pezzi riusabili.
- `docs/ANALISI.md`: cosa deve avere l'app per un principiante, cosa c'è e in che ordine fare il resto.

In Claude Code ci sono i comandi `/verifica`, `/brano`, `/accordo`, `/schermata`, `/revisione`, `/rilascio` (in `.claude/commands/`) e l'agente `revisore`.

## Regole

- **Codice in inglese, interfaccia in italiano.** Ogni testo visibile sta in `src/messages/it.ts`, con il gemello `en.ts` tipato `typeof it`: una chiave mancante non compila. Mai stringhe in linea nel JSX.
- **Niente trattino lungo nei testi italiani.** Un test lo controlla (`src/messages/keys.test.ts`).
- **Le regole stanno in `src/lib`**, mai in una server action o in un componente. `src/app/actions.ts` fa solo: chi sta chiamando, validazione zod, delega.
- **`src/lib/music` è puro**: niente React, niente Web Audio, niente database. È la parte più testata e deve restarlo.
- **`src/lib/audio/detect.ts` è puro** anche lui: ogni soglia del riconoscimento si prova con uno spettro sintetico o con una pennata Karplus-Strong passata da FFT (`detect.test.ts`). Una soglia cambiata senza un test che la giustifica non entra.
- **Ciò che arriva dal browser si confronta con il catalogo** (`src/lib/progress/validation.ts`), mai creduto.
- **Colori e raggi solo dai token** in `src/app/globals.css` (`--color-ink`, `--color-chord-Em`, `--radius-field`). Il blocco `@theme` è `static`: il canvas della corsia legge i token per nome e Tailwind toglierebbe quelli non usati da una classe.
- **Mai un brano con testo o melodia** di un'opera protetta: per quelle solo il giro di accordi, gruppo `progression`.

## Dove aggiungere cosa

| Cosa | Dove |
|---|---|
| Un accordo | `ChordId` e `SHAPES` in `src/lib/music/chords.ts`, un token colore in `globals.css`, il nome in `common.chord` |
| Un brano | `SONGS` in `src/lib/music/songs.ts` e in una lezione di `src/lib/music/path.ts` (un test pretende che ogni brano stia in una lezione e non usi accordi non ancora insegnati) |
| Un ritmo | `StrumPattern` e `guitarEvents` in `src/lib/music/patterns.ts` |
| Una schermata | `src/app/(app)/` con la voce in `NAV` di `components/chrome/sidebar.tsx`, testi in `messages` |
| Una tabella | `src/db/schema/`, poi `pnpm db:generate` |

## Insidie già pagate

- In zod 4 `z.record(z.enum(...))` pretende **tutte** le chiavi: per dati parziali si usa `z.partialRecord`.
- La quinta armonica di una corda grave è la sua terza maggiore: senza `harmonicWeight` un Em si legge E.
- Il canvas non legge `light-dark()`: i colori della corsia passano dal risolutore in `highway.ts`.
- Il microfono finto di Chromium è uno per browser e continua da dove l'ha lasciato il test precedente: un test che conta le battute contro l'orologio va nel progetto `em-am-timed` (tag `@own-browser`).
- `pkill -f "next start"` uccide anche la shell che lo lancia: per fermare il server, `fuser -k 3000/tcp`.
