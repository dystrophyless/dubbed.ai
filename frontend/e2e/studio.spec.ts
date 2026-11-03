import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — recording studio, high-fi prototype (/prototypes/studio/turn). Runs in both projects (1440 × 900, 390 × 844):
 * every state with axe, no horizontal scroll and the key actions inside the viewport; the record → saved → next flow;
 * auto-stop; keyboard shortcuts; the exit dialog; portrait clips; long scenes; RU; reduced motion; Build the result → the
 * result page; re-record mode (opened from the result).
 */
const URL = "/prototypes/studio/turn";

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/** fully visible without scrolling (and the label is not clipped) */
async function expectInViewport(page: Page, el: Locator) {
  await expect(el).toBeVisible();
  const { width, height } = page.viewportSize()!;
  const box = (await el.boundingBox())!;
  const what = `${el} at ${JSON.stringify(box)}`;
  expect(box.x, what).toBeGreaterThanOrEqual(0);
  expect(box.y, what).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, what).toBeLessThanOrEqual(width);
  expect(box.y + box.height, what).toBeLessThanOrEqual(height);
  expect(await el.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
}

const btn = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

type Check = (page: Page) => Promise<void>;
const STATES: Record<string, Check> = {
  "no-take": async (page) => {
    await expectInViewport(page, btn(page, "Original"));
    await expectInViewport(page, btn(page, "Record"));
    // owner 2026-11-03: no "Up to N s" hint before recording
    await expect(page.getByText("Up to 4.4 s")).toHaveCount(0);
    await expect(btn(page, "Next")).toBeHidden();
    await expect(page.getByText("Record a take to continue")).toHaveCount(0);
    await expectInViewport(page, btn(page, "Previous turn"));
  },
  arrival: async (page) => {
    await expect(btn(page, "Original")).toHaveAttribute("aria-pressed", "true");
    await expectInViewport(page, btn(page, "Record"));
    await expect(btn(page, "Next")).toBeHidden();
  },
  recording: async (page) => {
    await expectInViewport(page, btn(page, "Stop"));
    await expect(page.getByText("1.5 s left")).toBeVisible();
    await expect(page.getByTestId("stage-muted")).toBeVisible();
    // owner 2026-11-03: the row keeps its shape — Original and Previous stay, disabled; the time sits in the track
    await expect(btn(page, "Original")).toBeDisabled();
    await expect(btn(page, "Previous turn")).toBeDisabled();
    await expect(btn(page, "Next")).toHaveCount(0); // first take: there is no Next yet
    await expect(page.getByTestId("audio-track").getByTestId("record-hint")).toHaveText("1.5 s left");
    await expect(page.getByTestId("audio-track")).toHaveAttribute("data-mode", "recording");
  },
  saving: async (page) => {
    await expectInViewport(page, btn(page, "Stop"));
    await expect(btn(page, "Stop")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("record-hint")).toHaveText("Saving take…");
  },
  saved: async (page) => {
    for (const name of ["Previous turn", "Original", "My take", "Record again", "Next"]) await expectInViewport(page, btn(page, name));
    await expect(page.getByTestId("record-hint")).toHaveCount(0);
  },
  "playing-take": async (page) => {
    await expect(btn(page, "My take")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("stage-take")).toBeVisible();
    await expectInViewport(page, btn(page, "Next"));
  },
  last: async (page) => {
    await expect(page.getByText("Turn 12 of 12")).toBeAttached();
    await expectInViewport(page, btn(page, "Build the result"));
    await expectInViewport(page, btn(page, "Record again"));
  },
  "exit-unsaved": async (page) => {
    const dialog = page.getByRole("dialog", { name: "Leave with an unsaved take?" });
    await expect(dialog).toBeVisible();
    for (const name of ["Stay", "Leave without saving", "Save and leave"]) await expectInViewport(page, dialog.getByRole("button", { name, exact: true }));
  },
  "mic-blocked": async (page) => {
    await expect(page.getByText("Your microphone is blocked")).toBeVisible();
    await expect(btn(page, "Record")).toBeDisabled();
    await expect(btn(page, "Record")).toHaveAccessibleDescription(/lock next to the site address/);
    await expectInViewport(page, btn(page, "Record"));
    await expectInViewport(page, btn(page, "Try again"));
    await expect(page.getByRole("link", { name: "Microphone settings" })).toBeVisible();
  },
  loading: async (page) => {
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("studio-actions-loading")).toBeVisible();
    await expect(btn(page, "Record")).toHaveCount(0);
  },
};

for (const [state, check] of Object.entries(STATES)) {
  test(`studio · ${state}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(`${URL}?state=${state}`);
    await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
    await expectInViewport(page, page.getByRole("button", { name: "Exit studio" }));
    await expectInViewport(page, page.getByRole("button", { name: "Original voice volume" }));
    if (state !== "last") await expect(page.getByText("Turn 3 of 12")).toBeAttached();
    await expect(page.getByTestId("turn-dots").locator("[aria-hidden=true]").first()).toBeAttached();
    await check(page);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

for (const state of ["no-take", "recording", "saved", "mic-blocked"]) {
  test(`studio · portrait · ${state}`, async ({ page }) => {
    await page.goto(`${URL}?state=${state}&ratio=portrait`);
    const main = state === "recording" ? "Stop" : state === "saved" ? "Next" : "Record";
    await expectInViewport(page, btn(page, main));
    if (state === "saved") await expectInViewport(page, btn(page, "Record again"));
    // owner 2026-11-03: the stage is always 2.35:1; a 9:16 clip sits centred in it as a card at (almost) full height
    const frame = (await page.getByTestId("studio-stage").locator("figure").first().boundingBox())!;
    expect(Math.abs(frame.width / frame.height - 960 / 408)).toBeLessThan(0.03);
    const clip = (await page.getByTestId("studio-stage").locator("video").first().boundingBox())!;
    expect(Math.abs(clip.width / clip.height - 9 / 16)).toBeLessThan(0.02);
    expect(Math.abs(clip.height - frame.height)).toBeLessThan(2);
    expect(Math.abs(clip.x + clip.width / 2 - (frame.x + frame.width / 2))).toBeLessThan(2);
    await expectNoHorizontalScroll(page);
  });
}

test("studio · record → stop → saving → saved → next; one centred group", async ({ page }) => {
  await page.goto(URL);
  const record = btn(page, "Record");
  const before = (await record.boundingBox())!;
  await record.click();
  await expect(btn(page, "Stop")).toBeVisible();
  await expect(page.getByTestId("stage-muted")).toBeVisible();
  await btn(page, "Stop").click();
  await expect(page.getByTestId("record-hint")).toHaveText("Saving take…");
  const again = btn(page, "Record again");
  await expect(again).toBeVisible({ timeout: 5_000 });
  // measure only once the row has settled (Next enabled, saving finished) — under load the first frame can lag
  await expect(btn(page, "Next")).toBeEnabled();
  await page.waitForTimeout(200);
  const after = (await again.boundingBox())!;
  // owner 2026-11-03: one centred group on wide screens — Next joins it right after Record again; the group stays centred
  if (page.viewportSize()!.width > 480) {
    const next = (await btn(page, "Next").boundingBox())!;
    expect(next.x).toBeGreaterThan(after.x + after.width);
    expect(next.x - (after.x + after.width)).toBeLessThan(16);
    const row = (await page.getByTestId("studio-actions").boundingBox())!;
    const back = (await page.getByRole("button", { name: "Previous turn" }).boundingBox())!;
    const groupMid = (back.x + next.x + next.width) / 2;
    expect(Math.abs(groupMid - (row.x + row.width / 2))).toBeLessThan(2);
  } else expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  await expect(page.getByRole("status").filter({ hasText: "Take saved" })).toBeAttached();

  const dots = page.getByTestId("turn-dots").locator("[data-s]");
  await expect(dots.nth(2)).toHaveAttribute("data-s", "current");
  await btn(page, "Next").click();
  await expect(page.getByText("Turn 4 of 12")).toBeAttached();
  await expect(dots.nth(3)).toHaveAttribute("data-s", "current");
  await expect(dots.nth(2)).toHaveAttribute("data-s", "done");
  // arrival on a turn without a take: the fragment plays once by itself, Next does not exist yet
  await expect(btn(page, "Original")).toHaveAttribute("aria-pressed", "true");
  await expect(btn(page, "Next")).toBeHidden();
  await btn(page, "Previous turn").click();
  await expect(page.getByText("Turn 3 of 12")).toBeAttached();
  await expect(btn(page, "Record again")).toBeVisible();
});

test("studio · recording stops by itself at the end of the window", async ({ page }) => {
  await page.goto(`${URL}?turn=2`); // turn 2: a 2.6 s window
  await btn(page, "Record").click();
  await expect(btn(page, "Stop")).toBeVisible();
  await expect(btn(page, "Record again")).toBeVisible({ timeout: 6_000 });
  await expect(btn(page, "Next")).toBeVisible();
});

test("studio · keyboard: Space, R, ← / →, shortcuts in tooltips", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcuts are a desktop feature");
  await page.goto(URL);
  const original = btn(page, "Original");
  await page.keyboard.press("Space");
  await expect(original).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(original).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("ArrowRight"); // no take yet: Next is not allowed
  await expect(page.getByText("Turn 3 of 12")).toBeAttached();
  await page.keyboard.press("r");
  await expect(btn(page, "Stop")).toBeVisible();
  await page.keyboard.press("ArrowLeft"); // not while recording
  await expect(page.getByText("Turn 3 of 12")).toBeAttached();
  await page.keyboard.press("r");
  await expect(btn(page, "Record again")).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Turn 4 of 12")).toBeAttached();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Turn 3 of 12")).toBeAttached();

  // the shortcut is in the tooltip; focus is visible
  await btn(page, "Record again").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toHaveText("Record again · R");
  const outline = await btn(page, "Record again").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
  await btn(page, "Next").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toHaveText("Next turn · →");
});

test("studio · Exit: asks while a take is unsaved, leaves at once otherwise", async ({ page }) => {
  await page.goto(URL);
  await btn(page, "Record").click();
  await page.getByRole("button", { name: "Exit studio" }).click();
  const dialog = page.getByRole("dialog", { name: "Leave with an unsaved take?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Your take for turn 3 isn't saved yet.");
  await dialog.getByRole("button", { name: "Stay" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(btn(page, "Record again")).toBeVisible({ timeout: 5_000 }); // staying keeps (saves) the take

  await page.getByRole("button", { name: "Exit studio" }).click(); // nothing unsaved now
  await expect(page).toHaveURL(/\/prototypes\/studio$/);

  await page.goto(`${URL}?state=exit-unsaved`);
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/prototypes\/studio$/);
});

test("studio · Escape in the exit dialog means Stay", async ({ page }) => {
  await page.goto(`${URL}?state=exit-unsaved`);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(btn(page, "Record again")).toBeVisible({ timeout: 5_000 });
});

test("studio · microphone blocked → Try again enables Record", async ({ page }) => {
  await page.goto(`${URL}?state=mic-blocked`);
  await btn(page, "Try again").click();
  await expect(page.getByTestId("mic-blocked")).toHaveCount(0);
  await expect(btn(page, "Record")).toBeEnabled();
});

test("studio · volume popover with the slider", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("button", { name: "Original voice volume" }).click();
  const dialog = page.getByRole("dialog", { name: "Original voice volume" });
  await expect(dialog.getByRole("slider", { name: "Original voice volume" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("slider")).toHaveAttribute("aria-valuenow", "75");
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Turn 3 of 12")).toBeAttached(); // ← in the slider did not change the turn
});

test("studio · long scenes get smaller dots and still fit", async ({ page }) => {
  await page.goto(`${URL}?turns=24&turn=20&state=saved`);
  await expect(page.getByTestId("turn-dots").locator("[data-size]")).toHaveAttribute("data-size", "sm");
  await expect(page.getByText("Turn 20 of 24")).toBeAttached();
  await expectNoHorizontalScroll(page);
  await page.goto(`${URL}?turns=48&turn=40`);
  await expect(page.getByTestId("turn-dots").locator("[data-size]")).toHaveAttribute("data-size", "xs");
  await expectNoHorizontalScroll(page);
  const dots = (await page.getByTestId("turn-dots").boundingBox())!;
  expect(dots.x).toBeGreaterThanOrEqual(0);
  expect(dots.x + dots.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("studio (RU) · saved and recording fit, Russian copy", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto(`${URL}?state=saved`);
  for (const name of ["Оригинал", "Мой дубль", "Записать заново", "Дальше"]) await expectInViewport(page, btn(page, name));
  await expect(page.getByText("Реплика 3 из 12")).toBeAttached();
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
  await page.goto(`${URL}?state=recording`);
  await expect(page.getByText("Осталось 1,5 с")).toBeVisible();
  await expect(page.getByText("Без звука")).toBeVisible();
  await expectInViewport(page, btn(page, "Стоп"));
  await page.goto(`${URL}?state=last`);
  await expectInViewport(page, btn(page, "Собрать результат"));
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("studio · no slide, no pill or number animation", async ({ page }) => {
    await page.goto(`${URL}?state=saved`);
    await btn(page, "Next").click();
    await expect(page.getByText("Turn 4 of 12")).toBeAttached();
    const scene = page.locator("main [data-dir=next]").first();
    expect(await scene.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    const dot = page.getByTestId("turn-dots").locator("[data-s=current]");
    expect(await dot.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });
});

test("studio · the bottom microphone notice never covers the action row; the picture barely moves", async ({ page }) => {
  await page.goto(URL);
  const before = (await page.getByTestId("studio-stage").boundingBox())!;
  await page.goto(`${URL}?state=mic-blocked`);
  const notice = page.getByTestId("mic-blocked");
  await expect(notice).toBeVisible();
  await page.waitForTimeout(400); // slide-in
  const n = (await notice.boundingBox())!;
  const a = (await page.getByTestId("studio-actions").boundingBox())!;
  expect(a.y + a.height).toBeLessThanOrEqual(n.y);
  const after = (await page.getByTestId("studio-stage").boundingBox())!;
  // the picture gives up height first; a width-bound picture (wide clip, phones) lets the column move up a little
  if (page.viewportSize()!.width > 480) expect(Math.abs(after.y - before.y)).toBeLessThan(24);
});

test("studio · last turn: Build the result opens the result page, assembling", async ({ page }) => {
  await page.goto(`${URL}?state=last`);
  await btn(page, "Build the result").click();
  await expect(page).toHaveURL(/\/prototypes\/result\/page\?turns=12$/);
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
});

test("studio · re-record mode (from the result): › moves on, Build the new version after a new take, Exit → result", async ({ page }) => {
  await page.goto(`${URL}?mode=rerecord&turn=3&turns=6`);
  await expect(page.getByText("Turn 3 of 6")).toBeAttached();
  // every turn already has a take: Record again, My take, ‹ and › — no Next, no Build yet
  for (const name of ["Previous turn", "Next turn", "Original", "My take", "Record again"]) await expectInViewport(page, btn(page, name));
  await expect(btn(page, "Next")).toHaveCount(0);
  await expect(btn(page, "Build the new version")).toHaveCount(0);
  await btn(page, "Next turn").click();
  await expect(page.getByText("Turn 4 of 6")).toBeAttached();
  await expect(btn(page, "Record again")).toBeVisible(); // its take is there
  await btn(page, "Previous turn").click();
  await expect(page.getByText("Turn 3 of 6")).toBeAttached();

  await page.goto(`${URL}?mode=rerecord&turn=3&turns=6&state=saved`);
  await expectInViewport(page, btn(page, "Build the new version"));
  await expectInViewport(page, btn(page, "Record again"));
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await page.goto(`${URL}?mode=rerecord&turn=6&turns=6`);
  await expect(btn(page, "Next turn")).toHaveCount(0); // nothing after the last turn
  await page.getByRole("button", { name: "Exit studio" }).click();
  await expect(page).toHaveURL(/\/prototypes\/result\/page\?state=ready&turns=6$/);
});

test("studio (RU) · re-record mode: «Собрать новую версию» fits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto(`${URL}?mode=rerecord&turn=3&turns=6&state=saved`);
  for (const name of ["Собрать новую версию", "Записать заново", "Оригинал", "Мой дубль"]) await expectInViewport(page, btn(page, name));
  await expectNoHorizontalScroll(page);
});

test("studio · re-record mode: leaving with an unbuilt new take asks to build first", async ({ page }) => {
  await page.goto(`${URL}?mode=rerecord&turn=3&turns=6&state=saved`);
  await page.getByRole("button", { name: "Exit studio" }).click();
  const dialog = page.getByTestId("leave-build-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("You re-recorded 1 turn.");
  await expectNoA11yViolations(page);
  // Stay closes it
  await dialog.getByRole("button", { name: "Stay" }).click();
  await expect(dialog).toHaveCount(0);
  // Build → the result with version 2 assembling
  await page.getByRole("button", { name: "Exit studio" }).click();
  await page.getByTestId("leave-build-dialog").getByRole("button", { name: "Build the new version" }).click();
  await expect(page).toHaveURL(/\/prototypes\/result\/page\?rerecorded=3&turns=6$/);
  // Leave without building → the result unchanged
  await page.goto(`${URL}?mode=rerecord&turn=3&turns=6&state=saved`);
  await page.getByRole("button", { name: "Exit studio" }).click();
  await page.getByTestId("leave-build-dialog").getByRole("button", { name: "Leave without building" }).click();
  await expect(page).toHaveURL(/\/prototypes\/result\/page\?state=ready&turns=6$/);
});
