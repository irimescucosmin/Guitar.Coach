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

Senza account l'app funziona da ospite, con i progressi nel `localStorage`. Il database serve per gli account e per i test `*.db.test.ts`.

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

Il microfono finto suona `tests/e2e/fixtures/em-am.wav`, generato a ogni giro da `make-wav.mjs`: pennate Karplus-Strong di Em ed Am, 2,4 s l'una, cioè una battuta a 100 bpm.

### Screenshot di tutte le schermate

```bash
pnpm build && pnpm start &  # oppure pnpm dev
pnpm shots                  # screenshots/*.png a 1440×960
```

Servono per confrontare il codice con il design: percorso, tastiera, brani, accordi, impara G, accordatore, accesso, e il brano *A tempo* a metà corsa.

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
| *Serve https* sul bottone del microfono | pagina su http e non su localhost | `localhost:3000`, o `pnpm dev:https` |
| *Microfono bloccato* | permesso negato una volta | impostazioni del sito nel browser, poi ricarica |
| Em letto come E | quinta armonica della corda grave | è già gestito da `harmonicWeight`: se torna, serve un test in `detect.test.ts` |
| Colori della corsia sbagliati | token con `light-dark()` letti senza risolutore | passare da `resolver()` in `highway.ts` |
| e2e *A tempo* al 50% | microfono finto sfasato di una battuta | il test deve stare nel progetto `em-am-timed` |
| Il server non si ferma | `next start` rimasto in ascolto | `fuser -k 3000/tcp` (non `pkill -f "next start"`) |
| `relation does not exist` | migrazioni mancanti | `pnpm db:migrate` |
