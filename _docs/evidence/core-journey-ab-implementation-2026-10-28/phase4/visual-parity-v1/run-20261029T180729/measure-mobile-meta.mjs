import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
const browser = await chromium.launch({headless:true, executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
const pages = [
  {name:'B-prototype',url:'http://127.0.0.1:5179/'},
  {name:'B-app',url:'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en'},
];
const measurements=[];
for (const spec of pages) {
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page = await context.newPage();
  await page.goto(spec.url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const v=document.querySelector('.scene video,.media-viewport video');return !v||v.readyState>=2;});
  measurements.push(await page.evaluate(({name})=>{
    const selectors = name==='B-prototype'
      ? ['.timeline','.wave','.timeline-meta','.timeline-meta > span','.timeline-meta label','#volume']
      : ['.waveform-stack','.waveform-row','.waveform-meta','.waveform-meta > span','.reference-volume','.reference-volume > span','.reference-volume input','.record-studio-actions','.record-action'];
    const rect = (e)=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,flex:s.flex,flexWrap:s.flexWrap,alignItems:s.alignItems,justifyContent:s.justifyContent,gap:s.gap,margin:s.margin,padding:s.padding,minHeight:s.minHeight,height:s.height,widthCss:s.width,background:s.backgroundColor};};
    return {name,viewport:{width:innerWidth,height:innerHeight},elements:Object.fromEntries(selectors.map(s=>[s,rect(document.querySelector(s))]))};
  },{name:spec.name}));
  await context.close();
}
await fs.writeFile(new URL('./mobile-meta.json',import.meta.url),JSON.stringify(measurements,null,2));
console.log(JSON.stringify(measurements,null,2));
await browser.close();
