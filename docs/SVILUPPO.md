# Sviluppo in locale

Dal clone al primo accordo riconosciuto, poi le prove e il rilascio. L'architettura sta in [`STACK.md`](STACK.md), le regole in [`../CLAUDE.md`](../CLAUDE.md).

## 1. Cosa serve

- Node 22 e pnpm 10 (`corepack enable` basta: la versione è in `package.json`).
- Postgres 16, in uno dei due modi qui sotto.
- Chrome o Safari recenti, con un microfono. Quello del portatile va bene; con la chitarra a 30-50 cm dal microfono il riconoscimento lavora meglio.

## 2. Primo avvio

```bash
pnpm install
cp .env.example .env.local
# in .env.local: BETTER_AUTH_SECRET=$(openssl rand -hex 32)
```

### Postgres con Docker

```bash
docker compose up -d        # crea guitar_coach e guitar_coach_test, utente coach/coach
pnpm db:migrate
```

### Postgres senza Docker (Homebrew)

```bash
brew install postgresql@16 && brew services start postgresql@16
createuser -s coach && psql -c "alter user coach password 'coach'" postgres
createdb -O coach guitar_coach && createdb -O coach guitar_coach_test
pnpm db:migrate
```

Gli URL in `.env.example` puntano già a `coach:coach@localhost:5432`.

### Avvio

```bash
pnpm dev                    # http://localhost:3000
```

`/` è la presentazione; tutto il resto chiede un account, che si crea da `/account?mode=signup` con email e password. Dopo la registrazione si parte dal questionario (`/start`), poi il percorso è su `/path`.

### Accesso con Google e Apple

I bottoni compaiono solo quando le variabili sono impostate in `.env.local` (e con `fly secrets set` in produzione).

- **Google**: in Google Cloud Console, *API e servizi*, *Credenziali*, un *ID client OAuth* di tipo *Applicazione web*. URI di reindirizzamento: `http://localhost:3000/api/auth/callback/google` e `https://DOMINIO/api/auth/callback/google`. Poi `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Funziona anche su localhost.
- **Apple**: serve l'Apple Developer Program. Un *Services ID* con *Sign in with Apple* e return URL `https://DOMINIO/api/auth/callback/apple`; Apple non accetta localhost né http, quindi si prova solo sul dominio vero. `APPLE_CLIENT_ID` è il Services ID; `APPLE_CLIENT_SECRET` è un JWT ES256 firmato con la chiave `.p8` (Team ID come issuer, Services ID come subject), valido al massimo sei mesi: va rigenerato prima che scada, altrimenti l'accesso con Apple smette di funzionare. Il dominio `https://appleid.apple.com` entra da solo tra le origini fidate.

Fonti: [Better Auth, Google](https://better-auth.com/docs/authentication/google), [Better Auth, Apple](https://better-auth.com/docs/authentication/apple).

### L'insegnante (AI)

`ANTHROPIC_API_KEY` in `.env.local` accende la pagina Insegnante e il riepilogo settimanale nei Progressi; senza chiave sono spenti e lo dicono. Il modello è `claude-haiku-5-5`, chiamato solo dal server (`lib/coach/model.ts`), 20 domande al giorno per account. I test di `lib/coach` sostituiscono il modello con una risposta finta: la chiave non serve per i test.

`NEXT_PUBLIC_CONTACT_EMAIL` è l'indirizzo mostrato in `/terms` per segnalazioni e richieste di rimozione; senza, la pagina non mostra nessun contatto. Da impostare prima di aprire la community a qualcuno.


## 3. Il microfono

Il browser dà il microfono solo a un'origine sicura: `localhost`, `127.0.0.1` o qualsiasi `https://`. Altrimenti il bottone dice *Serve https*. Attenzione a `http://lvh.me:3000`: risolve su 127.0.0.1 ma origine sicura non è, quindi il microfono non lo ottiene.

Una volta sola, per rendere fidata la CA locale. Chiede la password, ed è il passo che `--experimental-https` da solo non riesce a fare:

```bash
mkcert -install   # senza mkcert nel PATH, pnpm dev:cert stampa il percorso di quello scaricato da Next
```

Poi, ogni volta:

```bash
pnpm dev:https              # certificato locale, ascolta su 0.0.0.0
```

`dev:https` passa da `dev:cert`, che genera con mkcert un certificato per `localhost`, `lvh.me`, `*.lvh.me` e l'IP del Mac sulla rete, e lo rigenera solo quando uno di quei nomi manca, per esempio dopo un cambio di rete. Sta in `certificates/`, fuori da git. Quello che scriverebbe Next da solo copre `localhost 127.0.0.1 ::1 0.0.0.0` e niente altro, perciò su `lvh.me` darebbe errore di nome.

Vale per tutti e tre gli indirizzi: dal telefono sulla stessa rete apri `https://IP-DEL-MAC:3000`. Per accedere con un account da un'origine diversa da `BETTER_AUTH_URL`, aggiungi quell'indirizzo a `BETTER_AUTH_TRUSTED_ORIGINS` in `.env.local`.

Le cuffie servono solo con la *Chitarra guida* accesa in *A tempo*: è l'unico suono dell'app dentro la banda che il microfono ascolta (75 Hz – 1,1 kHz).

## 4. Le prove

| Comando | Cosa controlla | Tempo |
|---|---|---|
| `pnpm typecheck` | TypeScript strict, chiavi dei messaggi comprese | ~10 s |
| `pnpm lint` | ESLint di Next | ~10 s |
| `pnpm test` | Vitest: dominio, riconoscimento, messaggi; Postgres se c'è `DATABASE_URL_TEST` | ~3 s |
| `pnpm build` | build di produzione | ~40 s |
| `pnpm check` | i quattro sopra in fila | ~1 min |
| `pnpm e2e` | Playwright con microfono finto, avvia `pnpm start` da solo | ~1,5 min |

Prima di `pnpm e2e` la prima volta: `pnpm exec playwright install chromium`, e una `pnpm build` aggiornata (il test usa il server di produzione).

Ogni test crea il suo account. In produzione Better Auth limita gli accessi (3 ogni 10 secondi per indirizzo), quindi `pnpm e2e` avvia il server con `AUTH_RATE_LIMIT=off`. Se il server lo avvii tu, avvialo così: `AUTH_RATE_LIMIT=off pnpm start`. In produzione quella variabile non va mai impostata.

Il microfono finto suona `tests/e2e/fixtures/em-am.wav`, generato a ogni giro da `make-wav.mjs`: pennate Karplus-Strong di Em ed Am, 2,4 s l'una, cioè una battuta a 100 bpm.

### Screenshot di tutte le schermate

```bash
pnpm build && AUTH_RATE_LIMIT=off pnpm start &   # oppure pnpm dev
pnpm shots                                       # screenshots/*.png a 1440×960
```

Servono per confrontare il codice con il design: presentazione e accesso da fuori, poi con un account nuovo percorso, tastiera, brani, accordi, impara G, accordatore, questionario, e il brano *A tempo* a metà corsa.

## 5. Il rilascio

La CI (`.github/workflows/ci.yml`) rifà tutto su ogni push a `master`: migrazioni, typecheck, lint, test con Postgres, build, e2e.

Il primo rilascio su Fly.io:

```bash
fly launch --no-deploy
fly postgres create
fly secrets set DATABASE_URL=... BETTER_AUTH_SECRET=$(openssl rand -hex 32)
fly deploy
```

Dopo, `fly deploy` e basta: le migrazioni girano come `release_command` prima che la nuova macchina prenda traffico. `BETTER_AUTH_URL` in `fly.toml` va allineato al dominio vero.

## 6. Quando qualcosa non va

| Sintomo | Causa | Rimedio |
|---|---|---|
| e2e o `pnpm shots`: la registrazione non va avanti | limite degli accessi di Better Auth | server avviato con `AUTH_RATE_LIMIT=off` |
| e2e *A tempo* al 50% | microfono finto sfasato | il test deve stare nel progetto `em-am-timed`, che gira per primo |
| *Serve https* sul bottone del microfono | pagina su http e non su localhost | `localhost:3000`, o `pnpm dev:https` |
| *Microfono bloccato* | permesso negato una volta | impostazioni del sito nel browser, poi ricarica |
| Em letto come E | quinta armonica della corda grave | è già gestito da `harmonicWeight`: se torna, serve un test in `detect.test.ts` |
| Colori della corsia sbagliati | token con `light-dark()` letti senza risolutore | passare da `resolver()` in `highway.ts` |
| Il server non si ferma | `next start` rimasto in ascolto | `fuser -k 3000/tcp` (non `pkill -f "next start"`) |
| `relation does not exist` | migrazioni mancanti | `pnpm db:migrate` |
