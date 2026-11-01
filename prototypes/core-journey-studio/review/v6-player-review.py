import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
checks=[];geometry=[];extra={}
seed={'index':2,'candidates':[None]*3,'accepted':[{'id':91},{'id':92},{'id':93}],'completed':True,'view':'result'}
def check(n,ok,d=None):
 checks.append({'name':n,'pass':bool(ok),'detail':d})
 if not ok:print('CONCERN',n,d,flush=True)
def context(browser,width,height,ru=False,**kwargs):
 c=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,**kwargs)
 s={**seed,**({'locale':'ru'} if ru else {})};c.add_init_script('if(!localStorage.getItem("dubbed-studio-lowfi-v1"))localStorage.setItem("dubbed-studio-lowfi-v1",'+json.dumps(json.dumps(s))+');');return c
def ready(page):page.wait_for_function('!document.querySelector("#result-player").hidden&&!document.querySelector("#result-play").disabled')
def v(page,source='dub'):return page.locator('#result' if source=='dub' else '#result-original').evaluate('(v)=>({time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,src:v.currentSrc,volume:v.volume})')
def shot(page,n):page.screenshot(path=str(out/('studio-v6-review-'+n+'.png')))
def g(page):return page.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,bottom:a.bottom,right:a.right}};return {viewport:[innerWidth,innerHeight],scrollY,player:r('#result-player'),picture:r('.result-picture'),selector:r('.result-sources'),rail:r('.result-transport'),download:r('#download'),return:r('#return'),targets:['#source-original','#source-dub','#result-play','#result-seek','#result-volume','#result-fullscreen'].map(s=>({selector:s,...r(s)})),sourceStyle:{color:getComputedStyle(document.querySelector('#source-original')).color,background:getComputedStyle(document.querySelector('#source-original')).backgroundColor,font:getComputedStyle(document.querySelector('#source-original')).fontFamily},focus:{id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outline}}}''')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browser=b.version
 for width,height,ru in [(1440,900,False),(1280,600,True),(390,667,True)]:
  c=context(b,width,height,ru,has_touch=width==390,reduced_motion='reduce' if width==390 else 'no-preference');page=c.new_page();page.goto('http://127.0.0.1:5179');ready(page)
  check(f'{width} entry dub paused0',v(page)['paused'] and v(page)['time']<.03 and page.locator('#source-dub').get_attribute('aria-pressed')=='true')
  page.locator('#source-original').click();ready(page);geo=g(page);geometry.append(geo);shot(page,str(width)+'-original')
  check(f'{width} selector inside player/picture',geo['selector']['x']>=geo['picture']['x'] and geo['selector']['y']>=geo['picture']['y'] and geo['selector']['right']<=geo['picture']['right'])
  check(f'{width} rail below complete picture inside player',abs(geo['rail']['y']-geo['picture']['bottom'])<1 and geo['rail']['bottom']<=geo['player']['bottom']+.5)
  check(f'{width} distinct finite source',v(page,'original')['src'].endswith('/media/scene.mp4') and v(page)['src'].endswith('/media/example-dub.mp4') and abs(v(page,'original')['duration']-v(page)['duration'])<.03)
  if width>=768:check(f'{width} full player and footer at top',geo['player']['bottom']<=height and max(geo['download']['bottom'],geo['return']['bottom'])<=height and geo['scrollY']==0,geo)
  else:check('Phone48px target heights',all(t['height']>=48 for t in geo['targets']),geo['targets'])
  page.locator('#result-play').click();page.wait_for_timeout(650);before=v(page,'original');page.locator('#source-dub').click();page.wait_for_timeout(220);after=v(page)
  check(f'{width} playing switch preserves time/intent',not after['paused'] and before['time']-.08<=after['time']<=before['time']+.5,[before,after])
  page.locator('#result-play').click();paused=v(page);page.locator('#source-original').click();page.wait_for_timeout(150);other=v(page,'original')
  check(f'{width} paused switch preserves time',other['paused'] and abs(other['time']-paused['time'])<.05,[paused,other])
  check(f'{width} inactive source paused',v(page)['paused'])
  if width==390:
   box=page.locator('#result-seek').bounding_box();page.touchscreen.tap(box['x']+box['width']*.4,box['y']+box['height']/2);page.wait_for_timeout(250)
   check('Phone touch seek starts selected source',not v(page,'original')['paused'] and v(page,'original')['time']>3)
   page.locator('#result-play').click()
  page.locator('#source-dub').focus();page.keyboard.press('ArrowLeft');page.wait_for_timeout(150)
  check(f'{width} keyboard source selected and focused',page.locator('#source-original').get_attribute('aria-pressed')=='true' and page.locator('#source-original').evaluate('e=>e===document.activeElement'))
  check(f'{width} focus visible',page.locator('#source-original').evaluate('e=>getComputedStyle(e).outlineStyle')=='solid')
  page.locator('#result-seek').focus();page.keyboard.down('ArrowRight');page.wait_for_timeout(180);held=v(page,'original');check(f'{width} held key seek pauses',held['paused']);page.keyboard.up('ArrowRight');page.wait_for_timeout(180);check(f'{width} key release plays',not v(page,'original')['paused'])
  box=page.locator('#result-seek').bounding_box();page.mouse.move(box['x']+box['width']*.3,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']*.5,box['y']+box['height']/2);held=v(page,'original');page.wait_for_timeout(150)
  check(f'{width} held pointer seek stays paused',held['paused'] and abs(v(page,'original')['time']-held['time'])<.03)
  page.mouse.up();page.wait_for_timeout(180);check(f'{width} pointer release plays',not v(page,'original')['paused'])
  page.mouse.move(box['x']+box['width']*.4,box['y']+box['height']/2);page.mouse.down();page.locator('#result-seek').dispatch_event('pointercancel',{'pointerId':1});page.mouse.up();page.wait_for_timeout(100);check(f'{width} cancelled seek remains paused',v(page,'original')['paused'])
  page.locator('#result-volume').fill('0.3');page.locator('#result-volume').dispatch_event('input');check(f'{width} volume synchronized',abs(v(page)['volume']-.3)<.01 and abs(v(page,'original')['volume']-.3)<.01)
  page.locator('#result-original').evaluate('v=>{v.currentTime=v.duration-.1;v.play()}');page.wait_for_timeout(450);check(f'{width} ended shows Replay',page.locator('#result-play').get_attribute('aria-label') in ['Replay','Сначала'])
  page.locator('#source-dub').click();ready(page);check(f'{width} ended switch stays at finite end paused',v(page)['paused'] and abs(v(page)['time']-v(page)['duration'])<.05)
  page.locator('#result-play').click();page.wait_for_timeout(250);check(f'{width} Replay restarts from0',not v(page)['paused'] and v(page)['time']<.8);page.locator('#result-play').click()
  page.locator('#result-fullscreen').click();page.wait_for_function('document.fullscreenElement?.id==="result-player"');check(f'{width} actual fullscreen includes controls',page.locator('#source-original').is_visible() and page.locator('#result-play').is_visible());shot(page,str(width)+'-fullscreen');page.locator('#result-fullscreen').click();page.wait_for_function('!document.fullscreenElement')
  page.locator('#source-original').click();ready(page)
  with page.expect_download() as d:page.locator('#download').click()
  downloaded=Path(d.value.path()).read_bytes();expected=(out.parent/'public/media/example-dub.mp4')
  check(f'{width} Original-selected download remains explicit dub',hashlib.sha256(downloaded).hexdigest()==hashlib.sha256(expected.read_bytes()).hexdigest() and ('My dub' in page.locator('#download').inner_text() or 'дубляж' in page.locator('#download').inner_text()))
  page.locator('#return').click();check(f'{width} Return pauses sources and preserves accepted',v(page)['paused'] and v(page,'original')['paused'] and page.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).accepted.every(Boolean)'))
  page.locator('#to-result').click();ready(page);check(f'{width} reentry reset My dub paused0',v(page)['paused'] and v(page)['time']<.03 and page.locator('#source-dub').get_attribute('aria-pressed')=='true')
  if width==1440:
   extra['audio']=page.evaluate('''async()=>{let ac=new AudioContext();let result=[];for(let src of ['/media/scene.mp4','/media/example-dub.mp4']){let buf=await ac.decodeAudioData(await(await fetch(src)).arrayBuffer());let a=buf.getChannelData(0),sum=0,fingerprint=0;for(let i=0;i<a.length;i+=97){sum+=a[i]*a[i];fingerprint+=a[i]*(i%997);}result.push({src,duration:buf.duration,channels:buf.numberOfChannels,rms:Math.sqrt(sum/(a.length/97)),fingerprint});}await ac.close();return result}''')
   check('Decoded audio is non-silent and distinct',all(x['rms']>.001 for x in extra['audio']) and abs(extra['audio'][0]['fingerprint']-extra['audio'][1]['fingerprint'])>.01,extra['audio'])
  c.close()
 # Independent delayed request and network-failure cases: source requests are held rather than sleeping the browser driver.
 c=context(b,1280,600);page=c.new_page();held_routes=[];page.route('**/media/scene.mp4',lambda r:held_routes.append(r));page.goto('http://127.0.0.1:5179',wait_until='domcontentloaded');ready(page);page.locator('#result-play').click();page.wait_for_timeout(400);page.locator('#source-original').click();check('Late source has loading status and source escape',page.locator('#result-player').get_attribute('aria-busy')=='true' and page.locator('#source-dub').is_enabled());shot(page,'loading');page.locator('#source-dub').click();ready(page)
 for r in held_routes:r.continue_()
 page.unroute('**/media/scene.mp4');page.wait_for_timeout(450);check('Late metadata cannot override newest source',page.locator('#result-player').get_attribute('data-source')=='dub' and not v(page)['paused'] and v(page,'original')['paused']);c.close()
 c=context(b,1280,600);page=c.new_page();page.route('**/media/scene.mp4',lambda r:r.abort());page.goto('http://127.0.0.1:5179');ready(page);page.locator('#source-original').click();page.wait_for_function('document.querySelector("#result-play").getAttribute("aria-label")==="Retry loading"');check('Failed source exposes retry and escape',page.locator('#result-media-status').is_visible() and page.locator('#source-dub').is_enabled() and not page.locator('#result-play').is_disabled());shot(page,'network-error');page.unroute('**/media/scene.mp4');page.locator('#result-play').click();ready(page);check('Loading retry restores source paused',v(page,'original')['paused'] and v(page,'original')['duration']>13);c.close()
 # A fresh connected capture journey checks Result entry was not only a seeded screen.
 c=b.new_context(viewport={'width':1280,'height':600});page=c.new_page();page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 for i in range(3):
  page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")');check(f'Connected line{i+1} capture seeklocked/noPause',page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible());page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000);page.locator('#next').click()
  if i<2:page.wait_for_function('(n)=>JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).index===n',arg=i+1)
 ready(page);check('Actual three-line journey enters custom My dub paused0',page.locator('#result-player').is_visible() and v(page)['paused'] and v(page)['time']<.03);c.close();b.close()
result={'version':'core-journey-studio-lowfi-v6','date':'2026-10-27','browser':'Chrome '+browser,'environment':'Windows/headless actual Chrome/DPR1/100% CSS viewport/emulated touch','checks':checks,'geometry':geometry,'extra':extra,'pass':sum(c['pass'] for c in checks),'total':len(checks)}
(out/'v6-player-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':result['pass'],'total':result['total'],'concerns':[c for c in checks if not c['pass']]},ensure_ascii=False))
