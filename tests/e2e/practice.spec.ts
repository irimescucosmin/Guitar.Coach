import { expect, test } from "@playwright/test";

test("step mode moves on each time the microphone hears the expected chord", async ({ page }) => {
  await page.goto("/play/drill-em-am?mode=step");
  await page.getByRole("button", { name: "Avvia" }).click();
  await expect(page.getByText("8/8")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/in media .* s per cambio/)).toBeVisible();
});

test("timed mode scores the bars and saves a record", async ({ page }) => {
  await page.goto("/play/drill-em-am?mode=timed");
  await page.getByRole("button", { name: "Avvia" }).click();
  const result = page.getByText(/% delle battute con l'accordo giusto/);
  await expect(result).toBeVisible({ timeout: 90_000 });
  const percent = Number((await result.textContent())!.match(/(\d+)%/)![1]);
  expect(percent).toBeGreaterThanOrEqual(70);
  // The best result survives a reload: it was saved, not just shown.
  await page.reload();
  await expect(page.getByText("Record · A tempo")).toBeVisible();
});

test("learning a chord counts three clean strums", async ({ page }) => {
  await page.goto("/chords/Em");
  await page.getByRole("button", { name: "Attiva microfono" }).first().click();
  await expect(page.getByText("Imparato: il microfono l'ha sentito pulito 3 volte.")).toBeVisible({ timeout: 60_000 });
});

test("an account keeps what was learned as a guest and syncs to the database", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await page.goto("/chords/Em");
  await page.getByRole("button", { name: "Segna come imparato" }).click();
  await page.goto("/account");
  await page.getByRole("button", { name: "Non hai un account? Creane uno" }).click();
  await page.getByLabel("Nome").fill("Prova");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("una-password-lunga");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.getByRole("link", { name: "Prova" })).toBeVisible();

  // A new browser with no local storage: only the database can know.
  const fresh = await page.context().browser()!.newContext();
  const other = await fresh.newPage();
  await other.goto("/account");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password").fill("una-password-lunga");
  await other.getByRole("button", { name: "Accedi" }).last().click();
  await expect(other.getByRole("link", { name: "Prova" })).toBeVisible();
  await other.goto("/chords");
  await expect(other.getByRole("link", { name: /Em.*Imparato/ })).toBeVisible();
  await fresh.close();
});

test("space bar skips a step even with the Stop button focused", async ({ page }) => {
  await page.goto("/play/drill-g-c-d?mode=step");
  await page.getByRole("button", { name: "Avvia" }).click();
  // The click leaves focus on the button that now reads Ferma.
  await expect(page.getByRole("button", { name: "Ferma" })).toBeFocused();
  await expect(page.getByText("Adesso")).toBeVisible();
  const before = await page.locator(".font-mono.text-5xl").first().textContent();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Ferma" })).toBeVisible();
  await expect(page.locator(".font-mono.text-5xl").first()).not.toHaveText(before!);
});

test("signing out leaves no trace of the account on screen", async ({ page }) => {
  const email = `e2e-out-${Date.now()}@example.test`;
  await page.goto("/account");
  await page.getByRole("button", { name: "Non hai un account? Creane uno" }).click();
  await page.getByLabel("Nome").fill("Uscita");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("una-password-lunga");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.getByRole("link", { name: "Uscita" })).toBeVisible();
  await page.goto("/chords/Am");
  await page.getByRole("button", { name: "Segna come imparato" }).click();
  await expect(page.getByText(/Imparato:/)).toBeVisible();
  // Everything from here on is client-side navigation: a reload would hide the bug.
  await page.getByRole("link", { name: "Uscita" }).click();
  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
  await page.getByRole("link", { name: "Accordi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Accordi" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Am.*Imparato/ })).toHaveCount(0);
  // A guest action now must not save the account's chords in this browser.
  await page.getByRole("link", { name: /^Diagramma di Em/ }).click();
  await page.getByRole("button", { name: "Segna come imparato" }).click();
  await expect(page.getByText(/Imparato:/)).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("guitar-coach:progress"));
  expect(stored ?? "").not.toContain('"Am"');
});
