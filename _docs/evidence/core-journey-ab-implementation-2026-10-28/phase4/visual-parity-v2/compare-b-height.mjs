import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const evidenceRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const outDir = path.join(evidenceRoot, `height-diagnostic-${stamp}`);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const measurements = [];
try {
  for (const [name, url] of [['prototype-B', 'http://127.0.0.1:5179/'], ['app-B', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en']]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle' });
    if (name.startsWith('prototype')) await page.addStyleTag({ content: '.lab,.fixture-credit{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => { const v=document.querySelector('.scene video'); return v instanceof HTMLVideoElement && v.readyState>=2 && v.videoWidth>0; });
    for (const viewport of [{name:'desktop-1440x900',width:1440,height:900},{name:'short-1280x600',width:1280,height:600}]) {
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const read = selector => { const e=document.querySelector(selector); if(!e)return null; const r=e.getBoundingClientRect(); const c=getComputedStyle(e); return {selector,x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,display:c.display,position:c.position,margin:c.margin,padding:c.padding,minHeight:c.minHeight,heightCss:c.height}; };
        return {scroll:[scrollX,scrollY],document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight},body:{className:document.body.className,margin:getComputedStyle(document.body).margin,padding:getComputedStyle(document.body).padding,minHeight:getComputedStyle(document.body).minHeight},root:read('#root'),product:read('#product'),main:read('#main'),header:read('.studio-header'),scene:read('.scene'),script:read('.script'),timeline:read('.timeline'),performance:read('.performance'),status:read('.take-status'),utilities:read('.studio-utilities'),footer:read('.fixture-credit'),lab:read('.lab')};
      });
      measurements.push({target:name,viewport,...layout});
    }
    await page.close();
  }
  const report={generatedAt:new Date().toISOString(),browser:browser.version(),browserTempPath:process.env.TEMP??null,measurements};
  await fs.writeFile(path.join(outDir,'measurements.json'),JSON.stringify(report,null,2));
  process.stdout.write(JSON.stringify({outDir,measurements},null,2));
} finally { await browser.close(); }
