import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { accountCount, DEMO_EMAIL, emailField, passwordField, signInWith, signOutFromMenu, submit } from "./support/auth";
import { balanceLink, gotoGuest, noHorizontalScroll } from "./support/flow";

/*
 * Feature 004, US3 — Google on mock services (the stand-in page /auth/google). `?demo=reset` starts signed out with only the
 * demo account; `?demo=google:fail` makes the next Google call fail. A new Google identity skips the code step and lands on the
 * microphone check; an existing email signs in to that account.
 */
const ALEX = "alex.rivera@example.com";

const continueWithGoogle = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Continue with Google" });

test.describe("US3 — Google", () => {
  test("sign-up → Google → new identity → microphone (no code step) → Finish → 120 credits; sign out → Google again → My projects", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await continueWithGoogle(page).click();
    await expect(page).toHaveURL(/\/auth\/google\?from=sign-up$/);
    const standIn = page.getByTestId("google-page");
    await expect(standIn).toBeVisible();
    await expect(standIn).toContainText("Demo page — not the real Google");
    await expect(page.getByRole("radio", { name: /Alex Rivera/ })).toBeChecked();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await submit(page).click();
    await expect(page).toHaveURL(/\/sign-up\/microphone$/); // no e-mail code for Google
    await expect(page.getByTestId("verify-page")).toHaveCount(0);
    await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });
    await page.getByTestId("mic-finish").click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(balanceLink(page)).toContainText("120");
    await expect.poll(() => accountCount(page)).toBe(2);

    await signOutFromMenu(page);
    await page.goto("/sign-in"); // the signed-out tab was sent to sign-in with `next`; start without it
    await continueWithGoogle(page).click();
    await expect(page).toHaveURL(/\/auth\/google\?from=sign-in$/);
    await submit(page).click(); // Alex Rivera is the first identity
    await expect(page).toHaveURL(/\/projects$/);
    await expect.poll(() => accountCount(page)).toBe(2); // the same account, not a second one
  });

  test("another email: the demo account's email opens the demo account's projects", async ({ page }) => {
    await gotoGuest(page, "/auth/google?from=sign-in");
    await page.getByRole("radio", { name: "Another email" }).check();
    await expect(page.getByTestId("google-form").getByLabel("Email", { exact: true })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // an invalid address is refused on the page, nothing is created
    await emailField(page).fill("not-an-email");
    await submit(page).click();
    await expect(page.getByText("Enter a full email address, like name@example.com.")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/google/);

    await emailField(page).fill(DEMO_EMAIL);
    await submit(page).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect.poll(() => accountCount(page)).toBe(1);
    await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  });

  test("Cancel returns to where the user came from with a notice (sign-in keeps `next`)", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await continueWithGoogle(page).click();
    await page.getByTestId("google-cancel").click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByTestId("auth-notice")).toContainText("Google sign-in was cancelled");
    await expectNoA11yViolations(page);

    await gotoGuest(page, "/credits");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcredits$/);
    await continueWithGoogle(page).click();
    await expect(page).toHaveURL(/\/auth\/google\?from=sign-in&next=%2Fcredits$/);
    await page.getByTestId("google-cancel").click();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcredits$/);
    await expect(page.getByTestId("auth-notice")).toContainText("Google sign-in was cancelled");
    await expect.poll(() => accountCount(page)).toBe(1);
  });

  test("google:fail shows the failure panel, creates nothing; Try again continues", async ({ page }) => {
    await gotoGuest(page, "/auth/google?from=sign-up");
    await page.goto("/auth/google?from=sign-up&demo=google:fail");
    await submit(page).click();
    const standIn = page.getByTestId("google-page");
    await expect(standIn).toHaveAttribute("data-state", "failed");
    await expect(standIn).toContainText("Couldn’t reach Google");
    await expect.poll(() => accountCount(page)).toBe(1);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByTestId("google-retry").click();
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
    await expect.poll(() => accountCount(page)).toBe(2);
  });

  test("a Google-only account that signs in with a password gets the Google hint", async ({ page }) => {
    await gotoGuest(page, "/auth/google?from=sign-up");
    await submit(page).click();
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
    await page.goto("/sign-in?demo=signout");
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await signInWith(page, ALEX, "any-password-1");
    const hint = page.getByTestId("auth-google-only");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("This account uses Google");
    await expect(passwordField(page)).toHaveValue("");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expectNoA11yViolations(page);
  });

  test("RU: the stand-in and a new Google identity", async ({ page }) => {
    await gotoGuest(page, "/auth/google?from=sign-up", "ru");
    await expect(page.getByRole("heading", { name: "Выберите аккаунт" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
  });
});
