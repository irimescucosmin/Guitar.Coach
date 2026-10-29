# Guitar.Coach

Allenatore di chitarra acustica: impari le note e gli accordi uno alla volta, li suoni sopra un accompagnamento e il microfono ti dice se suonano puliti e quale corda sistemare.

## Cosa fa

- **Questionario** al primo avvio: qualche domanda e una prova al microfono sugli accordi che dici di sapere; il percorso parte da dove sei davvero.
- **Oggi**: la pratica del giorno sui minuti che hai: accordatura, riscaldamento, prossimo passo, il cambio che ti viene peggio, un brano. Niente si spunta a mano: ogni attività la segna il microfono o il risultato salvato. Conta i giorni di fila.
- **Orecchio musicale**: cinque livelli, dall'alto o basso a riconoscere gli accordi che conosci.
- **Percorso** a lezioni, dalla 0 (le note sulla tastiera) alla 5 (E e A). In alto c'è sempre un solo prossimo passo.
- **Le basi** per chi parte da zero: come si tiene la chitarra, le mani, il plettro, come si legge un diagramma; e tre guide da stampare o salvare in PDF, costruite sul tuo percorso: le basi, la scheda della lezione in corso, la settimana.
- **Tastiera**: le quattro regole per trovare le note, la mappa fino al 12° tasto, e un esercizio col microfono che dice se la nota è giusta, più su o più giù.
- **Impara un accordo**: diagramma, dita una alla volta, ascolto, tre pennate pulite sentite dal microfono. Se manca una nota, indica il dito e la corda.
- **Brani** in tre modi, con l'accordo attuale e il prossimo sempre in vista, e una frase su come fare il cambio:
  - *Ascolta*: chitarra guida, basso e batteria;
  - *Passo passo*: il brano aspetta l'accordo giusto;
  - *A tempo*: ogni battuta viene giudicata, il risultato si salva.
- **Accordatore** e test dei cambi in un minuto.
- **Insegnante**: una domanda alla volta a un modello Claude che conosce solo i tuoi risultati nell'app, 20 al giorno; nei Progressi scrive la settimana in due frasi. Serve una chiave API, altrimenti è spento.
- **Community**: pubblichi un giro di accordi con una procedura guidata (di un brano protetto solo gli accordi, mai il testo). Resta una bozza finché non lo superi a tempo; poi gli altri lo suonano, e lo possono segnalare.
- **Aiuto**: i problemi tipici (corde che ronzano, dita che fanno male, cambi lenti, plettro, tempo, dolore) con il perché e cosa fare. Quando il microfono segnala un problema, il link porta alla spiegazione.
- **Mancino**: i diagrammi si specchiano.
- **Gratis, con account**: l'account serve solo a tenere traccia dei progressi su ogni dispositivo. Email e password, oppure Google o Apple se configurati.
- **Presentazione** pubblica su `/`, con l'elenco dei brani liberi da suonare.

Brani: tradizionali di pubblico dominio e giri di accordi di canzoni note, mai testi o melodie.

## Avvio in locale

```bash
pnpm install
cp .env.example .env.local     # poi BETTER_AUTH_SECRET=$(openssl rand -hex 32)
docker compose up -d           # Postgres 16 con i due database, oppure vedi docs/SVILUPPO.md
pnpm db:migrate
pnpm dev                       # http://localhost:3000, poi "Crea un account"
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
- [`docs/PROBLEMI.md`](docs/PROBLEMI.md): i problemi tipici di chi inizia e cosa fare, con le fonti.
