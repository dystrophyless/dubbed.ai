import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import {
  DEMO_EMAIL, DEMO_PASSWORD, GOOD_PASSWORD, LABEL, createAccount, emailField, passwordField, readDemoCode, signInWith,
  signOutFromMenu, submit, submitSignUp, typeCode,
} from "./support/auth";
import { gotoGuest, noHorizontalScroll, resetDemo, uploadScene } from "./support/flow";

/*
 * Feature 004, US2 — sign in and out on mock services. `?demo=reset` starts signed out with only the demo account
 * (demo@dubbed.test / dubbed-demo); `?demo=fail:auth` fails the next auth call; accounts are stored per browser profile,
 * sessions are shared between the tabs of one context.
 */
const OTHER_EMAIL = "other.person@example.com";

/** Records every URL the page visits (full navigations and history changes). */
function trackUrls(page: Page) {
  const urls: string[] = [];
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) urls.push(f.url()); });
  return urls;
}

/** Upload → Start: a project exists (and stays preparing at this speed) and Processing is open. */
async function startProject(page: Page) {
  await uploadScene(page);
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await page.getByTestId("cost-button").click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/processing$/);
}

test.describe("US2 — sign in and out", () => {
  test("guest opens /credits → sign in as the demo account → Credits; reload keeps the session; signed in, /sign-in → My projects", async ({ page }) => {
    const urls = trackUrls(page);
    await gotoGuest(page, "/credits");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcredits$/);
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // the demo hint fills the form (demo mode only)
    await page.getByRole("button", { name: "Fill in" }).click();
    await expect(emailField(page)).toHaveValue(DEMO_EMAIL);
    await submit(page).click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByTestId("credits-buy")).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByTestId("credits-buy")).toBeVisible();

    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/projects$/);
    expect(urls.filter((u) => u.includes(DEMO_PASSWORD) || u.includes(encodeURIComponent(DEMO_PASSWORD)))).toEqual([]);
  });

  test("a wrong password gives one message, keeps the email, clears and focuses the password; the URL never holds the password", async ({ page }) => {
    const urls = trackUrls(page);
    await gotoGuest(page, "/sign-in");
    await signInWith(page, DEMO_EMAIL, "not-the-password");
    const error = page.getByTestId("auth-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("Email or password is wrong");
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(emailField(page)).toHaveValue(DEMO_EMAIL);
    await expect(passwordField(page)).toHaveValue("");
    await expect(passwordField(page)).toBeFocused();
    await expect(page).toHaveURL(/\/sign-in$/);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // an unknown email gets the very same answer
    await emailField(page).fill("nobody@example.com");
    await passwordField(page).fill("not-the-password");
    await submit(page).click();
    await expect(error).toContainText("Email or password is wrong");

    // the right password then signs in
    await signInWith(page, DEMO_EMAIL, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/projects$/);
    expect(urls.filter((u) => /password|dubbed-demo|not-the-password/.test(u))).toEqual([]);
  });

  test("empty and malformed fields are refused before anything is sent", async ({ page }) => {
    await gotoGuest(page, "/sign-in");
    await submit(page).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await emailField(page).fill("not-an-email");
    await passwordField(page).fill("x");
    await submit(page).click();
    await expect(page.getByText("Enter a full email address, like name@example.com.")).toBeVisible();
    await expect(page.getByTestId("auth-error")).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("5 wrong passwords in a row lock the email with a live countdown", async ({ page }) => {
    await gotoGuest(page, "/sign-in");
    for (let n = 0; n < 5; n++) {
      await signInWith(page, DEMO_EMAIL, `wrong-password-${n}`);
      if (n < 4) await expect(page.getByTestId("auth-error")).toBeVisible();
    }
    const locked = page.getByTestId("auth-locked");
    await expect(locked).toBeVisible();
    await expect(locked).toContainText("Too many tries");
    await expect(locked).toContainText(/Try again in (0:[0-5]\d|1:00)\./);
    await expect(submit(page)).toBeDisabled();
    const first = await locked.textContent();
    await expect.poll(async () => locked.textContent(), { timeout: 4000 }).not.toBe(first); // it counts down
    await expect(emailField(page)).toHaveValue(DEMO_EMAIL);
    await expectNoA11yViolations(page);

    // even the right password is refused while locked
    await passwordField(page).fill(DEMO_PASSWORD);
    await expect(submit(page)).toBeDisabled();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("sign out from the account menu → sign-in; the private pages are closed again", async ({ page }) => {
    await resetDemo(page, "", "/projects");
    await expect(page.getByRole("heading", { name: "My projects" })).toBeVisible();
    await signOutFromMenu(page);
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fprojects$/);
    await page.goto("/credits");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcredits$/);
  });

  test("two tabs: sign out in tab A → tab B shows sign-in within a second and /projects stays closed", async ({ page, context }) => {
    await resetDemo(page, "", "/projects");
    await expect(page.getByRole("heading", { name: "My projects" })).toBeVisible();
    const tabB = await context.newPage();
    await tabB.goto("/projects");
    await expect(tabB.getByRole("heading", { name: "My projects" })).toBeVisible();

    await signOutFromMenu(page);
    await expect(tabB).toHaveURL(/\/sign-in/, { timeout: 2000 });
    await expect(tabB.getByTestId("signin-page")).toBeVisible({ timeout: 2000 });
    await expect(tabB).toHaveURL(/\/sign-in\?next=%2Fprojects$/);
    expect(tabB.url()).not.toContain("%2Fsign-in");

    await tabB.goto("/projects");
    await expect(tabB).toHaveURL(/\/sign-in/);
    await expect(tabB.getByRole("heading", { name: "My projects" })).toHaveCount(0);

    await signInWith(tabB, DEMO_EMAIL, DEMO_PASSWORD);
    await expect(tabB).toHaveURL(/\/projects$/);
    await expect(tabB.getByRole("heading", { name: "My projects" })).toBeVisible();
  });

  test("an unfinished sign-up: sign out on the code page, sign in → the code page again", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, OTHER_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.goto("/sign-up/verify?demo=signout");
    await expect(page).toHaveURL(/\/sign-in/);

    await signInWith(page, OTHER_EMAIL, GOOD_PASSWORD);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByTestId("verify-page")).toContainText(OTHER_EMAIL);
    // the account can still be finished: its code is in the notice
    await typeCode(page, await readDemoCode(page));
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
  });

  test("data per account: the demo project is absent for a new account and back after signing in as demo", async ({ page }) => {
    await resetDemo(page, "speed:0.05", "/new");
    await startProject(page);
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(1);
    await signOutFromMenu(page);

    await createAccount(page, OTHER_EMAIL);
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(0);
    await expect(page.getByTestId("projects-empty-new")).toBeVisible();
    await signOutFromMenu(page);

    await signInWith(page, DEMO_EMAIL, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("project-card")).toHaveCount(1);
  });

  test("sign out while the studio is open in tab B with a take being recorded: tab B shows sign-in, nothing of the demo account is left", async ({ page, context }) => {
    test.setTimeout(120_000);
    // tab B: the studio of a real project
    await resetDemo(page, "speed:8", "/new");
    await startProject(page);
    await expect(page).toHaveURL(/\/turns\/1$/, { timeout: 40_000 });
    const studioUrl = page.url();
    await expect(page.getByTestId("studio")).toBeVisible();
    await page.locator('button[aria-keyshortcuts="R"]').click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", /recording|saving/);

    // tab A: sign out from the account menu while the take is being recorded
    const tabA = await context.newPage();
    await tabA.goto("/projects");
    await expect(tabA.getByRole("heading", { name: "My projects" })).toBeVisible();
    await signOutFromMenu(tabA);

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await expect(page.getByTestId("studio")).toHaveCount(0);

    // another account signs in on tab B: neither the project nor its take is visible
    await createAccount(page, OTHER_EMAIL);
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(0);
    await page.goto(studioUrl);
    await expect(page.getByTestId("studio")).toHaveCount(0);
    await expect(page.getByTestId("studio-next")).toHaveCount(0);
  });

  test("service failure: the alert shows, the email stays, Try again signs in", async ({ page }) => {
    await gotoGuest(page, "/sign-in");
    await page.goto("/sign-in?demo=fail:auth");
    await signInWith(page, DEMO_EMAIL, DEMO_PASSWORD);
    const alert = page.getByTestId("auth-service-error");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Couldn’t reach Dubbed");
    await expect(emailField(page)).toHaveValue(DEMO_EMAIL);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expectNoA11yViolations(page);

    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("RU: sign in with the demo account", async ({ page }) => {
    await gotoGuest(page, "/credits", "ru");
    await expect(page.getByRole("heading", { name: "С возвращением" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Подставить" }).click();
    await expect(emailField(page, "ru")).toHaveValue(DEMO_EMAIL);
    await submit(page).click();
    await expect(page).toHaveURL(/\/credits$/);
    await signOutFromMenu(page, "ru");
    await expect(page.getByRole("heading", { name: "С возвращением" })).toBeVisible();
    expect(LABEL.ru.password).toBe("Пароль");
  });
});
