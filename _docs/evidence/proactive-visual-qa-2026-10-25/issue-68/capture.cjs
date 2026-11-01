const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test');
const fs=require('fs'); const path=require('path');
const root=__dirname; const results=[];
(async()=>{const browser=await chromium.launch({headless:true,args:['--mute-audio','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
for(const entry of [
['unavailable-en-desktop','projects','projects-list-error','en',1440,900],
['unavailable-ru-phone','projects','projects-list-error','ru',390,844],
['loading-en-short','projects','projects-list-pending','en',1440,700],
['loading-ru-phone','projects','projects-list-pending','ru',390,844],
['unknown-en-desktop','credits','credits-checkout-unknown','en',1440,900],
['unknown-ru-phone','credits','credits-checkout-unknown','ru',390,844],
['unavailable-ru-767','projects','projects-list-error','ru',767,844],
['unavailable-ru-768','projects','projects-list-error','ru',768,844]
]){const [name,screen,scenario,locale,width,height]=entry;const context=await browser.newContext({viewport:{width,height},locale,deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:4368/e2e/harness/workspace-state-visual.html?screen=${screen}&scenario=${scenario}&locale=${locale}`); await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(550);
if(name.startsWith('unknown')){ console.log(name,await page.locator('button').allTextContents()); const buy=page.getByRole('button',{name:locale==='ru'?/Начать пробную покупку/:/Start mock checkout/}).first(); if(await buy.count()) await buy.click(); await page.waitForTimeout(250);}
const data=await page.evaluate(()=>({body:document.body.innerText, viewport:{width:innerWidth,height:innerHeight},overflow:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},fontLoaded:document.fonts.check('16px "Mabry Pro"'),calls:window.__workspaceStateVisual?.calls,controls:[...document.querySelectorAll('button,a,input')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.innerText||e.getAttribute('aria-label')||e.getAttribute('placeholder'),tag:e.tagName,x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,size:s.fontSize,line:s.lineHeight,disabled:e.disabled}})}));
await page.screenshot({path:path.join(root,'evidence',name+'.png'),fullPage:true});results.push({name,screen,scenario,locale,errors,...data});await context.close();}
fs.writeFileSync(path.join(root,'metrics.json'),JSON.stringify({capturedAt:new Date().toISOString(),baseline:'9d286621177200fdb5f61ef963d0b6818ae76774',mode:'controlled existing workspace-state-visual adapter harness; browser screenshots fresh; no backend'},null,2));fs.writeFileSync(path.join(root,'capture-log.json'),JSON.stringify(results,null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});

