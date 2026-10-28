---
description: Tutti i controlli prima di consegnare, con un riassunto di cosa passa e cosa no
argument-hint: "[e2e]"
---

Esegui i controlli del progetto in quest'ordine e fermati al primo che fallisce, per correggerlo:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test` (se c'è `DATABASE_URL_TEST` in `.env.local` girano anche i test su Postgres; se Postgres non risponde, dillo e prosegui)
4. `pnpm build`
5. Solo se gli argomenti contengono `e2e`, o se la modifica tocca `components/play`, `components/chords`, `lib/audio` o l'account: `fuser -k 3000/tcp` e poi `pnpm e2e`.

Per ogni errore: leggi il file, correggi la causa (mai disattivare un controllo o un test per farlo passare), rilancia il passo.

Alla fine scrivi una tabella con controllo, esito e durata, e le correzioni fatte in una riga ciascuna.

Argomenti: $ARGUMENTS
