const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
(async()=>{
const dir='D:/Program/python/Dubbed/_docs/evidence/frontend-implementation-2026-10-23/native-zoom-current';
const old=JSON.parse(await fs.readFile(path.join(dir,'metrics.json'),'utf8'));
if(old.outcome==='failed') await fs.copyFile(path.join(dir,'metrics.json'),path.join(dir,'metrics-partial-selector-failure.json'));
if(old.states.some(s=>['new','projects','credits','account','microphone'].some(n=>s.name.startsWith(n+'-')) && s.headings.some(h=>h==='Sign in'||h==='Войти'))) await fs.writeFile(path.join(dir,'metrics-redirect-coverage-invalid.json'),JSON.stringify({...old,outcome:'invalid-coverage',limitation:'Protected route captures showed Sign in after session did not survive browser context recreation. Superseded only by explicit route assertion and fresh UI registration.'},null,2));
const output={date:new Date().toISOString(),boundary:"Isolated post-focus build index-BfIsfSkx.js; actual CDP native zoom2; fresh visible mock email registration; intended routes asserted; muted output and no microphone capture.",profile:old.profile,states:[],errors:[]};
const context=await chromium.launchPersistentContext(old.profile,{channel:'chromium',headless:true,viewport:null,args:['--mute-audio','--window-size=1440,960']});
await context.addInitScript(()=>{const mute=()=>document.querySelectorAll('audio,video').forEach(e=>{e.muted=true;e.volume=0});new MutationObserver(mute).observe(document,{childList:true,subtree:true});document.addEventListener('play',mute,true);});
const page=context.pages()[0]||await context.newPage();
page.on('pageerror',e=>output.errors.push(e.message));
const cdp=await context.newCDPSession(page);
try {
for(const [name,url] of [['landing','/'],['sign-in','/sign-in'],['registration','/register'],['reset','/reset-password'],['new','/new'],['projects','/projects'],['credits','/credits'],['account','/account'],['microphone','/microphone?origin=new']]) {
if(name==='new') {
 await page.goto('http://127.0.0.1:4281/register');
 await page.getByRole('banner').locator('select').selectOption('en');
 await page.getByLabel('Email',{exact:true}).fill('nativezoom-'+Date.now()+'@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Zoom-proof-password-42');
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 const notice=page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i);
 await notice.waitFor();
 const code=(await notice.innerText()).match(/\b\d{6}\b/)[0];
 await page.getByLabel('6-digit verification code').fill(code);
 await page.getByRole('heading',{name:'New dub',exact:true}).waitFor();
}
await page.goto('http://127.0.0.1:4281'+url);
for(const locale of ['en','ru']) {
await page.getByRole('banner').locator('select').selectOption(locale);
await page.locator('main h1').waitFor();
if(new URL(page.url()).pathname!==new URL('http://127.0.0.1:4281'+url).pathname)throw Error('Unexpected route redirect: '+page.url());
await page.evaluate(()=>document.fonts.ready);
await page.waitForTimeout(150);
const metrics=await page.evaluate(()=>({innerWidth,outerWidth,dpr:devicePixelRatio,bodyZoom:getComputedStyle(document.body).zoom,overflow:document.documentElement.scrollWidth>innerWidth,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent),fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight}))}));
const viewport=(await cdp.send('Page.getLayoutMetrics')).cssVisualViewport;
if(viewport.zoom!==2)throw Error('Expected actual native browser zoom 2, got '+viewport.zoom);
if(metrics.overflow)throw Error('Horizontal overflow on '+name+'-'+locale);
output.states.push({name:name+'-'+locale,url,...metrics,cdpZoom:viewport.zoom,viewport});
const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
await fs.writeFile(path.join(dir,name+'-'+locale+'.png'),Buffer.from(shot.data,'base64'));
}
}
output.outcome=output.errors.length?'failed':'passed';
} catch(e){output.outcome='failed';output.failure=String(e);output.url=page.url();process.exitCode=1;}
finally{await fs.writeFile(path.join(dir,'metrics.json'),JSON.stringify(output,null,2));await context.close();}
console.log(JSON.stringify({outcome:output.outcome,states:output.states.length,errors:output.errors,failure:output.failure}));
})();


