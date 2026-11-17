import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { DEMO_EMAIL, DEMO_PASSWORD, emailField, failNextServiceCall, holdServiceStores, RESET_RESEND_STORES, passCooldown, readDemoCode, signInWith, signOutFromMenu, submit, typeCode } from "./support/auth";
import { gotoGuest, noHorizontalScroll, type Lang } from "./support/flow";

/*
 * Feature 004, US5 — reset a forgotten password in three steps: email → code only → new password twice → signed in.
 * `?demo=reset` starts signed out with only the demo account; `?demo=code:expire` expires every code and ticket — applied from a
 * second tab of the same browser profile, because a preset is read when a page loads and step 3 must keep its in-page ticket.
 */
const NEW_PASSWORD = "brand-new-pass-1";
const UNKNOWN = "nobody@example.com";

const NEW_LABEL: Record<Lang, { newPassword: string; repeat: string }> = {
  en: { newPassword: "New password", repeat: "Repeat new password" },
  ru: { newPassword: "Новый пароль", repeat: "Повторите новый пароль" },
};
const newPassword = (page: Page, lang: Lang = "en") => page.getByLabel(NEW_LABEL[lang].newPassword, { exact: true });
const repeatPassword = (page: Page, lang: Lang = "en") => page.getByLabel(NEW_LABEL[lang].repeat, { exact: true });

async function sendCode(page: Page, email: string) {
  await emailField(page).fill(email);
  await submit(page).click();
  await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "code");
}

/** Email step → code step → demo-notice code → password step. */
async function toPasswordStep(page: Page, email = DEMO_EMAIL, lang: Lang = "en") {
  await emailField(page, lang).fill(email);
  await submit(page).click();
  await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "code");
  await typeCode(page, await readDemoCode(page), lang);
  await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "password");
}

test.describe("US5 — reset password", () => {
  test("Forgot password → the same reply for a known and an unknown email → wrong code, right code → password step", async ({ page }) => {
    await gotoGuest(page, "/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "email");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // an unknown address gets the same page and sentence as the known one
    await sendCode(page, UNKNOWN);
    const reply = page.getByTestId("reset-page");
    await expect(reply).toContainText(`If an account exists for ${UNKNOWN}, we sent a 6-digit code.`);
    await expect(page.getByTestId("auth-demo-code")).toContainText("No account has this email"); // demo notice only
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Use a different email" }).click();
    await expect(reply).toHaveAttribute("data-state", "email");
    await sendCode(page, DEMO_EMAIL);
    await expect(reply).toContainText(`If an account exists for ${DEMO_EMAIL}, we sent a 6-digit code.`);
    await expect(page).toHaveURL(/\/reset-password$/); // email and ticket never reach the URL
    await expect(page.getByLabel("New password")).toHaveCount(0); // no password field before a correct code
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    const good = await readDemoCode(page);
    await typeCode(page, good === "000000" ? "111111" : "000000");
    await expect(page.getByText(/That code is wrong\. 4 tries left\./).first()).toBeVisible();
    await expect(reply).toHaveAttribute("data-state", "code-wrong");
    await expect(page.getByLabel(/Verification code/)).toHaveValue(""); // the boxes shake, then clear
    await typeCode(page, good);
    await expect(reply).toHaveAttribute("data-state", "password");
    await expect(newPassword(page)).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("guest opens /credits → sign in → Forgot password → reset → lands on /credits; the way back to sign in keeps the destination", async ({ page }) => {
    await gotoGuest(page, "/credits");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcredits$/);
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/reset-password\?next=%2Fcredits$/);
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in?next=%2Fcredits");
    await toPasswordStep(page);
    await newPassword(page).fill(NEW_PASSWORD);
    await repeatPassword(page).fill(NEW_PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByTestId("credits-buy")).toBeVisible();
  });

  test("a failed resend shows the service alert; the code stays, no countdown starts, Try again resends", async ({ page }) => {
    await page.clock.install(); // the 60 s cooldown is run through with the page clock
    await gotoGuest(page, "/reset-password");
    await sendCode(page, DEMO_EMAIL);
    const reset = page.getByTestId("reset-page");
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await passCooldown(page);
    const resend = page.getByRole("button", { name: "Resend code" });
    await expect(resend).toBeVisible();
    await typeCode(page, "123");

    const failure = await failNextServiceCall(page, RESET_RESEND_STORES);
    await resend.click();
    const alert = page.getByTestId("auth-service-error");
    await expect(alert).toBeVisible();
    expect(await failure.fired()).toBe(true); // the injected failure, not something else, raised the alert
    await expect(alert).toContainText("Couldn’t reach Dubbed");
    await expect(page.getByText(/Resend in/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resend code" })).toBeVisible();
    await expect(page.getByText("New code sent")).toHaveCount(0);
    await expect(page.getByLabel(/Verification code/)).toHaveValue("123");
    await expect(reset).toHaveAttribute("data-state", "code");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByText(/Resend in\s*(1:00|0:5\d)/)).toBeVisible();
    await expect(page.getByText("New code sent")).toBeVisible();
  });

  test("while a resend is pending the code field and change email are off; afterwards a code goes through", async ({ page }) => {
    await page.clock.install();
    await gotoGuest(page, "/reset-password");
    await sendCode(page, DEMO_EMAIL);
    await passCooldown(page);
    const resend = page.getByRole("button", { name: "Resend code" });
    await expect(resend).toBeVisible();

    const hold = await holdServiceStores(page, RESET_RESEND_STORES);
    await resend.click();
    await expect(page.getByLabel(/Verification code/)).toBeDisabled();
    await expect(page.getByRole("button", { name: "Use a different email" })).toBeDisabled();
    await hold.release();
    await expect(page.getByText("New code sent")).toBeVisible();
    await expect(page.getByLabel(/Verification code/)).toBeEnabled();
    await typeCode(page, await readDemoCode(page));
    await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "password");
  });

  test("after a failed resend the code field is usable again and the code is checked", async ({ page }) => {
    await page.clock.install();
    await gotoGuest(page, "/reset-password");
    await sendCode(page, DEMO_EMAIL);
    await passCooldown(page);
    const code = await readDemoCode(page);
    const failure = await failNextServiceCall(page, RESET_RESEND_STORES);
    await page.getByRole("button", { name: "Resend code" }).click();
    await expect(page.getByTestId("auth-service-error")).toBeVisible();
    expect(await failure.fired()).toBe(true);
    await expect(page.getByLabel(/Verification code/)).toBeEnabled();
    await typeCode(page, code);
    await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "password");
  });

  test("a weak or mismatching password is refused on the page; matching ones sign in; the old password stops working", async ({ page }) => {
    await gotoGuest(page, "/reset-password");
    await toPasswordStep(page);

    // weak: error on the first field
    await newPassword(page).fill("short");
    await repeatPassword(page).fill("short");
    await submit(page).click();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password$/);

    // mismatch: error on the repeat field, nothing changed
    await newPassword(page).fill(NEW_PASSWORD);
    await repeatPassword(page).fill(`${NEW_PASSWORD}x`);
    await submit(page).click();
    await expect(page.getByText(/The passwords don.t match\./)).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByTestId("reset-page")).toHaveAttribute("data-state", "password");
    await expectNoA11yViolations(page);

    await repeatPassword(page).fill(NEW_PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/projects$/);

    await signOutFromMenu(page);
    await signInWith(page, DEMO_EMAIL, DEMO_PASSWORD);
    await expect(page.getByTestId("auth-error")).toBeVisible(); // the old password no longer works
    await expect(page).toHaveURL(/\/sign-in(\?|$)/);
    await signInWith(page, DEMO_EMAIL, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("an expired ticket on step 3 shows Start again, which returns to the email step", async ({ page, context }) => {
    await gotoGuest(page, "/reset-password");
    await toPasswordStep(page);

    // a second tab of the same browser profile applies code:expire to the shared mock database
    const other = await context.newPage();
    await other.goto("/reset-password?demo=code:expire");
    await expect(other.getByTestId("reset-page")).toBeVisible();
    await other.close();

    await newPassword(page).fill(NEW_PASSWORD);
    await repeatPassword(page).fill(NEW_PASSWORD);
    await submit(page).click();
    const reset = page.getByTestId("reset-page");
    await expect(reset).toHaveAttribute("data-state", "password-expired");
    await expect(page.getByTestId("auth-ticket-expired")).toContainText("This step has expired");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByTestId("auth-restart").click();
    await expect(reset).toHaveAttribute("data-state", "email");
    await expect(page).toHaveURL(/\/reset-password$/);
  });

  test("RU: the reset happy path", async ({ page }) => {
    await gotoGuest(page, "/reset-password", "ru");
    await expect(page.getByRole("heading", { name: "Сброс пароля" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await toPasswordStep(page, DEMO_EMAIL, "ru");
    await expect(page.getByRole("heading", { name: "Новый пароль" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await newPassword(page, "ru").fill(NEW_PASSWORD);
    await repeatPassword(page, "ru").fill(NEW_PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/projects$/);
    await signOutFromMenu(page, "ru");
    await signInWith(page, DEMO_EMAIL, NEW_PASSWORD, "ru");
    await expect(page).toHaveURL(/\/projects$/);
  });
});
