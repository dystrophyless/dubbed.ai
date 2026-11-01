import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
const browser = await chromium.launch({headless:true, executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
const pages = [
  {name:'A-prototype-desktop',url:'http://127.0.0.1:5178/',width:1440,height:900},
  {name:'A-app-desktop',url:'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en',width:1440,height:900},
  {name:'A-prototype-phone',url:'http://127.0.0.1:5178/',width:390,height:844},
  {name:'A-app-phone',url:'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en',width:390,height:844},
];
const data=[];
for(const spec of pages){const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();await page.goto(spec.url,{waitUntil:'networkidle'});await page.waitForFunction(()=>{const v=document.querySelector('.scene video,.media-viewport video');return !v||v.readyState>=2;});data.push(await page.evaluate(({name})=>{const list=name.includes('prototype')?['.timeline','.wave','.timeline-meta','.timeline-meta > span','.timeline-meta label','#volume']:['.waveform-stack','.waveform-row','.waveform-meta','.waveform-meta > span','.reference-volume','.reference-volume > span','.reference-volume input'];const read=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,cssHeight:c.height,minHeight:c.minHeight,margin:c.margin,padding:c.padding,flex:c.flex,justifyContent:c.justifyContent,alignItems:c.alignItems,gap:c.gap}};return{name,elements:Object.fromEntries(list.map(s=>[s,read(s)]))};},{name:spec.name}));await context.close();}
console.log(JSON.stringify(data,null,2));await browser.close();
