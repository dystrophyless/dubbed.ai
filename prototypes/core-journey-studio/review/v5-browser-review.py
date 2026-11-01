import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(__file__).parent
checks=[];geometry=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail})
 if not ok:print('CONCERN',name,detail,flush=True)
def ready(page):
 page.wait_for_function('document.querySelector("#scene").readyState>=3');page.wait_for_timeout(180)
def lab(page,key,val=True):
 if not page.locator('.lab details').get_attribute('open'):page.locator('.lab summary').click()
 if key=='locale':page.locator('#locale').select_option(val)
 else:page.locator('#'+key).set_checked(val)
 page.locator('.lab summary').click()
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1"))')
def bounds(page):return page.evaluate('''()=>{const r=s=>{let v=document.querySelector(s).getBoundingClientRect();return {x:v.x,y:v.y,width:v.width,height:v.height,right:v.right,bottom:v.bottom}};let m=getComputedStyle(document.querySelector('#main'));return {viewport:[innerWidth,innerHeight],scrollY,scene:r('.scene'),dialogue:r('#dialogue'),wave:r('.wave'),timeline:r('.timeline'),controls:r('.studio-controls'),mainStyle:{border:m.borderTopWidth,radius:m.borderRadius,shadow:m.boxShadow,background:m.backgroundColor},bodyBackground:getComputedStyle(document.body).backgroundColor,position:document.querySelector('#position').textContent,legendCount:document.querySelectorAll('.wave-key,#take-key,.original-key').length,speakerCount:document.querySelectorAll('#speaker,[data-speaker],.speaker').length}}''')
def layout(page,name,desktop=True):
 g=bounds(page);geometry.append({'name':name,**g})
 check(name+' gap after entire timeline is24px',abs(g['controls']['y']-g['timeline']['bottom']-24)<.5,g['controls']['y']-g['timeline']['bottom'])
 check(name+' external dialogue + common edges',g['dialogue']['y']>=g['scene']['bottom'] and abs(g['scene']['x']-g['wave']['x'])<1 and abs(g['scene']['width']-g['wave']['width'])<1)
 check(name+' outer card absent',g['mainStyle']=={'border':'0px','radius':'0px','shadow':'none','background':'rgba(0, 0, 0, 0)'} and g['bodyBackground']=='rgb(255, 255, 255)',g['mainStyle'])
 check(name+' no legend or speaker metadata',not g['legendCount'] and not g['speakerCount'] and '·' not in g['position'] and 'Shaman' not in page.locator('#product').inner_text())
 check(name+' action labels preserved',bool(page.locator('#replay').inner_text()) and bool(page.locator('#take').inner_text()))
 if desktop:check(name+' useful scene/controls fit',g['scene']['width']>=575 and g['controls']['bottom']<=g['viewport'][1]+1 and g['controls']['x']>=g['scene']['x']-1 and g['controls']['right']<=g['scene']['right']+1,g)
 return g
def snap(page,name):page.screenshot(path=str(out/('studio-v5-review-'+name+'.png')))
def capture(page):page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")')
def finish(page):page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)

with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);version=b.version
 for width,height,long in [(1440,900,False),(1366,650,True),(1280,600,True),(1280,699,True),(1280,700,True),(1280,701,True),(767,700,True),(768,700,True),(390,667,True),(390,844,False)]:
  ctx=b.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
  page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page)
  if long:lab(page,'locale','ru');lab(page,'long-line')
  page.evaluate('scrollTo(0,0)');g=layout(page,f'{width}x{height} before',width>=768)
  if width==1440:snap(page,'desktop-before')
  if width==1280 and height==600:snap(page,'short-long-before')
  if width==390 and height==667:snap(page,'phone-long-before')
  ctx.close()
 seq=[g['scene']['width'] for g in geometry if g['name'].startswith('1280x69') or g['name'].startswith('1280x700') or g['name'].startswith('1280x701')]
 check('699/700/701 scene grows continuously',max(seq)-min(seq)<5,seq)
 ctx=b.new_context(viewport={'width':1280,'height':600},device_scale_factor=1)
 page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page);lab(page,'locale','ru');lab(page,'long-line')
 check('Empty next still blocked',page.locator('#next').is_disabled())
 page.locator('#replay').click();page.wait_for_timeout(600);page.locator('#pause').click();t=page.locator('#scene').evaluate('v=>v.currentTime');page.wait_for_timeout(200)
 check('Listening Pause preserves time',abs(page.locator('#scene').evaluate('v=>v.currentTime')-t)<.03)
 page.locator('#pause').click();page.wait_for_timeout(250);check('Resume continues time',page.locator('#scene').evaluate('v=>v.currentTime')>t+.15)
 r=page.locator('#scrub').bounding_box();page.mouse.move(r['x']+r['width']*.3,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+r['width']*.5,r['y']+r['height']/2);t=page.locator('#scene').evaluate('v=>v.currentTime');page.wait_for_timeout(200)
 check('Held seek does not play',page.locator('#scene').evaluate('v=>v.paused') and abs(page.locator('#scene').evaluate('v=>v.currentTime')-t)<.03)
 page.mouse.up();page.wait_for_timeout(200);check('Seek release plays',page.locator('#scene').evaluate('v=>!v.paused'))
 capture(page);page.wait_for_timeout(600);g=layout(page,'short long capture');a=float(page.locator('.wave').get_attribute('data-overlay-progress'));original=page.locator('.original-envelope').get_attribute('d')
 check('Capture disables seek and has no Pause',page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible())
 page.locator('#scrub').evaluate('e=>{e.value=900;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}');page.wait_for_timeout(500)
 check('Stale seek cannot advance capture to900',page.locator('#scene').evaluate('v=>v.currentTime')<2.6)
 check('Overlay grows without changing original',float(page.locator('.wave').get_attribute('data-overlay-progress'))>a and page.locator('.original-envelope').get_attribute('d')==original)
 snap(page,'short-long-during');finish(page);layout(page,'short long after');snap(page,'short-long-after')
 check('Overlay retained after capture',float(page.locator('.wave').get_attribute('data-overlay-progress'))>.99 and page.locator('.wave').get_attribute('data-has-take')=='true')
 page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');page.locator('#previous').click();accepted=state(page)['accepted'][0];capture(page);finish(page);candidate=state(page)['candidates'][0]
 lab(page,'fail-save');page.locator('#exit').click();check('Candidate Exit still guarded',page.locator('#guard').is_visible());page.locator('#guard button[value=save]').click();page.wait_for_function('document.querySelector("#next").textContent.includes("Повторить")');s=state(page)
 check('Failed save retains candidate accepted destination',s['candidates'][0]==candidate and s['accepted'][0]==accepted and s['failureDestination']=='My projects')
 page.wait_for_timeout(8500);check('Toast expires but recovery remains',not page.locator('#feedback').is_visible() and 'Мои проекты' in page.locator('#take-help').inner_text());snap(page,'short-long-recovery')
 page.reload();ready(page);s=state(page);check('Failure reload retains exact identities',s['candidates'][0]==candidate and s['accepted'][0]==accepted and s['failureDestination']=='My projects')
 page.locator('#take').click();page.wait_for_timeout(350);check('Candidate actual media playback',page.locator('#scene').evaluate('v=>!v.paused&&v.muted') and page.locator('#take-audio').evaluate('a=>!a.paused&&a.currentTime>0'))
 page.locator('#next').click();page.wait_for_function('document.querySelector("#destination").open');check('Retry retained Exit target',page.locator('#destination-title').inner_text()=='Мои проекты');ctx.close()
 ctx=b.new_context(viewport={'width':390,'height':667},device_scale_factor=1,reduced_motion='reduce');page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page);lab(page,'locale','ru');lab(page,'long-line');capture(page);page.wait_for_timeout(850);g=layout(page,'phone long capture',False);snap(page,'phone-long-during');check('Phone scene/dialogue/wave context visible',g['scene']['y']>=15 and g['wave']['bottom']<=667 and g['dialogue']['bottom']<=667,g);finish(page);layout(page,'phone long after',False);snap(page,'phone-long-after');page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');capture(page);page.wait_for_timeout(700);g=layout(page,'phone line2 capture',False);check('Phone Next-to-record context restored',g['scene']['y']>=15 and g['wave']['bottom']<=667);snap(page,'phone-line2-during');ctx.close()
 ctx=b.new_context(viewport={'width':1440,'height':900},device_scale_factor=1);page=ctx.new_page();page.goto('http://127.0.0.1:5178');ready(page);check('Original speaker hooks removed',page.locator('#speaker,[data-speaker],.speaker').count()==0 and 'Shaman' not in page.locator('#product').inner_text());capture(page);finish(page);page.locator('#take').click();page.wait_for_timeout(300);check('Original retains candidate playback',page.locator('#scene').evaluate('v=>!v.paused&&v.muted'));snap(page,'original-candidate');ctx.close();b.close()
 result={'version':'core-journey-studio-lowfi-v5','date':'2026-10-27','browser':'Chrome '+version,'environment':'Windows, headless installed Chrome, DPR1,100% CSS viewport','checks':checks,'geometry':geometry,'pass':sum(c['pass'] for c in checks),'total':len(checks)}
 (out/'v5-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'pass':result['pass'],'total':result['total'],'concerns':[c for c in checks if not c['pass']]},ensure_ascii=False),flush=True)
