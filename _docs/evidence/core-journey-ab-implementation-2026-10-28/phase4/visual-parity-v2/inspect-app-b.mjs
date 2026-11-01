import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const video = document.querySelector('.scene video');
    return video instanceof HTMLVideoElement && video.readyState >= 2 && video.videoWidth > 0;
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await page.evaluate(() => {
    const selectors = ['#product', '#main', '.studio-header', '.studio-title', '.studio-title h1', '#dots', '#exit', '.scene'];
    const nodes = Object.fromEntries(selectors.map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return [selector, null];
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return [selector, { text: el.textContent?.trim(), html: el.outerHTML.slice(0, 500), rect: { x:r.x,y:r.y,width:r.width,height:r.height }, display:s.display, visibility:s.visibility, opacity:s.opacity, color:s.color, font:s.font, transition:s.transition, animation:s.animation }];
    }));
    return { url: location.href, viewport: [innerWidth, innerHeight], scroll: [scrollX,scrollY], nodes, body: { className:document.body.className, color:getComputedStyle(document.body).color, children:[...document.body.children].map(el=>({tag:el.tagName,id:el.id,cls:el.className,html:el.outerHTML.slice(0,300)})) } };
  });
  process.stdout.write(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
