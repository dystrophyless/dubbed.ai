import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '../../../../../../');
const fromFrontend = createRequire(path.join(root, 'frontend', 'package.json'));
const { chromium } = fromFrontend('playwright');
const outputDir = fs.mkdtempSync(path.join(scriptDir, 'header-render-'));
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dubbed-header-render-'));
const context = await chromium.launchPersistentContext(profileDir, { headless: true });
const targets = [
  { name: 'A-prototype', url: 'http://127.0.0.1:5178/' },
  { name: 'B-prototype', url: 'http://127.0.0.1:5179/' },
  { name: 'A-app', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en' },
  { name: 'B-app', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en' },
];
const viewports = [
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];
const captures = [];

for (const viewport of viewports) {
  for (const target of targets) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(target.url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);
    const header = await page.evaluate(() => {
      const info = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          text: element.innerText?.trim() || element.textContent?.trim() || '',
          box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          color: style.color,
          font: style.font,
          gridColumn: style.gridColumn,
          gridRow: style.gridRow,
        };
      };
      return {
        url: location.href,
        title: document.title,
        header: info('.record-header, .project-header, .studio-header'),
        heading: info('.record-header__title h1, #heading'),
        dots: info('.position-dots, #dots'),
        line: info('.record-header__line-count, #position'),
        media: info('.media-viewport, .scene'),
        dialogue: info('.dialogue-copy, .script'),
      };
    });
    const image = `${target.name}-${viewport.name}.png`;
    await page.screenshot({ path: path.join(outputDir, image), fullPage: false, animations: 'disabled' });
    captures.push({ target: target.name, viewport, image, ...header });
    await page.close();
  }
}

await context.close();
const report = {
  generatedAt: new Date().toISOString(),
  browserTempPath: profileDir,
  browserVersion: context.browser()?.version?.() ?? null,
  outputDir,
  captures,
};
fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputDir, browserTempPath: profileDir, count: captures.length, captures: captures.map(({ target, viewport, image, heading, dots, line, media, dialogue }) => ({ target, viewport: viewport.name, image, heading, dots, line, media, dialogue })) }, null, 2));
