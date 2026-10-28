# Guitar.Coach

Allenatore di chitarra acustica: impari gli accordi uno alla volta, li suoni sopra un accompagnamento e il microfono ti dice se suonano puliti e quale corda sistemare.

## Cosa fa

- **Percorso** a lezioni: ogni lezione aggiunge gli accordi che servono a un gruppo di canzoni. In alto c'è sempre un solo prossimo passo.
- **Impara un accordo**: diagramma con le dita, posizionamento un dito alla volta, ascolto dell'accordo, e il microfono che conta tre pennate pulite. Se manca una nota, indica la corda e il dito da sistemare.
- **Suona** in tre modi, sempre con l'accordo attuale e quello dopo in vista:
  - *Ascolta*: accompagnamento completo (chitarra guida, basso, batteria) e gli accordi che scorrono;
  - *Passo passo*: il brano aspetta finché il microfono non sente l'accordo giusto;
  - *A tempo*: suoni con basso e batteria, ogni battuta viene giudicata, il risultato si salva.
- **Strumenti**: accordatore e test dei cambi in un minuto.
- **Mancino**: i diagrammi si specchiano.
- Come ospite i progressi restano nel browser; con un account si salvano su Postgres e quelli da ospite entrano nell'account al primo accesso.

Brani: tradizionali di pubblico dominio e giri di accordi di canzoni note, mai testi o melodie.

## Avvio in locale

```bash
pnpm install
cp .env.example .env.local   # poi riempi BETTER_AUTH_SECRET
createdb guitar_coach && createdb guitar_coach_test
pnpm db:migrate
pnpm dev
```

Il microfono richiede `localhost` o HTTPS. Le cuffie servono solo se accendi la chitarra guida in *A tempo*.

## Controlli prima di consegnare

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e
```

`pnpm test` salta i test su Postgres se manca `DATABASE_URL_TEST`. `pnpm e2e` usa il microfono finto di Chromium che suona un WAV generato, vedi `tests/e2e/`.

## Documenti

- [`docs/STACK.md`](docs/STACK.md): com'è fatta, com'è divisa, con cosa.
- [`CLAUDE.md`](CLAUDE.md): le convenzioni, per chi scrive e per gli agenti.
