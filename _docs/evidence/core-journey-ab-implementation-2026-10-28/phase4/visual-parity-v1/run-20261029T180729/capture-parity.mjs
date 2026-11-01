import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const outDir = process.env.PARITY_OUT;
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', args: ['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
const viewports = [{name:'desktop-1440x900',width:1440,height:900},{name:'short-1280x600',width:1280,height:600},{name:'phone-390x844',width:390,height:844}];
const pages = [
 {name:'A-prototype',url:'http://127.0.0.1:5178/'}, {name:'B-prototype',url:'http://127.0.0.1:5179/'},
 {name:'A-app',url:'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'}, {name:'B-app',url:'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en'}
];
const metrics=[];
for (const viewport of viewports) for (const spec of pages) {
 const context = await browser.newContext({ viewport: {width:viewport.width,height:viewport.height}, deviceScaleFactor: 1, reducedMotion:'reduce', acceptDownloads:true });
 const page = await context.newPage();
 await page.goto(spec.url,{waitUntil:'networkidle',timeout:30000});
 await page.waitForFunction(() => {
  const video = document.querySelector('.scene video, .media-viewport video');
  return !video || video.readyState >= 2;
 }, null, {timeout: 15000});
 await page.evaluate(() => document.fonts.ready);
 await page.evaluate(() => {
  for (const video of document.querySelectorAll('video')) {
   video.pause();
   if (video.currentTime > 0) video.currentTime = 0;
  }
 });
 const data=await page.evaluate(()=>{
  const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();const c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,font:c.font,fontFamily:c.fontFamily,fontSize:c.fontSize,lineHeight:c.lineHeight,margin:c.margin,padding:c.padding,gap:c.gap,color:c.color,backgroundColor:c.backgroundColor,borderRadius:c.borderRadius,display:c.display,position:c.position}};
  return {url:location.href,viewport:{width:innerWidth,height:innerHeight},scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,y:scrollY},title:document.title,bodyFont:getComputedStyle(document.body).fontFamily,header:rect('.project-header, .studio-header, .record-header'),titleNode:rect('#heading, .record-header__title, .project-heading, .studio-title'),dots:rect('#dots, .position-dots'),exit:rect('#exit, .exit-link, .workspace-exit'),media:rect('.scene, .media-viewport, .record-stage'),video:rect('.scene video, .media-viewport video, .record-stage video'),caption:rect('.script, .dialogue-copy, .record-script'),dialogue:rect('#dialogue, .dialogue-copy p, .record-script p'),wave:rect('.wave, .waveform-row, .timeline'),meta:rect('.timeline-meta, .waveform-meta'),panel:rect('.performance, .record-panel'),actions:rect('.performance-actions, .record-controls, .studio-controls'),saved:rect('#saved, .take-status'),lab:rect('.lab, .layout-lab'),result:rect('.result-workspace')};
 });
 data.browserTempPath = os.tmpdir();
 const file=spec.name+'-'+viewport.name+'.png';
 await page.screenshot({path:path.join(outDir,file),fullPage:false});
 metrics.push({spec:spec.name,viewport:viewport.name,...data});
 await context.close();
}
await fs.writeFile(path.join(outDir,'metrics.json'),JSON.stringify(metrics,null,2));
await browser.close();
console.log(JSON.stringify({outDir:outDir,count:metrics.length},null,2));
