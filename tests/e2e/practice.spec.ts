import { expect, test, type Page } from "@playwright/test";

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
  await page.getByRole("button", { name: "Avvia" }).click();
  const result = page.getByText(/% delle battute con l'accordo giusto/);
  await expect(result).toBeVisible({ timeout: 90_000 });
  const percent = Number((await result.textContent())!.match(/(\d+)%/)![1]);
  expect(percent).toBeGreaterThanOrEqual(37);
  expect(percent).toBeLessThanOrEqual(63);
  await expect(page.getByText(/Da ripassare: Am \(\d+\)/)).toBeVisible();
  // The best result survives a reload: it was saved, not just shown.
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
  await expect(page.getByRole("heading", { name: "Suona le sei corde a vuoto" })).toBeVisible();
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
  // Doing the ear round from the plan is what ticks it.
  await page.getByRole("link", { name: "Allena l'orecchio" }).click();
  await page.getByRole("button", { name: "Inizia" }).first().click();
  for (let i = 0; i < 10; i++) {
    await page.getByRole("group", { name: "Risposte" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 9 ? "Vedi il risultato" : "Avanti" }).click();
  }
  await expect(page.getByText(/giuste su 10\./)).toBeVisible();
  await page.getByRole("link", { name: "Oggi", exact: true }).click();
  await expect(page.getByText("1/4")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1/4")).toBeVisible();
  await expect(page.getByText("giorno di fila")).toBeVisible();
});

test("an ear round of ten questions saves its score and opens the next level", async ({ page }) => {
  await signUp(page);
  await page.goto("/ear");
  await expect(page.getByRole("heading", { level: 1, name: "Allena l'orecchio" })).toBeVisible();
  await expect(page.getByText("Si apre con 8 su 10 al livello 1.")).toBeVisible();
  await page.getByRole("button", { name: "Inizia" }).first().click();
  // The test cannot hear: it reads the right answer back after a first guess and keeps score honest.
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`domanda ${i + 1} di 10`)).toBeVisible();
    await page.getByRole("group", { name: "Risposte" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 9 ? "Vedi il risultato" : "Avanti" }).click();
  }
  await expect(page.getByText(/giuste su 10\./)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Record \d+%|Superato/).first()).toBeVisible();
});
