import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Fails on any WCAG 2.x A/AA violation, colour contrast included (DUBBED PATCH 3, owner 2026-11-02).
 * The dev-only state switcher is excluded, and so is the outgoing label of the thinking
 * loader (`.ui-tlc__label--out`): it is aria-hidden and fades out in 320 ms, so axe
 * sometimes measures it mid-fade.
 */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("[data-testid=state-switcher]")
    .exclude(".ui-tlc__label--out")
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

/** Collects console errors and uncaught exceptions; assert it's empty at the end of a test. */
export function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
