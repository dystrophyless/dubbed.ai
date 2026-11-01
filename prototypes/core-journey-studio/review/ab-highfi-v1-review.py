import json,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;checks=[];geometry=[];errors=[]
variants=[('A',5178,'dubbed-lowfi-v1'),('B',5179,'dubbed-studio-lowfi-v1')]
def check(n,ok,d=None):
 checks.append({'name':n,'pass':bool(ok),'detail':d})
 if not ok:print('CONCERN',n,d,flush=True)
def ctx(browser,w,h,key,seed=None):
 c=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference',has_touch=w<768)
 if seed:c.add_init_script('if(!localStorage.getItem('+json.dumps(key)+'))localStorage.setItem('+json.dumps(key)+','+json.dumps(json.dumps(seed))+');')
 return c
def openpage(c,port):
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:'+str(port));page.wait_for_function('document.querySelector("#scene").readyState>=3');page.wait_for_timeout(200);return page
def state(page,key):return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key)
def lab(page,k,v=True):
 if not page.locator('.lab details').get_attribute('open'):page.locator('.lab summary').click()
 if k=='locale':page.locator('#locale').select_option(v)
 else:page.locator('#'+k).set_checked(v)
 page.locator('.lab summary').click()
def shot(page,label):page.screenshot(path=str(out/('ab-hf1-review-'+label+'.png')))
def geom(page,label):
 g=page.evaluate('''()=>{let r=s=>{let e=document.querySelector(s),a=e.getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,bottom:a.bottom,right:a.right}};return {viewport:[innerWidth,innerHeight],scrollY,scene:r('.scene'),dialogue:r('#dialogue'),wave:r('.wave'),timeline:r('.timeline'),performance:r('.performance'),next:r('#next'),position:document.querySelector('#position').textContent}}''');geometry.append({'label':label,**g});return g
def capture(page):
 page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")')
def finish(page):page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)
def readyresult(page):page.wait_for_function('!document.querySelector("#result-player").hidden&&!document.querySelector("#result-play").disabled',timeout=10000)
def exitbutton(page,v):return page.locator('[data-destination="My projects"]') if v=='A' else page.locator('#exit')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browser=b.version
 for variant,port,key in variants:
  # Actual matched fresh journeys,then replacement/guard/notice/reload and completed-end refinement.
  c=ctx(b,1440,900,key);page=openpage(c,port);geom(page,variant+' desktop normal');shot(page,variant+'-desktop-normal')
  check(variant+' empty Next blocked',page.locator('#next').is_disabled())
  check(variant+' no legend/speaker/retired feature',page.locator('#speaker,.wave-key,#take-key,.original-key').count()==0 and 'Shaman' not in page.locator('#product').inner_text() and 'Process again' not in page.locator('#product').inner_text())
  page.locator('#replay').click();page.wait_for_timeout(450);page.locator('#pause').click();t=page.locator('#scene').evaluate('v=>v.currentTime');page.wait_for_timeout(180);check(variant+' listening Pause preserves time',abs(page.locator('#scene').evaluate('v=>v.currentTime')-t)<.03);page.locator('#pause').click();page.wait_for_timeout(180);check(variant+' Resume continues',page.locator('#scene').evaluate('v=>v.currentTime')>t+.1)
  for i in range(3):
   capture(page);page.wait_for_timeout(500);check(variant+f' line{i+1} capture seeklock/noPause',page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible());a=float(page.locator('.wave').get_attribute('data-overlay-progress'));path=page.locator('.original-envelope').get_attribute('d');page.wait_for_timeout(450);check(variant+f' line{i+1} take grows/original fixed',float(page.locator('.wave').get_attribute('data-overlay-progress'))>a and page.locator('.original-envelope').get_attribute('d')==path)
   if i==0:shot(page,variant+'-desktop-capture')
   finish(page);check(variant+f' line{i+1} retained candidate overlay',page.locator('.wave').get_attribute('data-has-take')=='true' and float(page.locator('.wave').get_attribute('data-overlay-progress'))>.99)
   if i==0:shot(page,variant+'-desktop-candidate');page.locator('#take').click();page.wait_for_timeout(250);check(variant+' Your take uses actual candidate media',page.locator('#scene').evaluate('v=>!v.paused&&v.muted') and page.locator('#take-audio').evaluate('a=>!a.paused'))
   page.locator('#next').click()
   if i<2:
    page.wait_for_function('(v)=>JSON.parse(localStorage.getItem(v.key)).index===v.i',arg={'key':key,'i':i+1})
    if i==0:page.locator('#previous').click();shot(page,variant+'-desktop-accepted');page.locator('#next').click()
  readyresult(page);check(variant+' first completion still auto-Result',state(page,key)['completed'] and all(state(page,key)['accepted']))
  check(variant+' Result entry My dub paused0',page.locator('#result').evaluate('v=>v.paused&&v.currentTime<.03') and page.locator('#source-dub').get_attribute('aria-pressed')=='true');shot(page,variant+'-desktop-result')
  page.locator('#result-play').click();page.wait_for_timeout(500);t=page.locator('#result').evaluate('v=>v.currentTime');page.locator('#source-original').click();page.wait_for_timeout(220);check(variant+' Result switch preserves advancing time',page.locator('#result-original').evaluate('(v)=>!v.paused&&v.currentTime',)>t-.05 and page.locator('#result').evaluate('v=>v.paused'))
  page.locator('#result-play').click();t=page.locator('#result-original').evaluate('v=>v.currentTime');page.locator('#source-dub').click();page.wait_for_timeout(100);check(variant+' Result paused switch preserves time',page.locator('#result').evaluate('(v)=>v.paused') and abs(page.locator('#result').evaluate('v=>v.currentTime')-t)<.04)
  page.locator('#source-original').click();readyresult(page)
  with page.expect_download() as d:page.locator('#download').click()
  check(variant+' Download stays exact dub while Original selected',hashlib.sha256(Path(d.value.path()).read_bytes()).hexdigest()==hashlib.sha256((out.parents[2]/('prototypes/core-journey-lowfi' if variant=='A' else 'prototypes/core-journey-studio')/'public/media/example-dub.mp4').read_bytes()).hexdigest())
  page.locator('#return').click();page.locator('#next').click();page.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).index===1',arg=key);old=state(page,key)['accepted'][1];capture(page);finish(page);candidate=state(page,key)['candidates'][1];lab(page,'fail-save');page.locator('#previous').click();shot(page,variant+'-guard');page.locator('#guard button[value=save]').click();page.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).failureDestination==="previous"',arg=key)
  check(variant+' failed guard focuses visible Retry',page.locator('#next').evaluate('e=>document.activeElement===e') and page.locator('#next').is_visible());check(variant+' known failure retains candidate/accepted/Previous',state(page,key)['candidates'][1]==candidate and state(page,key)['accepted'][1]==old and state(page,key)['failureDestination']=='previous');shot(page,variant+'-save-error')
  page.mouse.move(0,0);focus=page.evaluate('document.activeElement.id');scroll=page.evaluate('scrollY');page.wait_for_timeout(8500);check(variant+' timed notice hides but guide/focus/scroll stay',not page.locator('#feedback').is_visible() and 'previous' in page.locator('#take-help').inner_text().lower() and page.evaluate('document.activeElement.id')==focus and abs(page.evaluate('scrollY')-scroll)<1)
  page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');check(variant+' reload restores exact take/destination without toast',state(page,key)['candidates'][1]==candidate and state(page,key)['accepted'][1]==old and state(page,key)['failureDestination']=='previous' and not page.locator('#feedback').is_visible());page.locator('#next').click();page.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).index===0',arg=key);check(variant+' Retry honored Previous destination',state(page,key)['accepted'][1]==candidate)
  page.locator('#next').click();page.locator('#next').click();page.wait_for_function('(k)=>JSON.parse(localStorage.getItem(k)).index===2',arg=key);page.set_viewport_size({'width':1280,'height':600});lab(page,'locale','ru');lab(page,'long-line');page.evaluate('scrollTo(0,0)');g=geom(page,variant+' short RU completed');shot(page,variant+'-short-completed')
  check(variant+' proposed primary To result visible',page.locator('#next').inner_text().strip()=='К результату' and g['next']['bottom']<=600 and g['next']['y']>=0 and not page.locator('#to-result').is_visible(),g)
  capture(page);finish(page);page.locator('#next').click();page.wait_for_timeout(650);check(variant+' completed replacement acceptance stays Record',page.locator('#record-view').is_visible() and not page.locator('#result-view').is_visible() and state(page,key)['candidates'][2] is None and page.locator('#next').inner_text().strip()=='К результату')
  lab(page,'fail-assembly');accepted=state(page,key)['accepted'];page.locator('#next').click();page.wait_for_function('!document.querySelector("#retry-assembly").hidden');shot(page,variant+'-assembly-error');check(variant+' assembly failure keeps takes and outside retry',state(page,key)['accepted']==accepted and page.locator('#assembly button').count()==0 and page.locator('#retry-assembly').is_visible());page.reload();page.wait_for_timeout(2100);check(variant+' assembly reload does not auto-retry',state(page,key)['resultAssemblyFailed'] and page.locator('#retry-assembly').is_visible());page.locator('#retry-assembly').click();readyresult(page);check(variant+' explicit assembly retry recovers',state(page,key)['accepted']==accepted and not state(page,key)['resultAssemblyFailed']);shot(page,variant+'-short-result-original');c.close()
  # Phone visual states are explicit local fixtures;record behavior is operated above,not claimed from seeded pictures.
  seed={'index':0,'accepted':[{'id':11},{'id':12},{'id':13}],'candidates':[{'id':14},None,None],'completed':True,'view':'record','locale':'ru'}
  c=ctx(b,390,667,key,seed);page=openpage(c,port);lab(page,'long-line');g=geom(page,variant+' phone RU candidate');shot(page,variant+'-phone-candidate-top');page.locator('#next').scroll_into_view_if_needed();shot(page,variant+'-phone-candidate-controls');check(variant+' phone48 record/nav targets',all(page.locator(s).bounding_box()['height']>=48 for s in ['#record','#replay','#take','#previous','#next']))
  if variant=='A':check('A phone Projects plus named Settings available',page.locator('[data-destination="My projects"]').count()==1 and page.locator('[data-destination="My projects"]').is_visible() and bool(page.locator('[data-destination="Settings"]').get_attribute('aria-label')))
  page.locator('#previous').is_disabled();lab(page,'fail-mic');candidate=state(page,key)['candidates'][0];capture_attempt=page.locator('#record').click();page.wait_for_timeout(250);check(variant+' failed capture preserves candidate and shows Settings only recovery',not page.locator('#product').evaluate('e=>e.classList.contains("capturing")') and state(page,key)['candidates'][0]==candidate and page.locator('#open-settings').is_visible());shot(page,variant+'-phone-microphone');page.locator('#open-settings').click();check(variant+' Settings recovery guards candidate',page.locator('#guard').is_visible());page.locator('#guard button[value=stay]').click();c.close()
  # First all-accepted set follows explicit leave rather than auto-Result.
  seed={'index':2,'accepted':[{'id':1},{'id':2},None],'candidates':[None,None,{'id':3}],'completed':False,'view':'record'}
  c=ctx(b,390,667,key,seed);page=openpage(c,port);lab(page,'fail-save');exitbutton(page,variant).click();page.locator('#guard button[value=save]').click();page.wait_for_function('(k)=>!!JSON.parse(localStorage.getItem(k)).failure',arg=key);check(variant+' final-gap failure retained Projects intent',state(page,key)['failureDestination']=='My projects');page.locator('#next').click();page.wait_for_function('document.querySelector("#destination").open');check(variant+' first completion explicit Projects wins',page.locator('#destination-title').inner_text()=='My projects' and state(page,key)['completed'] and state(page,key)['view']=='record');c.close()
  # Matched tablet/phone/short visual geometry;state selection is fixture-only for these composition captures.
  for w,h,kind in [(1440,900,'normal'),(1280,600,'normal'),(768,700,'normal'),(390,667,'normal'),(390,667,'result')]:
   seed={'index':0,'accepted':[None]*3,'candidates':[None]*3,'completed':False,'view':'record','locale':'ru'}
   if kind=='result':seed.update({'accepted':[{'id':1},{'id':2},{'id':3}],'completed':True,'view':'result'})
   c=ctx(b,w,h,key,seed);page=openpage(c,port)
   if kind=='normal':
    lab(page,'long-line');page.evaluate('scrollTo(0,0)');g=geom(page,variant+f' {w}x{h} long normal');check(variant+f' {w}x{h} scene/wave aligned & full16:9',abs(g['scene']['x']-g['wave']['x'])<1 and abs(g['scene']['width']-g['wave']['width'])<1 and abs(g['scene']['width']/g['scene']['height']-16/9)<.01)
    if variant=='B':check('B '+str(w)+' external dialogue/no card/24 gap',g['dialogue']['y']>=g['scene']['bottom'] and page.locator('#main').evaluate('e=>getComputedStyle(e).borderTopWidth')=='0px' and abs(page.locator('.studio-controls').bounding_box()['y']-g['timeline']['bottom']-24)<.5)
    if variant=='A' and w==768:check('A tablet keeps substantial stacked scene',g['scene']['width']>600 and g['performance']['y']>=g['scene']['bottom'],g)
    if w>=1024:check(variant+' desktop whole task loop fit',g['next']['bottom']<=h and g['scene']['width']>=500,g)
   else:
    readyresult(page);page.locator('#source-original').click();readyresult(page);page.locator('#result-fullscreen').click();page.wait_for_function('!!document.fullscreenElement');check(variant+' phone Result fullscreen controls present',page.locator('#source-original').is_visible() and page.locator('#result-play').is_visible());shot(page,variant+'-phone-fullscreen');page.locator('#result-fullscreen').click();page.wait_for_function('!document.fullscreenElement');page.locator('#source-dub').focus();page.keyboard.press('ArrowLeft');check(variant+' Result keyboard selected focus',page.locator('#source-original').get_attribute('aria-pressed')=='true' and page.locator('#source-original').evaluate('e=>e===document.activeElement'))
   shot(page,variant+f'-{w}x{h}-{kind}-RU');c.close()
  # Live calibration normal/hover/pressed/focus/disabled/busy visual specimens.
  c=ctx(b,1440,1000,key);page=c.new_page();page.goto('http://127.0.0.1:'+str(port)+'/ab-calibration.html');page.locator('#normal-sample').wait_for();normal=page.locator('#normal-sample').evaluate('e=>{let c=getComputedStyle(e);return {h:e.getBoundingClientRect().height,r:c.borderRadius,font:c.fontFamily,bg:c.backgroundColor}}');check(variant+' calibrated desktop task40/radius6/Mabry',normal['h']==40 and normal['r']=='6px' and 'Mabry' in normal['font'],normal);page.locator('#hover-sample').hover();page.wait_for_timeout(180);shot(page,variant+'-calibration');page.locator('#focus-sample').focus();page.keyboard.press('Tab');page.keyboard.press('Shift+Tab');check(variant+' calibration keyboard focus visible',page.locator('#focus-sample').evaluate('e=>getComputedStyle(e).outlineStyle')=='solid');check(variant+' calibration disabled/busy semantics',page.locator('#task-row button[disabled]').is_disabled() and page.locator('#loading-sample').get_attribute('aria-busy')=='true');c.close()
 b.close()
result={'pairedVersion':'core-journey-ab-highfi-v1','versions':{'A':'core-journey-panel-highfi-v4','B':'core-journey-studio-highfi-v1'},'date':'2026-10-28','browser':'Chrome '+browser,'environment':'Windows/headless actual Chrome/DPR1/100% CSS viewport/emulated touch/reduced motion phone','checks':checks,'geometry':geometry,'pageErrors':errors,'pass':sum(x['pass'] for x in checks),'total':len(checks)}
(out/'ab-highfi-v1-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':result['pass'],'total':result['total'],'concerns':[x for x in checks if not x['pass']],'pageErrors':errors},ensure_ascii=False))
