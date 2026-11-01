import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'overflow-b-short-' + new Date().toISOString().replaceAll(':', '').replaceAll('.', '-'));
const report = { at: new Date().toISOString(), browserTempPath: os.tmpdir(), rows: [] };
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  report.browser = `Chrome ${browser.version()}`;
  for (const target of ['prototype', 'app']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 600 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const url = target === 'prototype' ? 'http://127.0.0.1:5179/' : 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (target === 'prototype') await page.addStyleTag({ content: '.lab,.fixture-credit{display:none!important}' });
    await page.waitForFunction(() => { const v=document.querySelector('.scene video'); return document.fonts?.status==='loaded' && v instanceof HTMLVideoElement && v.readyState>=2 && v.videoWidth>0; }, null, { timeout: 25000 });
    await page.evaluate(() => window.scrollTo(0,0));
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const rect = e => { const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return {tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'',text:(e.textContent||'').trim().slice(0,80),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,position:s.position,display:s.display,visibility:s.visibility,overflow:s.overflow}; };
      const nodes=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.position!=='fixed'&&(r.bottom>innerHeight+.5||r.right>innerWidth+.5);}).map(rect).sort((a,b)=>b.bottom-a.bottom).slice(0,30);
      return {url:location.href,scroll:[scrollX,scrollY],viewport:[innerWidth,innerHeight],document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},html:{clientHeight:document.documentElement.clientHeight,scrollHeight:document.documentElement.scrollHeight},body:{...rect(document.body),scrollHeight:document.body.scrollHeight},root:rect(document.querySelector('#root')||document.querySelector('#product')),overflowNodes:nodes};
    });
    report.rows.push({target,...metrics});
    await context.close();
  }
  report.finishedAt=new Date().toISOString();
  await fs.writeFile(path.join(outDir,'evidence.json'),JSON.stringify(report,null,2),'utf8');
  process.stdout.write(JSON.stringify({outDir,browser:report.browser,browserTempPath:report.browserTempPath,rows:report.rows},null,2));
} finally { await browser.close(); }
