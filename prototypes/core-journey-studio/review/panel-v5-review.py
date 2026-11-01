import json,hashlib,re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;root=out.parents[2];checks=[];geometry=[];errors=[]
def check(n,ok,d=None):
 checks.append({'name':n,'pass':bool(ok),'detail':d})
 if not ok:print('CONCERN',n,d,flush=True)
def ready(page):page.wait_for_function('document.querySelector("#scene").readyState>=3');page.wait_for_timeout(180)
def lab(page,k,v=True):
 if not page.locator('.lab details').get_attribute('open'):page.locator('.lab summary').click()
 if k=='locale':page.locator('#locale').select_option(v)
 else:page.locator('#'+k).set_checked(v)
 page.locator('.lab summary').click()
def shot(page,n):page.screenshot(path=str(out/('panel-v5-review-'+n+'.png')))
def geom(page,label):
 g=page.evaluate('''()=>{let r=s=>{let e=document.querySelector(s),a=e.getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,bottom:a.bottom,right:a.right,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}};return {viewport:[innerWidth,innerHeight],scrollY,scene:r('.scene'),wave:r('.wave'),dialogue:r('#dialogue'),heading:r('.project-header'),panel:r('.performance'),next:r('#next'),help:r('#take-help'),buttons:['#replay','#record','#take','#previous','#next'].map(s=>({selector:s,...r(s)})),dialogueType:{size:getComputedStyle(document.querySelector('#dialogue')).fontSize,line:getComputedStyle(document.querySelector('#dialogue')).lineHeight}}}''');geometry.append({'label':label,**g});w,h=g['viewport'];center=g['scene']['x']+g['scene']['width']/2
 if w>=1248:
  check(label+' video itself viewport-centered',abs(center-w/2)<=1,center-w/2)
  check(label+' panel24 right/32 gutter',abs(g['panel']['x']-g['scene']['right']-24)<=1 and g['panel']['right']<=w-31,g)
  check(label+' heading/wave share media edges',abs(g['heading']['x']-g['scene']['x'])<1 and abs(g['heading']['width']-g['scene']['width'])<1 and abs(g['wave']['x']-g['scene']['x'])<1 and abs(g['wave']['width']-g['scene']['width'])<1)
  check(label+' complete task fits desktop',g['next']['bottom']<=h and g['help']['bottom']<=h and g['wave']['bottom']<=h and g['scene']['width']>=591,g)
 elif w>=768:check(label+' useful stacked media/panel',g['scene']['width']>=w-50 and g['panel']['y']>=g['wave']['bottom'],g)
 else:check(label+' phone useful contained media',g['scene']['width']>=w-33 and g['panel']['y']>=g['wave']['bottom'])
 check(label+' full16:9 frame',abs(g['scene']['width']/g['scene']['height']-16/9)<.015)
 check(label+' dialogue outside complete image',g['dialogue']['y']>=g['scene']['bottom']-1 or g['dialogue']['x']>=g['scene']['right']-1,g['dialogue'])
 check(label+' action labels fit their controls',all(v['scrollWidth']<=v['clientWidth']+1 for v in g['buttons']),g['buttons'])
 return g
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def capture(page):page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")')
def finish(page):page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browser=b.version
 for w,h,long in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(1023,700,True),(1024,700,True),(1247,700,True),(1248,700,True),(390,667,True)]:
  c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');ready(page)
  if long:lab(page,'locale','ru');lab(page,'long-line')
  page.evaluate('scrollTo(0,0)');geom(page,str(w)+'x'+str(h)+' normal');shot(page,str(w)+'x'+str(h)+'-normal')
  if w>=1248:
   page.evaluate('''()=>{let s=JSON.parse(localStorage.getItem('dubbed-lowfi-v1'));s.index=2;s.accepted=[{id:1},{id:2},{id:3}];s.completed=true;localStorage.setItem('dubbed-lowfi-v1',JSON.stringify(s))}''');page.reload();ready(page)
   if long:lab(page,'long-line')
   page.evaluate('scrollTo(0,0)');geom(page,str(w)+'x'+str(h)+' completed');shot(page,str(w)+'x'+str(h)+'-completed')
  c.close()
 # Bounded operated long-RU completed-project revision and recovery,not another whole journey matrix.
 seed={'index':1,'accepted':[{'id':1},{'id':2},{'id':3}],'candidates':[None]*3,'completed':True,'view':'record','locale':'ru'}
 c=b.new_context(viewport={'width':1280,'height':600},device_scale_factor=1);c.add_init_script('if(!localStorage.getItem("dubbed-lowfi-v1"))localStorage.setItem("dubbed-lowfi-v1",'+json.dumps(json.dumps(seed))+');');page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');ready(page);lab(page,'long-line');page.locator('#replay').click();page.wait_for_timeout(350);page.locator('#pause').click();t=page.locator('#scene').evaluate('v=>v.currentTime');page.wait_for_timeout(150);check('Listening Pause still preserves position',abs(page.locator('#scene').evaluate('v=>v.currentTime')-t)<.03);page.locator('#pause').click();page.wait_for_timeout(180);check('Listening Resume continues',page.locator('#scene').evaluate('v=>v.currentTime')>t+.1)
 old=state(page)['accepted'][1];capture(page);page.wait_for_timeout(700);geom(page,'1280x600 actual capture');shot(page,'1280x600-capture');check('Capture seek locked/no Pause',page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible());finish(page);geom(page,'1280x600 actual candidate');shot(page,'1280x600-candidate');candidate=state(page)['candidates'][1];page.locator('#take').click();page.wait_for_timeout(200);check('Candidate actual audio/video playback',page.locator('#scene').evaluate('v=>!v.paused&&v.muted') and page.locator('#take-audio').evaluate('v=>!v.paused'))
 lab(page,'fail-save');page.locator('#previous').focus();page.keyboard.press('Enter');page.locator('#guard button[value=save]').focus();page.keyboard.press('Enter');page.wait_for_function('!!JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).failure');check('Failed guard retains exact candidate accepted destination',state(page)['candidates'][1]==candidate and state(page)['accepted'][1]==old and state(page)['failureDestination']=='previous');check('Failed guard focus visible Retry',page.locator('#next').evaluate('e=>e===document.activeElement&&getComputedStyle(e).outlineStyle==="solid"'));page.mouse.move(0,0);page.wait_for_timeout(8500);check('Toast alone expires with recovery retained',not page.locator('#feedback').is_visible() and 'предыдущ' in page.locator('#take-help').inner_text());shot(page,'1280x600-recovery-expired');page.reload();ready(page);check('Recovery reload retains exact identities',state(page)['candidates'][1]==candidate and state(page)['accepted'][1]==old and state(page)['failureDestination']=='previous');page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===0');check('Retry still honors Previous',state(page)['accepted'][1]==candidate)
 page.locator('#next').click();page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===2');page.locator('#next').click();page.wait_for_function('!document.querySelector("#result-player").hidden&&!document.querySelector("#result-play").disabled');shot(page,'1280x600-result');page.locator('#return').click();check('Result Return preserves accepted set',all(state(page)['accepted']) and state(page)['index']==0);page.evaluate('scrollTo(0,0)');geom(page,'1280x600 Return restored media axis');shot(page,'1280x600-return');c.close();b.close()
result={'version':'core-journey-panel-highfi-v5','date':'2026-10-28','browser':'Chrome '+browser,'environment':'Windows/headless installed Chrome/DPR1/100% CSS viewport','checks':checks,'geometry':geometry,'pageErrors':errors,'pass':sum(c['pass'] for c in checks),'total':len(checks)};(out/'panel-v5-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':result['pass'],'total':result['total'],'concerns':[c for c in checks if not c['pass']],'pageErrors':errors},ensure_ascii=False))
