# Cosa deve avere l'app e come aiuta un principiante

Punto di partenza: un principiante assoluto con la chitarra acustica, che vuole migliorare con la costanza, senza scorciatoie. Riferimenti: JustinGuitar, Fender Play, Yousician, Chitarra Facile.

Ogni sezione dice cosa c'è già nell'app e cosa manca. L'ordine in cui farlo è in fondo.

## 1. Le basi che si danno per scontate

- **Postura**: come si tiene la chitarra da seduti, dove appoggia il braccio, la chitarra dritta e non inclinata verso di sé.
- **Mano sinistra**: pollice dietro il manico, dita arcuate, polpastrello vicino al tasto e non sopra.
- **Mano destra e plettro**: come si impugna, quanto deve sporgere, polso morbido, pennata dal polso e non dal braccio.
- **Polpastrelli doloranti**: è normale nelle prime settimane. Sessioni brevi e frequenti, meglio 15 minuti al giorno che 2 ore la domenica.
- **Accordare sempre** prima di suonare: primo passo fisso di ogni sessione.
- **Corde e chitarra**: quando cambiare le corde, come capire se l'action è troppo alta.
- **Ritmo separato dagli accordi**: prima la pennata a vuoto col metronomo contando ad alta voce, poi con gli accordi.
- **Mancini**: chitarra per mancini o destrorsa, con diagrammi specchiati di conseguenza.

C'è già: accordatore, diagrammi da mancino, consigli su pressione, polpastrelli e polso nella pagina di ogni accordo, nota sui polpastrelli nel riepilogo del questionario.
Manca: la lezione su postura e mani, il controllo prima della sessione, la pennata a vuoto col metronomo come esercizio a sé.

## 2. Questionario iniziale e livello

Al primo avvio, poche domande per costruire il percorso:

- Hai mai suonato? Mai, qualche mese, più di un anno.
- Sai il nome delle corde a vuoto?
- Quali accordi conosci? Scelta tra i diagrammi.
- Sai leggere le tablature?
- Con che mano fai la pennata? Che chitarra hai: acustica, classica, elettrica?
- Quanto tempo hai al giorno: 10, 20, 30 minuti.
- Cosa vuoi suonare: accompagnare canzoni, folk e country, fingerstyle.
- Perché: per piacere, per suonare con altri, per una canzone precisa.

Poi una **prova al microfono**: ogni accordo dichiarato si suona una volta. Le risposte si confrontano con quello che il microfono sente.

Da qui l'app sceglie la lezione di partenza, saltando quelle già padroneggiate, la durata della routine e i brani. Il livello si **ricalibra** ogni due settimane sui risultati reali, e la persona può sempre rifare il questionario.

**Fatto** (`/start`, `lib/music/profile.ts`):
- un accordo dichiarato conta come imparato solo se il microfono lo sente pulito; chi salta la prova decide da sé, come con *Segna come imparato*;
- chi sa le corde a vuoto salta la lezione 0;
- chi ha già suonato e ha tutti gli accordi di una lezione ne salta anche gli esercizi; un principiante assoluto li fa sempre;
- dopo 14 giorni il percorso propone di rispondere di nuovo;
- risposte salvate nel browser da ospite, su Postgres con un account (`player_profile`), e quelle da ospite entrano nell'account se non ne ha.

Da fare: usare tempo, stile e obiettivo per la routine e per l'ordine dei brani; ricalibrazione automatica sui risultati, non solo su invito.

## 3. La routine giornaliera

Generata dall'app sul tempo disponibile, per esempio 20 minuti:

1. Accordatura, 1 minuto.
2. Riscaldamento delle dita, ragno ed esercizi cromatici, 3 minuti.
3. Orecchio musicale, 3 minuti.
4. Accordo o tecnica nuova, 5 minuti.
5. Cambi deboli, con il test dei cambi al minuto, 4 minuti.
6. Un brano, 4 minuti.

Con 10 minuti si tengono accordatura, accordo nuovo e cambi; con 30 si allungano cambi e brano e si aggiunge il ripasso.

## 4. Migliorare con la costanza

- **Ripasso mirato**: l'app ricorda quali accordi e quali cambi vengono peggio e li ripropone più spesso.
- **Misure nel tempo**: cambi al minuto per coppia di accordi, precisione in *A tempo*, bpm massimo pulito. Grafico settimanale. La tabella `practice_runs` tiene già ogni prova.
- **Tempo che sale piano**: si aumenta il bpm solo quando il precedente è pulito. C'è già: dopo un *A tempo* superato il prossimo modo è *Più veloce*.
- **Registrarsi**: una registrazione a settimana dello stesso brano, da riascoltare e confrontare.
- **Serie di giorni** e obiettivi settimanali realistici, senza punizioni se si salta un giorno.
- **Brani presto**, anche semplificati, per la motivazione. C'è già: dalla lezione 2.

## 5. Orecchio musicale

Esercizi brevi, a livelli, ognuno sbloccato dal precedente:

1. **Alto o basso**: due note, quale è più acuta.
2. **Corde a vuoto**: riconoscere Mi La Re Sol Si Mi a orecchio, utile per accordare senza accordatore.
3. **Uguale o diverso**: due note o due accordi, sono uguali?
4. **Maggiore o minore**: allegro o triste, prima E contro Em, poi gli altri.
5. **Accordi conosciuti**: l'app ne suona uno tra quelli imparati, lo si indovina.
6. **Cambio nel brano**: si ascolta un giro e si indica quando cambia l'accordo.
7. **Cantare la nota**: il microfono dice se si è intonati.
8. **Intervalli** semplici, più avanti.

Punteggi per esercizio, nel grafico dei progressi. Il sintetizzatore e il riconoscimento dell'altezza (`pitchFromSamples`) ci sono già: servono gli esercizi.

## 6. Teoria minima, quando serve

Note sulla tastiera (c'è: lezione 0), cosa sono tasto e semitono (c'è), cosa rende un accordo maggiore o minore, il capotasto e come cambia la tonalità, la lettura delle tablature e dei simboli ritmici. Sempre collegata a quello che si sta suonando.

## 7. Tecniche dopo i primi accordi

Ritmi di pennata in giù e in su (in parte: `folk`), boom-chick (c'è), accenti, palm mute, arpeggi semplici, primo fingerpicking, capotasto, power chord, primo barré con F semplificato.

## 8. Ordine di sviluppo

| # | Cosa | Stato |
|---|---|---|
| 1 | Questionario e test di livello | fatto |
| 2 | Routine giornaliera | da fare |
| 3 | Orecchio musicale, livelli 1-5 | da fare |
| 4 | Ripasso mirato e grafico dei progressi | da fare |
| 5 | Lezione su postura e mani | da fare |
| 6 | Registrazione settimanale | da fare |
| 7 | Tecniche e teoria | da fare |
