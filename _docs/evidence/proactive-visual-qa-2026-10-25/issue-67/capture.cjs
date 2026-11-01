const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const out = path.join(root, 'evidence');
fs.mkdirSync(out, {recursive:true});
const origin='http://127.0.0.1:4367';
const mode=process.argv[2] || 'mock';
const metrics=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--mute-audio','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const cases=mode==='real' ? [
 ['real-en-desktop','en',1440,900,'/'], ['real-ru-phone','ru',390,844,'/projects/example/result']
 ] : mode==='extra' ? [
 ['signin-ru-desktop','ru',1440,900,'/sign-in'], ['signin-en-phone','en',390,844,'/sign-in'],
 ['storage-open-denied-en-desktop','en',1440,900,'/','open']
 ] : [
 ['landing-en-desktop','en',1440,900,'/'], ['signin-en-short','en',1440,700,'/sign-in'],
 ['signin-ru-phone','ru',390,844,'/sign-in'], ['signin-ru-767','ru',767,900,'/sign-in'],
 ['signin-ru-768','ru',768,900,'/sign-in'], ['storage-absent-en-desktop','en',1440,900,'/','absent'],
 ['storage-absent-ru-phone','ru',390,844,'/','absent'],
 ['storage-denied-en-desktop','en',1440,900,'/','denied'],
 ['storage-local-absent-ru-phone','ru',390,844,'/','local'],
 ['deep-link-en-desktop','en',1440,900,'/projects/qa67-project/result']
 ];
 for(const [name,locale,width,height,url,fault] of cases){
  const context=await browser.newContext({viewport:{width,height},locale:locale==='ru'?'ru-RU':'en-US'});
  await context.addInitScript(({locale,fault})=>{
   if(fault!=='local')localStorage.setItem('dubbed.locale',locale);
   if(fault==='absent')Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined});
   if(fault==='denied')Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('Storage access denied','SecurityError')}});
   if(fault==='open')Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw new DOMException('Storage access denied','SecurityError')}}});
   if(fault==='local')Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage access denied','SecurityError')}});
  },{locale,fault});
  const page=await context.newPage(); const errors=[];const external=[];const consoles=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')consoles.push(m.text())});
  page.on('request',r=>{const u=new URL(r.url());if(/^https?:$/.test(u.protocol)&&u.origin!==origin)external.push(r.url())});
  await page.goto(origin+url); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(550);
  if(name.startsWith('deep-link')){await page.reload();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350)}
  const data=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,url:location.href,text:document.body.innerText,viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight})),elements:[...document.querySelectorAll('h1,h2,p,button,input,select,a')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,120),x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,borderRadius:s.borderRadius,color:s.color,background:s.backgroundColor}})}));
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});
  metrics.push({name,mode,fault:fault||null,...data,errors,consoleErrors:consoles,externalRequests:external});
  console.log(JSON.stringify({name,url:data.url,text:data.text.slice(0,180),errors,externalRequests:external,overflow:data.overflow}));
  await context.close();
 }
 fs.writeFileSync(path.join(root,mode==='mock'?'metrics.json':`metrics-${mode}.json`),JSON.stringify({capturedAt:new Date().toISOString(),browser:browser.version(),origin,metrics},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
