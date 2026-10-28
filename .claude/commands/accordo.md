---
description: Aggiunge un accordo con forma, colore, nome, lezione e riconoscimento provato
argument-hint: "<accordo, es. F o Cadd9>"
---

Aggiungi l'accordo: $ARGUMENTS

Leggi prima `CLAUDE.md` (tabella *Dove aggiungere cosa*), `src/lib/music/chords.ts` e `src/lib/audio/detect.test.ts`.

1. **Forma**: l'id nel tipo `ChordId` e la voce in `SHAPES`, tasti per corda dalla 6ª alla 1ª (`-1` muta, `0` a vuoto), dita 1-4. Usa la diteggiatura aperta più comune per un principiante; se l'accordo esiste solo col barré, dillo prima di procedere.
2. **Colore**: un token `--color-chord-<Id>` in `@theme static` di `src/app/globals.css`, diverso dagli altri a colpo d'occhio, abbastanza scuro per il testo bianco (contrasto almeno 4,5:1). Uno solo, valido per i due temi.
3. **Nome** in `common.chord` di `src/messages/it.ts` (es. "Fa maggiore") ed `en.ts`.
4. **Lezione**: in `LESSONS` (`src/lib/music/path.ts`), in una lezione esistente o in una nuova con il suo esercizio (`drill-...` in `SONGS`), titolo e consiglio in `path.lessonTitle` e `path.lessonTip`. Il consiglio spiega cosa ha in comune con un accordo già imparato.
5. **Riconoscimento**: `detect.test.ts` prova già tutti gli accordi di `SHAPES` su spettro sintetico e pennata Karplus-Strong. Se il nuovo accordo si confonde con un altro (stesse note, o una sola di differenza), non toccare le soglie senza un test che lo giustifichi: segnalalo.
6. `pnpm test` e `pnpm typecheck`.

Riassumi forma, colore scelto e accordi con cui rischia di confondersi.
