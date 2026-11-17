import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { failNextServiceCall, GOOD_PASSWORD, signUpToMicrophone } from "./support/auth";
import { balanceLink, blockMicrophone, gotoGuest, noHorizontalScroll } from "./support/flow";

/*
 * Feature 004, US4 — the microphone check of the onboarding. The fake microphone (Chrome's test device) plays a tone, which
 * the check hears; a page whose getUserMedia is refused gives the blocked state. The "missing" and "silent" states are covered
 * by the view in the prototype (/prototypes/004-auth-mock/microphone) and by the Vitest of the voice detector (T018), not here.
 */
const EMAIL = "mic.person@example.com";

test.describe("US4 — microphone check", () => {
  test("a refused microphone shows the blocked state: how to allow it, Try again, and no way forward", async ({ page }) => {
    await blockMicrophone(page);
    await gotoGuest(page, "/sign-up");
    await signUpToMicrophone(page, EMAIL, GOOD_PASSWORD);

    const mic = page.getByTestId("microphone-page");
    await expect(mic).toHaveAttribute("data-state", "blocked");
    await expect(mic).toContainText("Your microphone is blocked");
    await expect(page.getByTestId("mic-how-to").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("mic-retry")).toBeVisible();
    // no skip, no Finish, no other link out of the step
    await expect(page.getByTestId("mic-finish")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /skip|later|finish/i })).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // Try again asks again; it is still refused, and the step does not move
    await page.getByTestId("mic-retry").click();
    await expect(mic).toHaveAttribute("data-state", "blocked");
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
    await page.goto("/new");
    await expect(page).toHaveURL(/\/sign-up\/microphone$/); // the guard keeps an unfinished account on this step
  });

  test("with the microphone: Finish is disabled until the voice is heard, then Finish opens New dub and remembers the microphone", async ({ page }) => {
    await gotoGuest(page, "/sign-up");
    await signUpToMicrophone(page, EMAIL, GOOD_PASSWORD);

    await expect(page.getByTestId("mic-finish")).toBeDisabled();
    await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("microphone-page")).toHaveAttribute("data-state", "heard");
    await expect(page.getByTestId("mic-finish")).toBeEnabled();
    await expect(page.getByTestId("mic-device").or(page.getByRole("button", { name: /^Microphone/ }))).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByTestId("mic-finish").click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(balanceLink(page)).toContainText("120");
    const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dubbed.mic.") && localStorage.getItem(k)));
    expect(saved).toHaveLength(1);
  });

  test("an activation error, then a switch to a silent microphone: the error is gone and nothing can activate until the voice is heard", async ({ page }) => {
    // two devices: "tone" (Chrome's fake tone) and "quiet" (a stream with no signal)
    await page.addInitScript(() => {
      const md = navigator.mediaDevices;
      const realGet = md.getUserMedia.bind(md);
      md.enumerateDevices = async () => [
        { deviceId: "tone", kind: "audioinput", label: "Tone microphone", groupId: "g", toJSON: () => ({}) },
        { deviceId: "quiet", kind: "audioinput", label: "Quiet microphone", groupId: "g", toJSON: () => ({}) },
      ] as MediaDeviceInfo[];
      md.getUserMedia = async (constraints) => {
        const audio = constraints?.audio;
        const wanted = typeof audio === "object" ? (audio.deviceId as { ideal?: string } | undefined)?.ideal : undefined;
        let stream: MediaStream;
        if (wanted === "quiet") {
          const ctx = new AudioContext();
          stream = ctx.createMediaStreamDestination().stream;
        } else stream = await realGet(constraints);
        const track = stream.getAudioTracks()[0];
        const id = wanted === "quiet" ? "quiet" : "tone";
        track.getSettings = () => ({ deviceId: id });
        return stream;
      };
    });
    await gotoGuest(page, "/sign-up");
    await signUpToMicrophone(page, EMAIL, GOOD_PASSWORD);
    await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });

    const failure = await failNextServiceCall(page, ["accounts", "sessions", "kv"]); // the activation call
    await page.getByTestId("mic-finish").click();
    const alert = page.getByTestId("auth-service-error");
    await expect(alert).toBeVisible();
    expect(await failure.fired()).toBe(true);

    await page.getByRole("button", { name: /^Microphone/ }).click();
    await page.getByRole("option", { name: "Quiet microphone" }).click();
    await expect(alert).toHaveCount(0); // a new check starts clean
    await expect(page.getByTestId("mic-finish")).toBeDisabled();
    await expect(page.getByTestId("mic-heard")).toHaveCount(0);
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
  });
});
