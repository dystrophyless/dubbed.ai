// Screenshots every /styleguide section (for review against the affect-ui Clean references).
// Usage: node scripts/snap-styleguide.mjs [--base http://localhost:4175] [--out snapshots] [--viewport desktop|mobile|both] [--lang en|ru|both]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = opt("base", "http://localhost:4175");
const out = opt("out", "snapshots");
const vpArg = opt("viewport", "both");
const langArg = opt("lang", "en");
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const viewports = vpArg === "both" ? ["desktop", "mobile"] : [vpArg];
const langs = langArg === "both" ? ["en", "ru"] : [langArg];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const vp of viewports) {
  for (const lang of langs) {
    const mobile = vp === "mobile";
    const context = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
    await context.addInitScript((l) => localStorage.setItem("dubbed.language", l), lang);
    const page = await context.newPage();
    await page.goto(`${base}/styleguide`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500); // entrance animations
    for (const section of await page.locator("section[data-testid^='styleguide-']").all()) {
      const id = await section.getAttribute("data-testid");
      const file = `${out}/${id}.${vp}.${lang}.png`;
      await section.screenshot({ path: file, animations: "disabled" });
      console.log(file);
    }
    await context.close();
  }
}
await browser.close();
