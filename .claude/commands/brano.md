---
description: Aggiunge un brano al catalogo, nella lezione giusta, con i test che passano
argument-hint: "<titolo> [accordi, ritmo, struttura]"
---

Aggiungi il brano: $ARGUMENTS

Prima di scrivere:
- Leggi `src/lib/music/songs.ts`, `src/lib/music/path.ts` e la sezione *Brani* di `docs/PERCORSO.md`.
- Decidi il gruppo. Se il brano è un'opera protetta (quasi tutto ciò che è uscito dopo il 1929), va **solo il giro di accordi**: gruppo `progression`, `origin: "chordsOnly"`, nessun testo, nessuna melodia, nemmeno nei commenti. Se è tradizionale di pubblico dominio, gruppo `traditional` con l'`origin` adatta.
- Usa solo accordi presenti in `SHAPES` (`src/lib/music/chords.ts`). Se ne serve un altro, fermati e proponi `/accordo`.

Poi:
1. Aggiungi la voce in `SONGS`: `id` in kebab-case, una battuta per accordo, `beatsPerBar` 3 o 4, `pattern` tra `down`, `boomChick`, `waltz`, `folk`, sezioni con `repeat`.
2. Mettilo in `songs` della prima lezione di `LESSONS` che ha già insegnato tutti i suoi accordi.
3. `pnpm test`: un test pretende che ogni brano stia in una lezione e non usi accordi non ancora insegnati.
4. Se hai una nuova `origin`, aggiungi la chiave in `play.origin` in `src/messages/it.ts` ed `en.ts`.

Riassumi: lezione, accordi, ritmo, battute totali.
