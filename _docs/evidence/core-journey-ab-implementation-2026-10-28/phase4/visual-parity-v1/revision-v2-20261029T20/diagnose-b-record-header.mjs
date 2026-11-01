import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const out = path.join(root, `header-diagnostic-${Date.now()}`);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  const results = [];
  for (const [name, url] of [
    ['prototype', 'http://127.0.0.1:5179/'],
    ['app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
    await page.evaluate(() => document.fonts?.ready);
    const data = await page.evaluate(() => {
      const details = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          display: style.display, visibility: style.visibility, opacity: style.opacity, color: style.color,
          font: style.font, zIndex: style.zIndex, position: style.position, clipPath: style.clipPath,
          transform: style.transform, overflow: style.overflow, textIndent: style.textIndent,
          textFill: style.webkitTextFillColor, textShadow: style.textShadow, mixBlendMode: style.mixBlendMode,
          filter: style.filter, contentVisibility: style.contentVisibility, lineClamp: style.webkitLineClamp,
          clientRects: [...element.getClientRects()].map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
          fontLoaded: document.fonts.check(style.font),
        };
      };
      const center = document.querySelector('.record-header__title, .studio-title');
      const rect = center?.getBoundingClientRect();
      const point = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
      return {
        url: location.href,
        header: details('.record-header, .studio-header'),
        titleContainer: details('.record-header__title, .studio-title'),
        heading: details('.record-header__title h1, #heading'),
        dots: details('.position-dots, #dots'),
        lineCount: details('.record-header__line-count, #position'),
        centerHit: point ? { tag: point.tagName, className: point.className, text: point.textContent?.trim() } : null,
      };
    });
    await page.screenshot({ path: path.join(out, `${name}-b-header.png`), fullPage: false });
    if (name === 'app') await page.screenshot({ path: path.join(out, 'app-title-crop.png'), clip: { x: 450, y: 8, width: 530, height: 68 } });
    results.push(data);
    await page.close();
  }
  const evidence = { at: new Date().toISOString(), browser: `Chrome ${browser.version()}`, browserTempPath: os.tmpdir(), results };
  await fs.writeFile(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify({ out, results }, null, 2));
} finally { await browser.close(); }
