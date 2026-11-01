const { chromium }=require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs=require('node:fs/promises');const path=require('node:path');const crypto=require('node:crypto');
const out=__dirname;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['microphone'],acceptDownloads:true});const p=await context.newPage();const proof={checks:[],errors:[],physicalMicrophone:false};p.on('pageerror',e=>proof.errors.push(String(e)));
 await p.addInitScript(()=>{window.__native={gum:0,starts:0};const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...a)=>{window.__native.gum++;if(window.__denyOnce){window.__denyOnce=false;return Promise.reject(new DOMException('Review denied input','NotAllowedError'))}return gum(...a)};const start=MediaRecorder.prototype.start;MediaRecorder.prototype.start=function(...a){window.__native.starts++;return start.apply(this,a)}});
 await p.goto('http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en');await p.getByRole('button',{name:'Record',exact:true}).waitFor();
 proof.checks.push({name:'no-autocapture',value:await p.evaluate(()=>window.__native)});
 await p.evaluate(()=>window.__denyOnce=true);await p.getByRole('button',{name:'Record',exact:true}).click();await p.locator('.recovery-toast').waitFor();await p.waitForTimeout(500);
 proof.checks.push({name:'popup-shape',value:await p.locator('.recovery-toast').evaluate(e=>({text:e.textContent,html:e.innerHTML,rect:e.getBoundingClientRect().toJSON(),color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius}))});await p.screenshot({path:path.join(out,'B-phone-permission-popup.png')});await p.waitForTimeout(8200);
 proof.checks.push({name:'popup-expired-durable-guidance',toastCount:await p.locator('.recovery-toast').count(),notice:await p.locator('.record-status--b').textContent(),settings:await p.getByRole('button',{name:'Open Settings boundary',exact:true}).count()});
 for(let turn=1;turn<=3;turn++){await p.getByRole('button',{name:'Record',exact:true}).click();await p.getByText('Take saved as a recoverable candidate. It has not been accepted.',{exact:true}).waitFor({timeout:20000});await p.getByRole('button',{name:'Next',exact:true}).click();if(turn<3)await p.waitForURL(u=>u.searchParams.get('turn')==='sintel-turn-'+(turn+1));}
 await p.getByRole('button',{name:'Download My dub',exact:true}).waitFor();await p.waitForTimeout(800);
 proof.checks.push({name:'native-capture-counts',value:await p.evaluate(()=>window.__native)});
 proof.checks.push({name:'durable-media',value:await p.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('dubbed-core-local-v1');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=s=>new Promise((res,rej)=>{const q=db.transaction(s,'readonly').objectStore(s).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const [projects,media,operations,snapshots,jobs]=await Promise.all(['projects','media','operations','snapshots','resultJobs'].map(read)).catch(async()=>[await read('projects'),await read('media'),await read('operations'),await read('snapshots'),[]]);db.close();
  return {projects,media:await Promise.all(media.map(async m=>({id:m.id,turnId:m.turnId,byteSize:m.byteSize,blobSize:m.blob.size,sha256:m.sha256,actualSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await m.blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''),probe:m.probe}))),operations,snapshots,jobs};
 })});
 await p.screenshot({path:path.join(out,'B-phone-result.png')});
 const cdp=await context.newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const dom=await cdp.send('DOM.getDocument');const heading=await cdp.send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'.result-header h1'});proof.checks.push({name:'actual-platform-font',value:await cdp.send('CSS.getPlatformFontsForNode',{nodeId:heading.nodeId})});
 await p.setViewportSize({width:1280,height:600});await p.screenshot({path:path.join(out,'B-result-1280x600.png')});proof.checks.push({name:'short-result-fit',value:await p.evaluate(()=>({heading:document.querySelector('h1').getBoundingClientRect().toJSON(),player:document.querySelector('.result-player').getBoundingClientRect().toJSON(),actions:document.querySelector('.result-workspace__actions').getBoundingClientRect().toJSON(),viewportHeight:innerHeight}))});await p.setViewportSize({width:390,height:844});
 proof.checks.push({name:'phone-targets',value:await p.evaluate(()=>Object.fromEntries(['.result-player__seek','.result-player__volume input','.result-player__source-tabs button'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])))});
 await p.getByRole('tab',{name:'Original',exact:true}).click();await p.waitForTimeout(500);await p.getByRole('tab',{name:'Original',exact:true}).focus();await p.keyboard.press('ArrowRight');
 proof.checks.push({name:'result-tab-arrow-right',value:await p.getByRole('tab',{selected:true}).allTextContents()});
 await p.evaluate(async()=>{const {IndexedDbProjectStore}=await import('/src/services/mock/IndexedDbProjectStore.ts');const proto=IndexedDbProjectStore.prototype;const original=proto.readGenerationMedia;proto.readGenerationMedia=async function(scope,id){const payload=await original.call(this,scope,id);const project=await this.loadPreparedProject(scope);await this.tombstoneProject(scope,project.revision,'review-delete:'+crypto.randomUUID());window.__deletedBeforeDelivery=true;return payload;};});
 let download=null;p.once('download',d=>{download=d});await p.getByRole('button',{name:'Download My dub',exact:true}).click();await p.waitForTimeout(1200);
 proof.checks.push({name:'tombstone-before-download-delivery',deleted:await p.evaluate(()=>window.__deletedBeforeDelivery),downloadOccurred:Boolean(download),visibleResult:await p.locator('.result-player').isVisible()});if(download)await download.saveAs(path.join(out,'download-after-tombstone.mp4'));
 await fs.writeFile(path.join(out,'seams-browser.json'),JSON.stringify(proof,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
