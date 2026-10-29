import { expect, test, type Page } from "@playwright/test";
import { earRound } from "../../src/lib/music/ear";

const PASSWORD = "una-password-lunga";

/** Learning needs the microphone: the fake one plays Em and Am, so those are the chords a test can learn. */
async function learnByEar(page: Page, chord: "Em" | "Am") {
  await page.goto(`/chords/${chord}`);
  await page.getByRole("button", { name: "Attiva microfono" }).first().click();
  await expect(page.getByText("Imparato: il microfono l'ha sentito pulito 3 volte.")).toBeVisible({ timeout: 60_000 });
}

/** Every screen needs an account: a fresh one per test, so tests never share progress. */
async function signUp(page: Page, name = "Prova"): Promise<string> {
  const email = `e2e-${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
  await page.goto("/account?mode=signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Crea account" }).click();
  // A new account starts from the questions.
  await expect(page).toHaveURL(/\/start$/);
  return email;
}

/**
 * The same, through the API: no screens, so the time from the browser's start
 * to the first click stays short. The timed test needs that, see its comment.
 */
/** Answers a round of the given level and seed, right or wrong on purpose. Starts it from the level card unless told not to. */
async function answerEarRound(page: Page, level: 1 | 2 | 3 | 4 | 5, seed: number, right: boolean, start = true) {
  const labels: Record<string, string> = { first: "La prima", second: "La seconda", same: "Uguali", different: "Diversi" };
  if (start) await page.locator(`#level-${level}`).getByRole("button", { name: /Inizia|Ripeti/ }).click();
  const questions = earRound(level, ["Em", "Am"], seed);
  for (const [i, q] of questions.entries()) {
    const pick = right ? q.answer : q.options.find((o) => o !== q.answer)!;
    await page.getByRole("group", { name: "Risposte" }).getByRole("button", { name: labels[pick] ?? pick, exact: true }).click();
    await page.getByRole("button", { name: i === questions.length - 1 ? "Vedi il risultato" : "Avanti" }).click();
  }
}

async function signUpQuickly(page: Page): Promise<void> {
  const base = test.info().project.use.baseURL ?? "http://localhost:3000";
  const email = `e2e-quick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
  const response = await page.request.post(`${base}/api/auth/sign-up/email`, {
    data: { email, password: PASSWORD, name: "Prova" },
    headers: { origin: base },
  });
  expect(response.ok()).toBe(true);
}

test("a visitor sees the presentation, and the app asks for an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("un accordo alla volta");
  await expect(page.getByRole("heading", { name: /brani liberi da suonare/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /When the Saints Go Marching In/ })).toBeVisible();
  await page.goto("/path");
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/play/drill-em-am?mode=step");
  await expect(page).toHaveURL(/\/account$/);
});

test("step mode moves on each time the microphone hears the expected chord", async ({ page }) => {
  await signUp(page);
  await page.goto("/play/drill-em-am?mode=step");
  await page.getByRole("button", { name: "Avvia" }).click();
  await expect(page.getByText(/8\/8 cambi giusti/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/In media .* s per cambio/)).toBeVisible();
});

test("timed mode scores the bars and saves a record", { tag: "@own-browser" }, async ({ page }) => {
  // This browser's microphone only plays Em: the drill's Em bars must count,
  // its Am bars must not. Half right, whatever the timing.
  await signUpQuickly(page);
  await page.goto("/play/drill-em-am?mode=timed");
  // The result is saved by a server action, a POST to this page carrying the run, sent when it ends.
  // Other actions post to the same page (today's routine on load): match the run itself.
  const saved = page.waitForResponse(
    (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"mode":"timed"'),
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Avvia" }).click();
  const result = page.getByText(/% delle battute con l'accordo giusto/);
  await expect(result).toBeVisible({ timeout: 90_000 });
  const percent = Number((await result.textContent())!.match(/(\d+)%/)![1]);
  expect(percent).toBeGreaterThanOrEqual(37);
  expect(percent).toBeLessThanOrEqual(63);
  await expect(page.getByText(/Da ripassare: Am \(\d+\)/)).toBeVisible();
  // The best result survives a reload: it was saved, not just shown. Wait for the save to land first.
  await saved;
  await page.reload();
  await expect(page.getByText(/Record \d+%/)).toBeVisible();
});

test("learning a chord counts three clean strums", async ({ page }) => {
  await signUp(page);
  await page.goto("/chords/Em");
  await page.getByRole("button", { name: "Attiva microfono" }).first().click();
  await expect(page.getByText("Imparato: il microfono l'ha sentito pulito 3 volte.")).toBeVisible({ timeout: 60_000 });
});

test("progress belongs to the account and follows it to another browser", async ({ page }) => {
  const email = await signUp(page);
  await learnByEar(page, "Em");

  // A new browser with nothing stored: only the database can know.
  const fresh = await page.context().browser()!.newContext();
  const other = await fresh.newPage();
  await other.goto("/account");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password").fill(PASSWORD);
  await other.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(other).toHaveURL(/\/today$/);
  await other.goto("/chords");
  await expect(other.getByRole("link", { name: /Em.*Imparato/ })).toBeVisible();
  await fresh.close();
});

test("space bar skips a step even with the Stop button focused", async ({ page }) => {
  await signUp(page);
  await page.goto("/play/drill-g-c-d?mode=step");
  await page.getByRole("button", { name: "Avvia" }).click();
  // The click leaves focus on the button that now reads Ferma.
  await expect(page.getByRole("button", { name: "Ferma" })).toBeFocused();
  const now = page.getByRole("region", { name: "Adesso" });
  await expect(now).toBeVisible();
  const before = await now.textContent();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Ferma" })).toBeVisible();
  await expect(now).not.toHaveText(before!);
});

test("signing out leaves no trace of the account on screen", async ({ page }) => {
  await signUp(page, "Uscita");
  await learnByEar(page, "Am");
  // Client-side navigation from here: a reload would hide a stale screen.
  await page.getByRole("link", { name: "Uscita", exact: true }).click();
  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page.getByRole("button", { name: "Accedi", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Torna alla presentazione" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("un accordo alla volta");
  await page.goto("/chords");
  await expect(page).toHaveURL(/\/account$/);
});

test("the path starts from the notes, and the fretboard page teaches them", async ({ page }) => {
  await signUp(page);
  await page.goto("/path");
  await expect(page.getByRole("heading", { name: "Le note sulla tastiera" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Tastiera", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Le note sulla tastiera" })).toBeVisible();
  await page.getByRole("button", { name: /^Sol/ }).click();
  await expect(page.getByText(/Il Sol \(G\) sta in \d+ punti/)).toBeVisible();
});

test("the questionnaire hears the declared chords and starts the path past them", async ({ page }) => {
  await signUp(page);
  const next = page.getByRole("button", { name: "Avanti", exact: true });
  await page.getByText("Qualche mese").click();
  await next.click();
  await page.getByText("Sì", { exact: true }).click();
  await next.click();
  // The chord grid: Em and Am, the two the fake microphone plays.
  await page.getByRole("checkbox", { name: /^Em/ }).check({ force: true });
  await page.getByRole("checkbox", { name: /^Am/ }).check({ force: true });
  await next.click();
  for (const answer of ["Un po'", "Destra", "Acustica", "20 minuti", "Folk e country", "Per piacere mio"]) {
    await page.getByText(answer, { exact: true }).click();
    await next.click();
  }
  // "I know the open strings" must be played: the fake microphone plays chords, not single strings.
  await expect(page.getByRole("heading", { name: "Suona le corde a vuoto che ti chiedo" })).toBeVisible();
  await page.getByRole("button", { name: "Attiva microfono" }).click();
  await page.getByRole("button", { name: "Non riesco, avanti" }).click();
  // The chords it does play are heard and placed.
  await expect(page.getByRole("heading", { name: "Suona gli accordi che conosci" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ecco da dove parti" })).toBeVisible({ timeout: 60_000 });
  // Not proven, not skipped: lesson 0 stays. Em and Am were heard: lesson 1 is behind.
  await expect(page.getByText("Lezione 0: Le note sulla tastiera")).toBeVisible();
  await page.getByRole("button", { name: "Inizia il percorso" }).click();
  await expect(page.getByText("Il percorso parte dalle tue risposte.")).toBeVisible();
  // Saved in the account, not only on screen.
  await page.reload();
  await expect(page.getByText("Completata")).toBeVisible();
});

test("today's practice ticks only what was proven, and remembers it", async ({ page }) => {
  await signUp(page);
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1, name: "Oggi" })).toBeVisible();
  // No answers yet: the questions come first, the plan is the default twenty minutes.
  await expect(page.getByRole("link", { name: "Rispondi alle domande" })).toBeVisible();
  await expect(page.getByText(/20 minuti, 4 attività/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accorda la chitarra" })).toBeVisible();
  // Nothing to tick by hand.
  await expect(page.getByRole("button", { name: /Segna/ })).toHaveCount(0);
  await expect(page.getByText("0/4")).toBeVisible();
  // Doing the ear round from the plan is what ticks it, and only a round that beats guessing.
  // A fixed seed: the test cannot hear, so it computes the answers the same way the app does.
  await page.goto("/ear?level=1&seed=4242");
  await answerEarRound(page, 1, 4242, true);
  await expect(page.getByText("10 giuste su 10.")).toBeVisible();
  await page.getByRole("link", { name: "Oggi", exact: true }).click();
  await expect(page.getByText("1/4")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1/4")).toBeVisible();
  await expect(page.getByText("giorno di fila")).toBeVisible();
});

test("an ear round saves its score, a passed round opens the next level, a guessed one does not", async ({ page }) => {
  await signUp(page);
  await page.goto("/ear?seed=7");
  await expect(page.getByRole("heading", { level: 1, name: "Allena l'orecchio" })).toBeVisible();
  await expect(page.getByText("Si apre con 8 su 10 al livello 1.")).toBeVisible();
  // All wrong: saved, nothing opens.
  await answerEarRound(page, 1, 7, false);
  await expect(page.getByText("0 giuste su 10.")).toBeVisible();
  await expect(page.getByText("Si apre con 8 su 10 al livello 1.")).toBeVisible();
  // All right: level 2 opens, and stays open after a reload.
  await page.getByRole("button", { name: "Rifai il giro" }).click();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"ear-1"'));
  await answerEarRound(page, 1, 7, true, false);
  await expect(page.getByText("Superato: si apre il livello 2.")).toBeVisible();
  await saved;
  await page.reload();
  await expect(page.getByText("Si apre con 8 su 10 al livello 1.")).toHaveCount(0);
});

test("the help page explains common problems, opens one from a link and finds them by word", async ({ page }) => {
  await signUp(page);
  await page.goto("/help#p-pain");
  await expect(page.getByRole("heading", { level: 1, name: "Aiuto" })).toBeVisible();
  await expect(page.getByText("Se senti formicolio, intorpidimento o un dolore che resta: fermati e senti un medico.")).toBeVisible();
  await page.getByLabel("Cerca: ronza, dita, cambi, plettro…").fill("plettro");
  await expect(page.getByText("Il plettro scivola o si incastra")).toBeVisible();
  await expect(page.getByText("Le corde ronzano")).toHaveCount(0);
});

test("the progress page shows the numbers, what to review and a chart once there is a result", async ({ page }) => {
  await signUp(page);
  await learnByEar(page, "Em");
  await learnByEar(page, "Am");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { level: 1, name: "Progressi" })).toBeVisible();
  await expect(page.getByText("2/8")).toBeVisible();
  // Em and Am learned, their change never measured: the first thing to review.
  await expect(page.getByText("Cambio Em ↔ Am: non l'hai ancora misurato.")).toBeVisible();
  await expect(page.getByText("Ancora nessun brano suonato a tempo.")).toBeVisible();
});

test("the teacher page says plainly when the model is not configured", async ({ page }) => {
  await signUp(page);
  await page.goto("/coach");
  await expect(page.getByRole("heading", { level: 1, name: "Insegnante" })).toBeVisible();
  await expect(page.getByText(/manca la chiave per il modello/)).toBeVisible();
  await page.getByRole("link", { name: "Vai all'Aiuto" }).click();
  await expect(page).toHaveURL(/\/help$/);
});

test("the basics page and the printable sheets are built from the player's own path", async ({ page }) => {
  await signUp(page);
  await page.goto("/basics");
  await expect(page.getByRole("heading", { level: 1, name: "Le basi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Come si legge un diagramma" })).toBeVisible();
  // Lesson 0 on the sheet: the open strings, no chords yet.
  await page.goto("/print/lesson");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lezione 0");
  await expect(page.getByText("Le sei corde a vuoto, dalla più grossa")).toBeVisible();
  await page.goto("/print/week?from=2026-10-29");
  await expect(page.getByRole("heading", { level: 1, name: "La settimana" })).toBeVisible();
  await expect(page.getByText("giovedì 29 ottobre")).toBeVisible();
  await expect(page.getByText("Accorda la chitarra")).toHaveCount(7);
});

test("a published song is a draft until its author passes it in time, then it is among the songs", { tag: "@own-browser" }, async ({ page }) => {
  test.setTimeout(240_000);
  await signUpQuickly(page);
  // A title of its own: the database may hold songs from earlier runs.
  const title = `Giro di Mi ${Date.now().toString(36)}`;
  await page.goto("/songs");
  await page.getByRole("link", { name: "Pubblica un brano" }).click();
  const next = page.getByRole("button", { name: "Avanti", exact: true });
  // Step 1: what it is. Step 2: title and source; a line of lyrics is refused.
  await expect(page.getByRole("heading", { name: "Che brano è?" })).toBeVisible();
  await next.click();
  await page.getByLabel("Titolo").fill("oh oh oh la la la na na na hey hey hey yeah");
  await page.getByLabel("Da dove viene").fill("Tradizionale");
  await expect(page.getByText("Sembra una riga di testo")).toBeVisible();
  await page.getByLabel("Titolo").fill(title);
  await next.click();
  // Step 3: the rhythm. Step 4: the bars, seven Em and one Am, the chords this microphone can prove.
  await expect(page.getByRole("heading", { name: "Che ritmo ha?" })).toBeVisible();
  await next.click();
  const bars = page.getByRole("list", { name: "Battute" });
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "+ battuta" }).click();
  for (let i = 1; i <= 8; i++) await bars.getByLabel(`Battuta ${i}`).selectOption(i === 8 ? "Am" : "Em");
  await next.click();
  await expect(page.getByText("Accordi usati: Em (Mi minore), Am (La minore)")).toBeVisible();
  await page.getByRole("button", { name: "Salva la bozza" }).click();
  // Saved as a draft: it opens in listen mode, and only its author sees it, above the table.
  await expect(page).toHaveURL(/\/play\/c-[a-z0-9]+\?mode=listen$/);
  const songId = page.url().match(/\/play\/(c-[a-z0-9]+)/)![1]!;
  await page.goto("/songs");
  const mine = page.getByRole("listitem").filter({ hasText: title });
  await expect(mine.getByText("Bozza")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);

  const fresh = await page.context().browser()!.newContext();
  const other = await fresh.newPage();
  await signUpQuickly(other);
  await other.goto("/songs");
  await expect(other.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  const hidden = await other.goto(`/play/${songId}?mode=listen`);
  expect(hidden?.status()).toBe(404);

  // Passing it in time is what publishes it: Em bars count, the one Am bar does not.
  await page.getByRole("link", { name: "Superalo a tempo per pubblicarlo" }).click();
  const saved = page.waitForResponse(
    (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"mode":"timed"'),
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Avvia" }).click();
  await expect(page.getByText(/% delle battute con l'accordo giusto/)).toBeVisible({ timeout: 90_000 });
  await saved;
  // Published: a row in the table like any other, with who published it; the draft list is gone.
  await page.goto("/songs");
  await expect(mine).toHaveCount(0);
  await page.getByRole("button", { name: /^Tutti/ }).click();
  await expect(page.getByRole("row").filter({ hasText: title })).toContainText("pubblicato da Prova");
  // Points are read off the same fact: one song published, the first milestone, in Progress.
  await page.goto("/progress");
  await expect(page.getByRole("region", { name: "punti" })).toContainText("10");
  await expect(page.getByRole("region", { name: "punti" })).toContainText("Primo brano");
  // The other player finds it among the songs, filtered by who published.
  await other.goto("/songs");
  await other.getByRole("button", { name: /Pubblicati da chi suona qui/ }).click();
  const theirs = other.getByRole("row").filter({ hasText: title });
  await expect(theirs).toContainText("pubblicato da Prova");
  await theirs.getByRole("button", { name: "Segnala" }).click();
  await theirs.getByRole("button", { name: "Contiene un testo protetto" }).click();
  await expect(theirs.getByText("Grazie, segnalazione ricevuta.")).toBeVisible();

  // The other player passes it in time too: the author hears about it in the bell.
  await other.goto(`/play/${songId}?mode=timed`);
  const otherSaved = other.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"mode":"timed"'), { timeout: 120_000 });
  await other.getByRole("button", { name: "Avvia" }).click();
  await expect(other.getByText(/% delle battute con l'accordo giusto/)).toBeVisible({ timeout: 90_000 });
  await otherSaved;
  await page.goto("/songs");
  await expect(page.getByRole("link", { name: /^Notifiche: 2 da leggere/ })).toBeVisible();
  await page.getByRole("link", { name: /^Notifiche/ }).click();
  await expect(page.getByText(`Prova ha superato a tempo il tuo brano "${title}".`)).toBeVisible();
  await expect(page.getByText(`Il tuo brano "${title}" è pubblicato`)).toBeVisible();
  await page.goto("/songs");
  await expect(page.getByRole("link", { name: "Notifiche", exact: true })).toBeVisible();

  // A message from the song's row: refused with a contact, sent without; the author sees the envelope and answers.
  await other.goto("/songs");
  await other.getByRole("button", { name: /^Tutti/ }).click();
  await other.getByRole("row").filter({ hasText: title }).getByRole("link", { name: "Scrivi a Prova" }).click();
  await expect(other.getByRole("heading", { level: 1, name: "Prova" })).toBeVisible();
  await other.getByLabel("Scrivi un messaggio").fill("scrivimi a prova@example.com");
  await other.getByRole("button", { name: "Invia" }).click();
  await expect(other.getByText("Niente email o numeri di telefono: la conversazione resta nell'app.")).toBeVisible();
  await other.getByLabel("Scrivi un messaggio").fill("Bel giro! A che bpm lo suoni?");
  await other.getByRole("button", { name: "Invia" }).click();
  await expect(other.getByRole("list", { name: "Conversazione" })).toContainText("Bel giro! A che bpm lo suoni?");
  await page.goto("/songs");
  await page.getByRole("link", { name: /^Messaggi: 1 da leggere/ }).click();
  await page.locator("a[href^='/messages/']").first().click();
  await expect(page.getByRole("list", { name: "Conversazione" })).toContainText("Bel giro! A che bpm lo suoni?");
  await page.getByLabel("Scrivi un messaggio").fill("A 90, per ora.");
  await page.getByRole("button", { name: "Invia" }).click();
  await expect(page.getByRole("list", { name: "Conversazione" })).toContainText("A 90, per ora.");
  await fresh.close();
});

test("a run can be recorded, and the week's recording is heard in Progress", async ({ page }) => {
  await signUp(page);
  await page.goto("/play/drill-em-am?mode=step");
  await page.getByLabel("Registra l'esecuzione").check();
  await expect(page.getByText("Una a settimana, al massimo tre minuti")).toBeVisible();
  const uploaded = page.waitForResponse((r) => r.url().endsWith("/api/recordings") && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: "Avvia" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sto registrando." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/8\/8 cambi giusti/)).toBeVisible({ timeout: 60_000 });
  expect((await uploaded).ok()).toBe(true);
  await expect(page.getByText("Registrazione della settimana salvata.")).toBeVisible();
  await page.getByRole("link", { name: "Riascoltala" }).click();
  await expect(page.getByRole("heading", { name: "Le tue registrazioni" })).toBeVisible();
  const player = page.locator("audio").first();
  await expect(player).toHaveAttribute("src", /\/api\/recordings\/[0-9a-f-]{36}$/);
  // The audio is served to its owner, as the type the browser recorded.
  const src = await player.getAttribute("src");
  const res = await page.request.get(src!);
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"]).toMatch(/^audio\//);
  expect(Number(res.headers()["content-length"])).toBeGreaterThan(1000);
});

test("the techniques page writes out the strums, works the capo out, and listens for an arpeggio", async ({ page }) => {
  await signUp(page);
  await page.goto("/techniques");
  await expect(page.getByRole("heading", { level: 1, name: "Tecniche" })).toBeVisible();
  // Nothing learned: a strum is tried in a song once its chords are there, the arpeggio needs a chord.
  await expect(page.getByText("Per provarla in Skip to My Lou manca un accordo:")).toBeVisible();
  await expect(page.getByText("Per l'arpeggio serve un accordo imparato.")).toBeVisible();
  // The capo: G shapes sounding in A is the second fret, and Em sounds as F#m.
  await page.getByLabel("Forme che suoni").selectOption("7");
  await page.getByLabel("Tonalità che vuoi sentire").selectOption("9");
  await expect(page.locator("#capo")).toContainText(/2\s*tasti/);
  await expect(page.locator("#capo").getByRole("cell", { name: "F#m", exact: true })).toBeVisible();
  await page.getByLabel("Tonalità che vuoi sentire").selectOption("7");
  await expect(page.getByText("Stessa tonalità: senza capotasto.")).toBeVisible();

  // With Em learned the arpeggio drill opens on it and names the six strings to play in order.
  await learnByEar(page, "Em");
  await page.goto("/techniques#arpeggio");
  await expect(page.getByLabel("Accordo")).toHaveValue("Em");
  await page.getByRole("button", { name: "Ascolta l'arpeggio" }).click();
  const strings = page.getByRole("list", { name: "Corde da suonare" }).getByRole("listitem");
  await expect(strings).toHaveCount(6);
  await expect(strings.first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("button", { name: "Suona le corde in ordine..." })).toBeDisabled();
});
