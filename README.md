# Guitar.Coach

Allenatore di chitarra acustica: impari le note e gli accordi uno alla volta, li suoni sopra un accompagnamento e il microfono ti dice se suonano puliti e quale corda sistemare.

## Cosa fa

- **Questionario** al primo avvio: qualche domanda e una prova al microfono sugli accordi che dici di sapere; il percorso parte da dove sei davvero.
- **Percorso** a lezioni, dalla 0 (le note sulla tastiera) alla 5 (E e A). In alto c'è sempre un solo prossimo passo.
- **Tastiera**: le quattro regole per trovare le note, la mappa fino al 12° tasto, e un esercizio col microfono che dice se la nota è giusta, più su o più giù.
- **Impara un accordo**: diagramma, dita una alla volta, ascolto, tre pennate pulite. Se manca una nota, indica il dito e la corda.
- **Brani** in tre modi, con l'accordo attuale e il prossimo sempre in vista, e una frase su come fare il cambio:
  - *Ascolta*: chitarra guida, basso e batteria;
  - *Passo passo*: il brano aspetta l'accordo giusto;
  - *A tempo*: ogni battuta viene giudicata, il risultato si salva.
- **Accordatore** e test dei cambi in un minuto.
- **Mancino**: i diagrammi si specchiano.
- Da ospite i progressi restano nel browser; con un account vanno su Postgres, e quelli da ospite entrano nell'account al primo accesso.

Brani: tradizionali di pubblico dominio e giri di accordi di canzoni note, mai testi o melodie.

## Avvio in locale

```bash
pnpm install
cp .env.example .env.local     # poi BETTER_AUTH_SECRET=$(openssl rand -hex 32)
docker compose up -d           # Postgres 16 con i due database, oppure vedi docs/SVILUPPO.md
pnpm db:migrate
pnpm dev                       # http://localhost:3000
```

Il microfono richiede `localhost` o HTTPS. Dal telefono: `pnpm dev:https`, dettagli in [`docs/SVILUPPO.md`](docs/SVILUPPO.md).

## Controlli

```bash
pnpm check     # typecheck, lint, test, build
pnpm e2e       # Playwright con il microfono finto di Chromium
pnpm shots     # screenshot di tutte le schermate in screenshots/, a server avviato
```

## Con Claude Code

Apri Claude Code nella cartella del progetto: legge `CLAUDE.md` da solo. In `.claude/` ci sono:

| Comando | Cosa fa |
|---|---|
| `/verifica [e2e]` | tutti i controlli, corregge quello che fallisce |
| `/brano <titolo>` | aggiunge un brano nella lezione giusta, solo accordi per le opere protette |
| `/accordo <nome>` | forma, colore, nome, lezione, riconoscimento provato |
| `/schermata <cosa>` | modifica l'interfaccia seguendo il design e la confronta con gli screenshot |
| `/revisione <scopo>` | revisione indipendente con l'agente `revisore` |
| `/rilascio [fly]` | controlli completi, commit, push, e Fly.io se richiesto |

`.claude/settings.json` permette senza chiedere i comandi di prova e di lettura git, e nega la lettura di `.env.local`. Le impostazioni personali vanno in `.claude/settings.local.json`, che non entra nella repo.

## Documenti

- [`CLAUDE.md`](CLAUDE.md): le convenzioni, per chi scrive e per gli agenti.
- [`docs/STACK.md`](docs/STACK.md): com'è fatta, com'è divisa, con cosa.
- [`docs/SVILUPPO.md`](docs/SVILUPPO.md): avvio, microfono, prove, rilascio, problemi noti.
- [`docs/PERCORSO.md`](docs/PERCORSO.md): cosa insegna l'app e quando un compito è fatto.
- [`docs/DESIGN.md`](docs/DESIGN.md): token, schermate, pezzi riusabili.
- [`docs/ANALISI.md`](docs/ANALISI.md): cosa deve avere l'app, cosa c'è, cosa viene dopo.
