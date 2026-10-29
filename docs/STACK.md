# Lo stack e l'architettura

Com'è fatta, com'è divisa, con cosa. Lo stesso telaio di Verso Loyalty, più piccolo: un solo host, nessun multi-tenant.

## 1. Architettura

### Tre strati

```
src/
  app/          rotte e server action, sottili
    page.tsx    la presentazione, per chi non ha fatto l'accesso
    (app)/      le schermate con la barra laterale: percorso (/path), tastiera, accordi, brani, accordatore
    play/       il brano a schermo pieno, senza barra laterale
    account/    accesso, a due colonne, fuori dalla barra laterale
    start/      il questionario del primo avvio, a schermo pieno
  components/   per area: landing, start, path, fretboard, songs, play, chords, tools, account, chrome, ui
  lib/
    music/      il dominio, puro: accordi, brani, ritmi, percorso, consigli,
                note sulla tastiera (lezione 0), passaggi tra accordi,
                profilo dal questionario e punto di partenza,
                routine del giorno e giorni di fila, orecchio musicale,
                cosa il microfono deve sentire per credere (checks.ts)
    audio/      detect.ts puro (croma, confronto accordi, accordatore),
                synth.ts e engine.ts lato browser (Web Audio)
    progress/   validazione, repository Postgres, caricamento per pagina
    coach/      l'insegnante: contesto dai fatti (puro), modello, servizio
  db/           schema Drizzle, client, migrate.mjs
  messages/     it.ts e il gemello tipato en.ts
  i18n/         next-intl senza lingua nell'URL (biscotto `locale`)
tests/e2e/      Playwright con microfono finto
```

### Il giro di un esercizio

1. `PracticeSession` (`components/play/session.ts`) è una classe, non stato React: gira a 60 fotogrammi al secondo e avvisa React solo quando cambia qualcosa che si vede.
2. Un unico `AudioContext` (`lib/audio/engine.ts`) tiene sintetizzatore e microfono sullo stesso orologio. Nasce al primo tocco, perché il browser rifiuta suono e microfono prima di un gesto.
3. L'accompagnamento è programmato 150 ms avanti sul tempo dell'`AudioContext`: un `setInterval` riempie la coda, il suono non dipende dal disegno.
4. Ogni fotogramma il microfono dà livello, croma (12 classi di nota) e attacco. `matchChord` dice quale accordo somiglia di più, quali note mancano, se è pulito.
5. Tre fotogrammi puliti di fila valgono un accordo giusto. In *A tempo* la battuta si giudica da 0,3 battiti prima della stanghetta: la pennata in anticipo appartiene alla battuta nuova.

### Lo schermo del brano

- *Adesso* grande, *Dopo* con il bordo ottone e il conto dei battiti; la frase sotto *Dopo* viene da `transition()`: quali dita restano, quali scivolano di una corda, quale muovere per primo.
- La corsia è un canvas: i token con `light-dark()` li risolve un elemento nascosto, perché il canvas non capisce `light-dark()`.
- La struttura mostra ogni battuta (o ogni cambio, in *Passo passo*) con il suo esito, da `View.statuses`.

### Cosa il microfono non deve sentire

Il riconoscimento ascolta tra 75 Hz e 1,1 kHz. Il basso suona un'ottava sotto la corda più grave, clic e campanello stanno sopra 1,9 kHz, i piatti sono filtrati sopra 7 kHz. Solo la chitarra guida cade nella banda: per questo lo schermo chiede le cuffie quando è accesa.

### Account

- L'app è gratuita ma si usa solo con un account: serve a tenere traccia dei progressi. `/` è la presentazione pubblica; `(app)/layout.tsx`, `/play` e `/start` chiamano `requireUser()` e senza sessione mandano a `/account`.
- Accesso con email e password, e con Google o Apple quando le loro credenziali sono impostate (`socialProviders()` in `lib/auth.ts`).
- Su Postgres: `chord_mastery`, `practice_runs`, `player_profile` (le risposte al questionario, in JSON validato a ogni lettura), `change_tests` (ogni test dei cambi, il record è il massimo per coppia) e `routine_log` (le attività fatte, per giorno locale del giocatore); `community_songs` e `song_reports` per i brani degli utenti (`lib/community`), i cui risultati stanno in `practice_runs` con id `c-…`; `recordings` tiene l'audio della settimana (bytea, Opus o AAC di pochi secondi, una riga per settimana per giocatore), servito da `/api/recordings/[id]` solo al proprietario; `notifications`, `conversations`, `messages`, `blocks`, `message_reports`, `messaging_settings` per notifiche e messaggi (`lib/social`).
- Il server segna le attività della routine dai risultati che salva (`lib/progress/practice.ts`); dal browser arrivano solo le prove del microfono per accordatura e riscaldamento (`reportProof`).
- L'insegnante (`lib/coach`): `context.ts` è puro e costruisce il brief dai risultati; `model.ts` è l'unico file che parla con l'API di Anthropic; `service.ts` conta il limite giornaliero, salva ogni scambio in `coach_messages` e tiene il riepilogo della settimana.
- Il giorno lo manda il browser, perché "oggi" è quello di chi suona; il server lo accetta solo se dista al massimo un giorno dal suo (`isNearToday`). Ogni prova è una riga, mai sovrascritta: il record è una query (`min` per *Passo passo*, `max` per *A tempo*).
- Prima che l'account diventasse obbligatorio i progressi stavano nel `localStorage`: al primo accesso entrano nell'account una volta, poi il browser li dimentica.

## 2. Le tecnologie

| Strato | Scelta |
|---|---|
| Telaio | Next.js 15 App Router, React 19, TypeScript strict con `noUncheckedIndexedAccess` |
| Aspetto | Tailwind 4 senza configurazione, token in `globals.css` con `light-dark()` |
| Testi | next-intl 4, italiano predefinito |
| Dati | Drizzle ORM + postgres.js, pool a 5 |
| Identità | Better Auth, email e password, `nextCookies()` per ultimo |
| Validazione | zod 4, ai bordi |
| Prove | Vitest (`*.test.ts`, `*.db.test.ts` che si saltano senza `DATABASE_URL_TEST`), Playwright |
| Rilascio | Docker su Fly.io, Francoforte, migrazioni come `release_command` |

## 3. Le prove

- `src/lib/music/*.test.ts`: forme degli accordi, catalogo, percorso, ritmi, consigli.
- `src/lib/audio/detect.test.ts`: tutti gli accordi riconosciuti su spettro sintetico e su pennata Karplus-Strong vera (finestra di Blackman, FFT), corde mute riconosciute, accordatore.
- `src/lib/progress/progress.db.test.ts`: Postgres vero.
- `src/messages/keys.test.ts`: parità delle lingue, niente trattino lungo.
- `tests/e2e/practice.spec.ts`: presentazione e accesso obbligatorio, *Passo passo*, *A tempo*, imparare un accordo, progressi che seguono l'account, uscita, tastiera, questionario con prova al microfono. Microfono finto di Chromium, un account nuovo per test.

## 4. Il rilascio

```bash
fly launch --no-deploy            # la prima volta, con fly.toml già pronto
fly postgres create               # oppure un Postgres esterno
fly secrets set DATABASE_URL=... BETTER_AUTH_SECRET=$(openssl rand -hex 32)
fly deploy
```

`BETTER_AUTH_URL` in `fly.toml` va allineato al dominio vero. La macchina si spegne quando nessuno la usa: va bene per un'app personale, va cambiato il giorno che altri ci contano.
