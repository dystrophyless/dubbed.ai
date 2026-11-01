import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\//,'').replaceAll('/',path.sep));
const out=path.join(root,`wave-gap-diagnostic-${new Date().toISOString().replaceAll(':','').replaceAll('.','-')}`);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
const rows=[];
try {
 for(const [name,url] of [['prototype-A','http://127.0.0.1:5178/'],['app-A','http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en']]){
  const page=await browser.newPage({viewport:{width:1280,height:600},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.goto(url,{waitUntil:'networkidle'});
  if(name.startsWith('prototype'))await page.addStyleTag({content:'.lab,.fixture-credit{display:none!important}'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const v=document.querySelector('.scene video');return v instanceof HTMLVideoElement&&v.readyState>=2&&v.videoWidth>0;});
  await page.evaluate(text=>{const el=document.querySelector('#dialogue');if(!el)throw new Error('dialogue missing');el.textContent=text;},'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(out,`${name}.png`)});
  const measured=await page.evaluate(()=>{
   const selectors=['#main','#record-view','.rehearsal','.scene','.script','#dialogue','.timeline','.wave','#scrub','.timeline-meta','.performance','.line-context','#position','#saved','#compact-script-slot','.performance-actions','#replay','#record','#take','#take-help','.navigation','#previous','#next'];
   const nodes=Object.fromEntries(selectors.map(sel=>{const e=document.querySelector(sel);if(!e)return[sel,null];const r=e.getBoundingClientRect(),s=getComputedStyle(e);return[sel,{text:e.innerText?.trim(),html:e.outerHTML.slice(0,300),inlineStyle:e.getAttribute('style'),rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom},display:s.display,position:s.position,margin:s.margin,padding:s.padding,gap:s.gap,rowGap:s.rowGap,gridRowGap:s.gridRowGap,minHeight:s.minHeight,height:s.height,lineHeight:s.lineHeight,font:s.font,overflow:s.overflow}]}));
   const panel=document.querySelector('.performance');
   const ancestors=[];for(let e=panel;e&&ancestors.length<8;e=e.parentElement)ancestors.push({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:''});
   return{url:location.href,viewport:[innerWidth,innerHeight],scroll:[scrollX,scrollY],docHeight:document.documentElement.scrollHeight,compactPerformanceContextMatches:Boolean(document.querySelector('.compact-desktop .performance .line-context')),performanceAncestors:ancestors,nodes};
  });
  rows.push({target:name,...measured});
  await page.close();
 }
 const report={generatedAt:new Date().toISOString(),browser:browser.version(),rows};
 await fs.writeFile(path.join(out,'measurements.json'),JSON.stringify(report,null,2));
 process.stdout.write(JSON.stringify({out,rows},null,2));
}finally{await browser.close();}
