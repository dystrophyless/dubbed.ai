from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent;checks=[];geometry=[];errors=[]
def check(n,ok,d=None):
 checks.append({'name':n,'pass':bool(ok),'detail':d})
 if not ok:print('CONCERN',n,d,flush=True)
def context(b,w,h,seed=None):
 c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference')
 if seed:c.add_init_script('if(!localStorage.getItem("dubbed-lowfi-v1"))localStorage.setItem("dubbed-lowfi-v1",'+json.dumps(json.dumps(seed))+');')
 return c
def pageopen(c):
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.wait_for_timeout(150);return page
def lab(page,k,v=True):
 if not page.locator('.lab details').get_attribute('open'):page.locator('.lab summary').click()
 if k=='locale':page.locator('#locale').select_option(v)
 else:page.locator('#'+k).set_checked(v)
 page.locator('.lab summary').click()
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def shot(page,n):page.screenshot(path=str(out/('panel-v6-review-'+n+'.png')))
def geom(page,label):
 g=page.evaluate('''()=>{let r=s=>{let e=document.querySelector(s),a=e.getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,right:a.right,bottom:a.bottom,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}};return {viewport:[innerWidth,innerHeight],scrollY,scene:r('.scene'),wave:r('.wave'),heading:r('.project-header'),dialogue:r('#dialogue'),panel:r('.performance'),exit:r('#exit'),next:r('#next'),buttons:['#replay','#record','#take','#next','#previous'].map(s=>({selector:s,...r(s)}))}}''');geometry.append({'label':label,**g});w,h=g['viewport']
 check(label+' no global navbar/boundary links',page.locator('.global,.brand,.account,nav,#credit-balance').count()==0 and page.locator('[data-destination]').count()==1)
 check(label+' Exit visible and separate from project header',g['exit']['width']>=70 and g['exit']['y']>=0 and g['exit']['bottom']<=h and (g['exit']['right']<=g['heading']['x'] or g['exit']['bottom']<=g['heading']['y']),g)
 if w>=1248:
  check(label+' video itself centered/panel24/right32',abs(g['scene']['x']+g['scene']['width']/2-w/2)<=1 and abs(g['panel']['x']-g['scene']['right']-24)<=1 and g['panel']['right']<=w-31,g)
  check(label+' heading/wave aligned media bounds',abs(g['heading']['x']-g['scene']['x'])<1 and abs(g['heading']['width']-g['scene']['width'])<1 and abs(g['wave']['x']-g['scene']['x'])<1 and abs(g['wave']['width']-g['scene']['width'])<1)
  check(label+' readable useful desktop task fit',g['scene']['width']>=591 and g['next']['bottom']<=h and g['wave']['bottom']<=h,g)
 else:check(label+' substantial media and stacked panel',g['scene']['width']>=w-(34 if w<768 else 50) and g['panel']['y']>=g['wave']['bottom'])
 check(label+' complete16:9 source/dialogue outside',abs(g['scene']['width']/g['scene']['height']-16/9)<.01 and (g['dialogue']['y']>=g['scene']['bottom']-1 or g['dialogue']['x']>=g['scene']['right']-1))
 check(label+' controls keep readable labels',all(x['scrollWidth']<=x['clientWidth']+1 for x in g['buttons']))
 return g
def capture(page):page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")')
def finish(page):page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)
def resultready(page):page.wait_for_function('!document.querySelector("#result-player").hidden&&!document.querySelector("#result-play").disabled')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browser=b.version
 for w,h,long in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(1023,700,True),(1024,700,True),(1247,700,True),(1248,700,True),(390,667,True)]:
  c=context(b,w,h);page=pageopen(c)
  if long:lab(page,'locale','ru');lab(page,'long-line')
  page.evaluate('scrollTo(0,0)');geom(page,str(w)+'x'+str(h)+' normal');shot(page,str(w)+'x'+str(h)+'-normal');c.close()
 # Long-RU replacement with actual capture,known failure and exact Exit recovery.
 seed={'index':1,'accepted':[{'id':1},{'id':2},{'id':3}],'candidates':[None]*3,'completed':True,'view':'record','locale':'ru'};c=context(b,1280,600,seed);page=pageopen(c);lab(page,'long-line');old=state(page)['accepted'][1];capture(page);page.wait_for_timeout(500);check('Capture disables Exit/seek and has no Pause',page.locator('#exit').is_disabled() and page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible());page.locator('#exit').evaluate('e=>e.dispatchEvent(new MouseEvent("click",{bubbles:true}))');check('Stale capture Exit callback cannot open boundary',not page.locator('#destination').is_visible() and not page.locator('#guard').is_visible());geom(page,'1280x600 actual capture');shot(page,'1280x600-capture');finish(page);candidate=state(page)['candidates'][1];geom(page,'1280x600 actual candidate');shot(page,'1280x600-candidate')
 page.locator('#exit').click();check('Exit candidate guard opens',page.locator('#guard').is_visible());page.locator('#guard button[value=stay]').click();check('Stay retains exact candidate',state(page)['candidates'][1]==candidate);page.locator('#exit').click();page.keyboard.press('Escape');check('Escape retains exact candidate/Record',state(page)['candidates'][1]==candidate and page.locator('#record-view').is_visible() and not page.locator('#guard').is_visible())
 lab(page,'fail-mic');page.locator('#record').click();check('Capture failure protects candidate and Settings-only recovery',state(page)['candidates'][1]==candidate and page.locator('#open-settings').is_visible() and page.locator('[data-destination="Settings"]').count()==0);page.locator('#open-settings').click();check('Contextual Settings guards candidate',page.locator('#guard').is_visible());page.keyboard.press('Escape')
 lab(page,'fail-save');page.locator('#exit').click();page.locator('#guard button[value=save]').click();check('Save locks Exit while pending',page.locator('#exit').is_disabled());page.wait_for_function('!!JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).failureDestination');check('Failed Exit save retains candidate accepted destination',state(page)['candidates'][1]==candidate and state(page)['accepted'][1]==old and state(page)['failureDestination']=='My projects');page.mouse.move(0,0);page.wait_for_timeout(8500);check('Expired popup keeps Exit guidance',not page.locator('#feedback').is_visible() and 'Мои проекты' in page.locator('#take-help').inner_text());shot(page,'1280x600-exit-recovery');page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');check('Failure reload restores exact identities and target',state(page)['candidates'][1]==candidate and state(page)['accepted'][1]==old and state(page)['failureDestination']=='My projects');page.locator('#next').click();page.wait_for_function('document.querySelector("#destination").open');check('Retry saves candidate and honors Exit target',state(page)['accepted'][1]==candidate and page.locator('#destination-title').inner_text()=='Мои проекты');page.locator('#destination-close').click();check('Boundary close returns Exit focus',page.locator('#exit').evaluate('e=>document.activeElement===e'))
 page.locator('#to-result').click();resultready(page);shot(page,'1280x600-result');check('Result also has no global navbar and Exit available',page.locator('.global,nav,.brand').count()==0 and page.locator('#exit').is_visible());page.locator('#result-play').click();page.wait_for_timeout(350);page.locator('#source-original').click();page.wait_for_timeout(180);accepted=state(page)['accepted'];page.locator('#exit').click();page.wait_for_function('document.querySelector("#destination").open');check('Result Exit pauses both sources/preserves accepted',page.locator('#result').evaluate('v=>v.paused') and page.locator('#result-original').evaluate('v=>v.paused') and state(page)['accepted']==accepted);page.locator('#destination-close').click();check('Result boundary close restores Exit/no autoplay',page.locator('#exit').evaluate('e=>document.activeElement===e') and page.locator('#result-original').evaluate('v=>v.paused'));page.locator('#return').click();page.evaluate('scrollTo(0,0)');geom(page,'1280x600 Return');c.close()
 # Explicit final-gap Exit wins,ordinary initial completion remains automatic;fixtures are declared.
 for explicit in [True,False]:
  seed={'index':2,'accepted':[{'id':1},{'id':2},None],'candidates':[None,None,{'id':9}],'completed':False,'view':'record'};c=context(b,390,667,seed);page=pageopen(c)
  if explicit:page.locator('#exit').click();shot(page,'phone-final-exit-guard');page.locator('#guard button[value=save]').click();page.wait_for_function('document.querySelector("#destination").open');check('First completion explicit Exit wins over Result',state(page)['completed'] and state(page)['view']=='record' and page.locator('#destination-title').inner_text()=='My projects')
  else:page.locator('#next').click();resultready(page);check('Ordinary first completion still auto-Result',state(page)['completed'] and state(page)['view']=='result')
  c.close()
 seed={'index':0,'accepted':[{'id':1},{'id':2},{'id':3}],'candidates':[{'id':8},None,None],'completed':True,'view':'record','locale':'ru'};c=context(b,390,667,seed);page=pageopen(c);page.locator('#exit').click();page.locator('#guard button[value=discard]').click();page.wait_for_function('document.querySelector("#destination").open');check('Explicit discard removes only candidate,keeps accepted',state(page)['candidates'][0] is None and state(page)['accepted'][0]=={'id':1});page.locator('#destination-close').click();page.locator('#to-result').click();resultready(page);shot(page,'390x667-result');check('Phone Exit48px and Result footer reachable',page.locator('#exit').bounding_box()['height']>=48 and page.locator('#return').is_visible());c.close();b.close()
report={'version':'core-journey-panel-highfi-v6','date':'2026-10-28','browser':'Chrome '+browser,'environment':'Windows/headless installed Chrome/DPR1/100% CSS viewport/reduced motion phone','checks':checks,'geometry':geometry,'pageErrors':errors,'pass':sum(x['pass'] for x in checks),'total':len(checks)};(out/'panel-v6-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':report['pass'],'total':report['total'],'concerns':[c for c in checks if not c['pass']],'pageErrors':errors},ensure_ascii=False))
