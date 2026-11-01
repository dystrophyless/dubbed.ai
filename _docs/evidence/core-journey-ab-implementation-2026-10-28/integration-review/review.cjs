const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const out = __dirname;
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context = await browser.newContext({viewport:{width:1440,height:900},permissions:['microphone'],acceptDownloads:true});
 const page = await context.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 const result={date:new Date().toISOString(),errors,cohorts:[]};
 for(const layout of ['A','B']) {
  await page.goto(`http://127.0.0.1:5180/projects/sintel-prepared/record?layout=${layout}&locale=en`);
  await page.getByRole('button',{name:'Record',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1000);
  result.cohorts.push({layout,geometry:await page.evaluate(()=>Object.fromEntries(['.record-header h1','.position-dots','.record-header__line-count','.media-viewport','.record-panel','.dialogue-copy','.waveform-row','.waveform-meta','.record-controls','.exit-link'].map(s=>{const e=document.querySelector(s);const r=e?.getBoundingClientRect();return[s,e?{text:e.textContent,display:getComputedStyle(e).display,rect:r?.toJSON(),html:s==='.exit-link'?e.outerHTML:undefined}:null]}))),buttons:await page.getByRole('button').allTextContents()});
  await page.screenshot({path:path.join(out,layout+'-1440x900.png')});
 }
 await fs.writeFile(path.join(out,'initial-browser.json'),JSON.stringify(result,null,2));
 for (const item of [{layout:'B',width:1280,height:600,locale:'ru',turn:'sintel-turn-3'},{layout:'A',width:1248,height:900,locale:'en'},{layout:'A',width:1247,height:900,locale:'en'},{layout:'A',width:390,height:667,locale:'ru'},{layout:'B',width:390,height:844,locale:'ru'}]) {
  await page.setViewportSize({width:item.width,height:item.height});
  await page.goto(`http://127.0.0.1:5180/projects/sintel-prepared/record?layout=${item.layout}&locale=${item.locale}${item.turn?'&turn='+item.turn:''}`);
  await page.getByRole('button',{name:item.locale==='ru'?'Записать':'Record',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(600);
  result.cohorts.push({case:item,geometry:await page.evaluate(()=>Object.fromEntries(['.record-header h1','.position-dots','.media-viewport','.record-panel','.dialogue-copy p','.record-controls','.reference-volume input'].map(s=>{const e=document.querySelector(s);return[s,e?{text:e.textContent,rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).fontSize}:null]})))});
  await page.screenshot({path:path.join(out,`${item.layout}-${item.width}x${item.height}-${item.locale}.png`)});
 }
 await fs.writeFile(path.join(out,'initial-browser.json'),JSON.stringify(result,null,2));
 await context.close();
 const journeyContext=await browser.newContext({viewport:{width:1440,height:900},permissions:['microphone'],acceptDownloads:true});
 const p=await journeyContext.newPage(); const proof={errors:[],native:[],checks:[]}; p.on('pageerror',e=>proof.errors.push(String(e)));
 await p.addInitScript(()=>{
  window.__review={gum:[],starts:[],videoPlay:[],delayVideo:false};
  const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=(...args)=>{window.__review.gum.push(performance.now());return gum(...args)};
  const start=MediaRecorder.prototype.start;
  MediaRecorder.prototype.start=function(...args){window.__review.starts.push(performance.now());return start.apply(this,args)};
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){if(this.tagName==='VIDEO'&&window.__review.delayVideo){window.__review.delayVideo=false;return new Promise(resolve=>setTimeout(resolve,1200)).then(()=>{window.__review.videoPlay.push(performance.now());return play.apply(this,args)})}return play.apply(this,args)};
 });
 await p.goto('http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en');
 await p.getByRole('button',{name:'Record',exact:true}).waitFor();
 await p.evaluate(()=>window.__review.delayVideo=true);
 for(let turn=1;turn<=3;turn++){
  await p.getByRole('button',{name:'Record',exact:true}).click();
  if(turn===1){await p.waitForTimeout(200);proof.checks.push({name:'capture-before-source-start',value:await p.evaluate(()=>({native:window.__review,videoTime:document.querySelector('video').currentTime,videoPaused:document.querySelector('video').paused,button:document.querySelector('.record-action').textContent}))});}
  await p.getByText('Take saved as a recoverable candidate. It has not been accepted.',{exact:true}).waitFor({timeout:20000});
  proof.checks.push({name:'capture-finished-'+turn,value:await p.evaluate(()=>({native:window.__review,videoTime:document.querySelector('video').currentTime,videoPaused:document.querySelector('video').paused}))});
  await p.getByRole('button',{name:'Next',exact:true}).click();
  if(turn<3)await p.waitForURL(url=>url.searchParams.get('turn')==='sintel-turn-'+(turn+1));
 }
 await p.getByRole('button',{name:'Download My dub',exact:true}).waitFor({timeout:15000});
 await p.getByRole('tab',{name:'My dub',exact:true}).waitFor();await p.waitForTimeout(1000);
 proof.checks.push({name:'result-entry',url:p.url(),value:await p.evaluate(()=>({scrollY,heading:document.querySelector('h1').getBoundingClientRect().toJSON(),video:{paused:document.querySelector('video').paused,time:document.querySelector('video').currentTime,duration:String(document.querySelector('video').duration)},buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,label:e.getAttribute('aria-label')}))}))});
 await p.screenshot({path:path.join(out,'result-1440x900.png')});
 await p.getByRole('tab',{name:'Original',exact:true}).click();await p.waitForTimeout(700);
 await p.locator('.result-player__seek').focus();await p.keyboard.down('ArrowRight');await p.keyboard.up('ArrowRight');await p.waitForTimeout(300);
 proof.checks.push({name:'paused-seek-release',value:await p.locator('video').evaluate(v=>({paused:v.paused,time:v.currentTime,duration:v.duration}))});
 const downloadEvent=p.waitForEvent('download');await p.getByRole('button',{name:'Download My dub',exact:true}).click();const dl=await downloadEvent;await dl.saveAs(path.join(out,'download-original-selected.webm'));proof.checks.push({name:'download-while-original',filename:dl.suggestedFilename(),sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(out,'download-original-selected.webm'))).digest('hex')});
 await p.getByRole('button',{name:'Return to recording',exact:true}).click();await p.getByRole('button',{name:'Record',exact:true}).waitFor();
 await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForURL(url=>url.searchParams.get('turn')==='sintel-turn-2');
 await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForURL(url=>url.searchParams.get('turn')==='sintel-turn-3');
 proof.checks.push({name:'completed-last-line-controls',value:await p.getByRole('button').allTextContents()});
 await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForTimeout(400);
 proof.checks.push({name:'completed-last-line-primary-click',url:p.url(),text:await p.locator('main').textContent()});
 await p.screenshot({path:path.join(out,'completed-last-line.png')});
 await fs.writeFile(path.join(out,'journey-browser.json'),JSON.stringify(proof,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
