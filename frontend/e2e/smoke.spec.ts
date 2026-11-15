import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { noHorizontalScroll } from "./support/flow";
import { openScreen, screenRoot, type Screen } from "./support/screens";

for (const screen of ["projects", "new", "processing", "studio", "result"] as const) {
  test(`product route: ${screen}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await openScreen(page, screen);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}
for (const route of ["/", "/projects/layout"]) {
  test(`product redirect: ${route}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const screen: Screen = route === "/" ? "projects" : "result";
    await openScreen(page, screen);
    await page.goto(route);
    await expect(page).toHaveURL(route === "/" ? /\/projects$/ : /\/projects\/layout\/result$/);
    await expect(screenRoot(page, screen)).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

// One concrete route, not a state matrix. Historical concept screens/index are intentionally excluded.
const routes: [string, string][] = [
  ["/styleguide", "[data-testid=styleguide]"],
  ["/styleguide/templates", "h1"],
  ["/styleguide/shells/app", "h1"],
  ["/styleguide/shells/focused", "main"],
  ...["auth?state=sign-in", "projects?state=default", "settings?state=default", "credits?state=default", "landing?state=default", "status?state=not-found"].map((id): [string, string] => [`/styleguide/templates/${id}`, "h1"]),
  ["/prototypes/new-dub/page?state=ready", "[data-testid=new-dub]"],
  ["/prototypes/processing/page?state=running", "[data-testid=processing]"],
  ["/prototypes/processing/ready-elsewhere", "[role=status]"],
  ["/prototypes/studio/turn?state=saved", "[data-testid=studio]"],
  ["/prototypes/result/page?state=ready", "[data-testid=result]"],
  ["/prototypes/result/ready-elsewhere", "[role=status]"],
  ["/prototypes/001-recording-flow-mock/projects?state=default", "h1"],
  ["/prototypes/001-recording-flow-mock/result?state=ready", "[data-testid=result]"],
  ["/prototypes/001-recording-flow-mock/studio?state=recording-elsewhere", "[data-testid=studio]"],
  ...["", "/new-dub", "/processing", "/studio", "/result", "/001-recording-flow-mock"].map((id): [string, string] => [`/prototypes${id}`, "[data-testid=prototypes]"]),
];
for (const [route, selector] of routes) {
  test(`reference route: ${route}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(route);
    await expect(page.locator(selector).first()).toBeVisible();
    if (!selector.includes("prototypes")) await expect(page.getByTestId("prototypes")).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}
