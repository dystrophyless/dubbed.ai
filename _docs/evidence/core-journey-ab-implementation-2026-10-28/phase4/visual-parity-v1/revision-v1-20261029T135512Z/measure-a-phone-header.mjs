import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts?.ready);
const measurement = await page.evaluate(() => {
  const inspect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const point = document.elementFromPoint(rect.x + Math.min(rect.width / 2, innerWidth / 2), rect.y + Math.min(rect.height / 2, innerHeight / 2));
    return { text: element.textContent?.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      display: style.display, visibility: style.visibility, opacity: style.opacity, color: style.color,
      font: style.font, lineHeight: style.lineHeight, margin: style.margin, transform: style.transform,
      hit: point ? { tag: point.tagName, className: point.className, text: point.textContent?.trim() } : null };
  };
  return { at: new Date().toISOString(), url: location.href, viewport: { width: innerWidth, height: innerHeight },
    header: inspect('.record-header'), titleContainer: inspect('.record-header__title'), title: inspect('.record-header__title h1'),
    dots: inspect('.position-dots'), dotsItems: [...document.querySelectorAll('.position-dots li')].map((dot) => {
      const rect = dot.getBoundingClientRect(); const style = getComputedStyle(dot);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: style.backgroundColor, display: style.display, visibility: style.visibility, opacity: style.opacity };
    }), exit: inspect('.record-header .exit-link'), media: inspect('.media-viewport') };
});
const screenshotPath = path.join(outDir, `a-phone-header-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.png`);
await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' });
const outputPath = path.join(outDir, `a-phone-header-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`);
await fs.writeFile(outputPath, JSON.stringify({ browserTempPath: os.tmpdir(), screenshotPath, ...measurement }, null, 2), 'utf8');
process.stdout.write(JSON.stringify({ outputPath, screenshotPath, ...measurement }, null, 2));
await browser.close();
