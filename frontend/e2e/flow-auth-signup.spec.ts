import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { accountCount, DEMO_EMAIL, GOOD_PASSWORD, emailField, failNextServiceCall, holdServiceStores, VERIFY_RESEND_STORES, passCooldown, passwordField, readDemoCode, signUpToMicrophone, submit, submitSignUp, typeCode } from "./support/auth";
import { balanceLink, gotoGuest, noHorizontalScroll } from "./support/flow";

/*
 * Feature 004, US1 — create an account with email and password on mock services: sign-in → Create account → code page →
 * microphone check (fake tone) → New dub with the 120 welcome credits. `?demo=reset` starts signed out with only the demo
 * account; `?demo=code:expire` and `?demo=fail:auth` steer the mock.
 */
const NEW_EMAIL = "new.person@example.com";

test.describe("US1 — sign up", () => {
  test("sign-in → Create account → rule, code, microphone → New dub with 120 credits and no projects", async ({ page }) => {
    test.slow(); // several axe runs and the microphone check: the 30 s budget is tight under load
    await gotoGuest(page, "/");
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByTestId("signup-page")).toBeVisible();
    await expect(page.getByText("At least 8 characters.")).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // a 7-character password: the rule shows and there is no code page
    await submitSignUp(page, NEW_EMAIL, "1234567");
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByTestId("verify-page")).toHaveCount(0);

    // a valid sign-up: the code page names the email
    await passwordField(page).fill(GOOD_PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByTestId("verify-page")).toContainText(NEW_EMAIL);
    await expect(page.getByText(/Resend in/)).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // a wrong code is refused; the code from the demo notice is accepted
    const good = await readDemoCode(page);
    await typeCode(page, good === "000000" ? "111111" : "000000");
    await expect(page.getByText(/That code is wrong\. 4 tries left\./).first()).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByLabel(/Verification code/)).toHaveValue(""); // the boxes shake, then clear
    await typeCode(page, good);
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);

    // the fake microphone plays a tone: "We hear you", Finish
    await expect(page.getByTestId("mic-finish")).toBeDisabled();
    await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("mic-finish")).toBeEnabled();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByTestId("mic-finish").click();

    await expect(page).toHaveURL(/\/new$/);
    await expect(balanceLink(page)).toContainText("120");
    await page.goto("/projects");
    // the "N of M slots" header shows only with a project, so the limit of 2 is covered by unit tests
    await expect(page.getByTestId("projects-empty-new")).toBeVisible();
    await expect(page.getByTestId("project-card")).toHaveCount(0);
  });

  test("the demo account's email is taken: Sign in and Reset password are offered", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, DEMO_EMAIL);
    const taken = page.getByTestId("auth-email-taken");
    await expect(taken).toBeVisible();
    await expect(taken.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(taken.getByRole("link", { name: "Reset password" })).toBeVisible();
    await expect(emailField(page)).toHaveValue(DEMO_EMAIL);
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect.poll(() => accountCount(page)).toBe(1);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("resend shows a countdown; an expired code says so", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByText(/Resend in\s*0:[0-5]\d/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend code" })).toHaveCount(0);

    const code = await readDemoCode(page);
    await page.goto("/sign-up/verify?demo=code:expire");
    await expect(page.getByTestId("verify-page")).toBeVisible();
    await typeCode(page, code);
    const dead = page.getByTestId("auth-code-dead");
    await expect(dead).toHaveAttribute("data-kind", "expired");
    await expect(dead).toContainText("This code has expired");
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("a failed resend: the alert shows, the code stays and no countdown starts until Try again sends", async ({ page }) => {
    await page.clock.install(); // the 60 s cooldown is run through with the page clock
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await typeCode(page, "123");
    await passCooldown(page);
    const resend = page.getByRole("button", { name: "Resend code" });
    await expect(resend).toBeVisible();

    const failure = await failNextServiceCall(page, VERIFY_RESEND_STORES);
    await resend.click();
    const alert = page.getByTestId("auth-service-error");
    await expect(alert).toBeVisible();
    expect(await failure.fired()).toBe(true); // the injected failure, not something else, raised the alert
    await expect(alert).toContainText("Couldn’t reach Dubbed");
    await expect(page.getByText(/Resend in/)).toHaveCount(0); // no countdown for a send that did not happen
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await expect(page.getByText("New code sent")).toHaveCount(0);
    await expect(page.locator("[aria-live]").filter({ hasText: "A new code is on its way" })).toHaveCount(0);
    await expect(page.getByLabel(/Verification code/)).toHaveValue("123");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // Try again repeats the resend; only now the countdown and the toast appear
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await expect(page.getByText("New code sent")).toBeVisible();
    await expect(page.getByLabel(/Verification code/)).toHaveValue("123");
    await expectNoA11yViolations(page);
  });

  test("while a resend is pending the code field, change email and the resend are off; afterwards a code verifies", async ({ page }) => {
    await page.clock.install();
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await passCooldown(page);
    const resend = page.getByRole("button", { name: "Resend code" });
    await expect(resend).toBeVisible();

    const hold = await holdServiceStores(page, VERIFY_RESEND_STORES);
    await resend.click();
    await expect(page.getByLabel(/Verification code/)).toBeDisabled(); // no typing: nothing is silently dropped
    await expect(page.getByRole("button", { name: "Use a different email" })).toBeDisabled();
    await expect(page.getByText("New code sent")).toHaveCount(0);
    await hold.release();
    await expect(page.getByText("New code sent")).toBeVisible();
    await expect(page.getByLabel(/Verification code/)).toBeEnabled();
    await expect(page.getByRole("button", { name: "Use a different email" })).toBeEnabled();
    await typeCode(page, await readDemoCode(page));
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
  });

  test("after a failed resend the code field is usable again and a code verifies", async ({ page }) => {
    await page.clock.install();
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await passCooldown(page);
    const code = await readDemoCode(page);
    const failure = await failNextServiceCall(page, VERIFY_RESEND_STORES);
    await page.getByRole("button", { name: "Resend code" }).click();
    await expect(page.getByTestId("auth-service-error")).toBeVisible();
    expect(await failure.fired()).toBe(true);
    await expect(page.getByLabel(/Verification code/)).toBeEnabled();
    await typeCode(page, code); // the old code is still the valid one: a failed resend changed nothing
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
  });

  test("a reload after the cooldown has passed still shows Resend code, not a fresh minute", async ({ page }) => {
    await page.clock.install();
    await gotoGuest(page, "/sign-up");
    await submitSignUp(page, NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await page.reload(); // inside the cooldown: the real remaining time, not a new minute
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await passCooldown(page);
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("verify-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await expect(page.getByText(/Resend in/)).toHaveCount(0);

    // a remounted code field (change email -> back to the code) also counts from the deadline, not from a fresh minute
    await page.getByRole("button", { name: "Use a different email" }).click();
    await page.getByRole("button", { name: "Back to the code" }).click();
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await expect(page.getByText(/Resend in/)).toHaveCount(0);
  });

  test("service failure: the alert shows, the typed email stays, Try again creates exactly one account", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await page.goto("/sign-up?demo=fail:auth");
    await submitSignUp(page, NEW_EMAIL);
    const alert = page.getByTestId("auth-service-error");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Couldn’t reach Dubbed");
    await expect(emailField(page)).toHaveValue(NEW_EMAIL);
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect.poll(() => accountCount(page)).toBe(1); // the demo account only: nothing was created
    await expectNoA11yViolations(page);

    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByTestId("verify-page")).toContainText(NEW_EMAIL);
    await expect.poll(() => accountCount(page)).toBe(2);
  });

  test("RU: sign-up happy path to New dub", async ({ page }) => {
    await gotoGuest(page, "/sign-up", "ru");
    await expect(page.getByRole("heading", { name: "Создайте аккаунт" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await signUpToMicrophone(page, NEW_EMAIL, GOOD_PASSWORD, "ru");
    await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByTestId("mic-finish").click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(balanceLink(page)).toContainText("120");
  });
});
