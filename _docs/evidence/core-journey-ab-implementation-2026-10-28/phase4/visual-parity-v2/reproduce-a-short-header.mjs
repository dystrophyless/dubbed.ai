import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\//,'').replaceAll('/',path.sep));
const out=path.join(root,`header-repro-${new Date().toISOString().replaceAll(':','').replaceAll('.','-')}`);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>{const v=document.querySelector('.scene video');return v instanceof HTMLVideoElement&&v.readyState>=2&&v.videoWidth>0;});
 await page.screenshot({path:path.join(out,'desktop-before-resize.png')});
 await page.setViewportSize({width:1280,height:600});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(text=>{const dialogue=document.querySelector('#dialogue');if(!dialogue)throw new Error('dialogue missing');dialogue.textContent=text;},'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const describe=()=>page.evaluate(()=>Object.fromEntries(['.project-header','.project-heading','#heading','#dots','#exit','.scene'].map(sel=>{const e=document.querySelector(sel);if(!e)return[sel,null];const c=getComputedStyle(e),r=e.getBoundingClientRect();return[sel,{text:e.textContent?.trim(),rect:{x:r.x,y:r.y,width:r.width,height:r.height},display:c.display,visibility:c.visibility,opacity:c.opacity,color:c.color,font:c.font,animationName:c.animationName,animationDuration:c.animationDuration,animationPlayState:c.animationPlayState,transform:c.transform}]})));
 const before=await describe();
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(out,'first-settled-screenshot.png')});
 const afterFirst=await describe();
 await page.waitForTimeout(100);
 await page.screenshot({path:path.join(out,'second-settled-screenshot.png')});
 const afterSecond=await describe();
 const report={createdAt:new Date().toISOString(),url:page.url(),viewport:page.viewportSize(),scroll:await page.evaluate(()=>[scrollX,scrollY]),fonts:await page.evaluate(()=>document.fonts.status),before,afterFirst,afterSecond};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 process.stdout.write(JSON.stringify({out,report},null,2));
}finally{await browser.close();}
