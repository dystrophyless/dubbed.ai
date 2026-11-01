const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = __dirname, evidence = path.join(root, 'evidence');
const base = 'http://127.0.0.1:4379';
const proof = { capturedAt: new Date().toISOString(), baseline: '9d286621177200fdb5f61ef963d0b6818ae76774', fixtureBoundary: 'Existing Result harnesses; response interception changes only fixture locale or result service returned state. Product source, CSS, and controls unchanged. No app shell/navigation/auth or real rendering validation.', captures: [], assertions: [], errors: [] };
(async () => {
 const browser = await chromium.launch({headless:true,args:['--mute-audio','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 proof.browser = browser.version();
 const context = await browser.newContext({viewport:{width:1440,height:900}, acceptDownloads:true});
 const page = await context.newPage();
 page.on('pageerror', e=>proof.errors.push(e.message));
 await page.addInitScript(()=>{ document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement){e.target.muted=true;e.target.volume=0;}},true); });
 let locale='en', state='ready';
 await page.route('**/e2e/harness/result.tsx',async route=>{
   const response=await route.fetch(); let body=await response.text();
   body=body.replace('locale: "en"',`locale: "${locale}"`);
   if(state==='unknown-download') body=body.replace(/function terminalFailure\(\) \{[\s\S]*?\nfunction generationFor/,`function terminalFailure() { return {status:"unknown",operationId:"qa79-unknown-download",message:"Synthetic unknown request"}; }\nfunction generationFor`);
   if(state==='replacement') body=body.replace(/async load\(\) \{[\s\S]*?\n\t\t\},\n\t\tasync ensureAssembly/,`async load() { return ok({project:{...project,state:"assembling"}, currentGeneration, operation:{id:"qa79-replacement",state:"pending",revision:1}, retryAvailable:false});\n\t\t},\n\t\tasync ensureAssembly`);
   if(state==='unavailable') body=body.replace(/async load\(\) \{[\s\S]*?\n\t\t\},\n\t\tasync ensureAssembly/,`async load() { return errorResult();\n\t\t},\n\t\tasync ensureAssembly`);
   if(state==='descriptor-failure') body=body.replace(/async loadPlayback\(input\) \{[\s\S]*?\n\t\t\},\n\t\tasync refreshPlayback/,`async loadPlayback(input) { return errorResult();\n\t\t},\n\t\tasync refreshPlayback`);
   await route.fulfill({response,body});
 });
 async function capture(name, boundary){
   await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(250);
   const metrics=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.innerText||e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color,background:s.backgroundColor,opacity:s.opacity,borderRadius:s.borderRadius,outline:s.outline,disabled:e.disabled,ariaBusy:e.getAttribute('aria-busy'),tabIndex:e.tabIndex}};
    const v=document.querySelector('video');return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status})),buttons:[...document.querySelectorAll('button')].map(rect),headings:[...document.querySelectorAll('h1,h2')].map(rect),video:v?{...rect(v),src:v.getAttribute('src'),paused:v.paused,time:v.currentTime,duration:v.duration,error:v.error?.code}:null,progress:[...document.querySelectorAll('progress')].map(e=>({...rect(e),value:e.value})),bodyText:document.body.innerText};
   });
   const file=`${name}.png`; await page.screenshot({path:path.join(evidence,file),fullPage:false});
   proof.captures.push({name,file:`evidence/${file}`,boundary,metrics});
   console.log(name, metrics.document.width,metrics.buttons.map(b=>`${b.text}:${b.height}@${Math.round(b.y)}`).join(' | '));
 }
 async function ready(name,l,w,h,s='ready') {locale=l;state=s;await page.setViewportSize({width:w,height:h});await page.goto(base+'/e2e/harness/result.html'); await page.locator('h1').waitFor(); if(s!=='unavailable'&&s!=='descriptor-failure') await page.locator('video').waitFor(); await capture(name,`Seeded controlled Result harness; locale=${l}; state=${s}`);}
 try {
  for(const l of ['en','ru']) for(const [size,w,h] of [['desktop',1440,900],['short',1440,700],['phone',390,844]]) await ready(`ready-${l}-${size}`,l,w,h);
  for(const w of [767,768]) await ready(`ready-ru-${w}`,'ru',w,844);
  await ready('replacement-en-short','en',1440,700,'replacement');
  await ready('unavailable-en-short','en',1440,700,'unavailable');
  await ready('descriptor-failure-en-desktop','en',1440,900,'descriptor-failure');
  assert.equal(await page.getByRole('button',{name:'Retry playback',exact:true}).count(),0);proof.assertions.push('Initial non-ok playback descriptor produces no Retry playback control (confirmed UI absence).');
  for(const [scenario,l,w,h,name] of [['assembly-progress-known','ru',390,844,'assembly-known-ru-phone'],['assembly-progress-untrusted','en',1440,900,'assembly-unknown-en-desktop'],['assembly-retry-unknown','ru',1440,700,'assembly-failed-ru-short'],['playback-network-error','en',1440,900,'playback-error-en-desktop']]) {
   await page.setViewportSize({width:w,height:h});await page.goto(`${base}/e2e/harness/result-delivery-state.html?scenario=${scenario}&locale=${l}`); await page.locator('h1').waitFor();
   if(scenario==='playback-network-error') await page.getByRole('button',{name:'Retry playback',exact:true}).waitFor();
   await capture(name,'Existing explicitly synthetic result-delivery-state harness: '+scenario);
   if(scenario==='playback-network-error'){ await page.getByRole('button',{name:'Retry playback',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.getAttribute('src')==='/media/result-generation-001.mp4'); proof.playbackRecovery=await page.evaluate(()=>window.__resultDeliveryState.snapshot());assert.equal(proof.playbackRecovery.ensureAssemblyCalls,0);assert.equal(proof.playbackRecovery.creditCalls.length,0); }
  }
  await ready('generation1-en-baseline','en',1440,900);
  await page.locator('video').evaluate(async v=>{v.muted=true;await v.play();});await page.waitForFunction(()=>document.querySelector('video').currentTime>0.2);
  await page.getByRole('button',{name:'Download MP4',exact:true}).click();await page.evaluate(()=>window.__controlledResultHarness.publishGeneration2());await page.getByRole('button',{name:'Watch new',exact:true}).waitFor();
  await page.setViewportSize({width:1440,height:700});await capture('new-ready-download-pending-en-short','Old generation playing; activation-time download generation1 pending; generation2 published by controlled fixture API.');
  const busyButton=await page.getByRole('button',{name:'Preparing download…',exact:true}).evaluate(e=>({disabled:e.disabled,busy:e.getAttribute('aria-busy'),opacity:getComputedStyle(e).opacity}));proof.busyButton=busyButton;
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>window.__controlledResultHarness.failFirstDownload());await page.getByRole('button',{name:'Retry download version 1',exact:true}).waitFor();await capture('download-failed-en-desktop','Controlled first-download rejection; previous generation retained.');
  await page.getByRole('button',{name:'Watch new',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.getAttribute('src')==='/media/result-generation-002.mp4');
  assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.currentTime===0),true);
  await capture('new-displayed-old-download-error-en-desktop','Watch new selected generation2 paused; failed generation1 download remains separately retryable.');
  const d1=page.waitForEvent('download');await page.getByRole('button',{name:'Retry download version 1',exact:true}).click();const down1=await d1;proof.oldDownloadFile=down1.suggestedFilename();
  const d2=page.waitForEvent('download');await page.getByRole('button',{name:'Download MP4',exact:true}).click();const down2=await d2;proof.newDownloadFile=down2.suggestedFilename();
  proof.generationJournal=await page.evaluate(()=>window.__controlledResultHarness.snapshot());
  assert.deepEqual(proof.generationJournal.downloadCalls.map(x=>x.displayedGenerationId),['controlled-generation-001','controlled-generation-001','controlled-generation-002']); assert.equal(proof.generationJournal.assemblyCalls,0);assert.equal(proof.generationJournal.creditCalls.length,0);
  proof.assertions.push('Watch new resets to 0 paused; old retry targets generation1; next download targets generation2; no assembly/credit calls. Browser download events observed; no OS-save claim.');
  await ready('new-ready-ru-phone-baseline','ru',390,844);await page.locator('video').evaluate(async v=>{v.muted=true;await v.play()});await page.evaluate(()=>window.__controlledResultHarness.publishGeneration2());await page.getByRole('button',{name:'Смотреть новую',exact:true}).waitFor();await capture('new-ready-ru-phone','Controlled generation2 arrival while generation1 playing; no active download.');
  await page.getByRole('button',{name:'Смотреть новую',exact:true}).focus();await capture('watch-new-focus-ru-phone','Keyboard focus explicitly placed on Watch new; seeded replacement fixture.');
  proof.hiddenStatusStyle=await page.locator('.sr-only').evaluate(e=>({text:e.innerText,position:getComputedStyle(e).position,clip:getComputedStyle(e).clip,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  await ready('unknown-download-ru-phone-baseline','ru',390,844,'unknown-download');await page.getByRole('button',{name:'Скачать MP4',exact:true}).click();await page.evaluate(()=>window.__controlledResultHarness.failFirstDownload());await page.getByRole('button',{name:'Проверить и повторить скачивание версии 1',exact:true}).waitFor();await capture('unknown-download-ru-phone','Fixture request returns unknown; resulting localized reconciliation action uses unmodified Result component and CSS.');
 } catch(e){proof.errors.push(e.stack);console.error(e);process.exitCode=1;} finally {await fs.writeFile(path.join(root,'metrics.json'),JSON.stringify(proof,null,2));await fs.writeFile(path.join(root,'screenshot-manifest.json'),JSON.stringify(proof.captures.map(c=>({file:c.file,boundary:c.boundary})),null,2));await browser.close();}
})();
