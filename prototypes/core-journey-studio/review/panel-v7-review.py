from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).parent;checks=[];matched=[];errors=[]
def check(n,ok,d=None):
 checks.append({'name':n,'pass':bool(ok),'detail':d})
 if not ok:print('CONCERN',n,d,flush=True)
def ready(page):page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
def lab(page,k,v=True):
 if not page.locator('.lab details').get_attribute('open'):page.locator('.lab summary').click()
 if k=='locale':page.locator('#locale').select_option(v)
 else:page.locator('#'+k).set_checked(v)
 page.locator('.lab summary').click()
def shot(page,n):page.screenshot(path=str(out/('panel-v7-review-'+n+'.png')))
def geom(page):return page.evaluate('''()=>{let r=s=>{let e=document.querySelector(s),a=e.getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height,right:a.right,bottom:a.bottom}};let dots=[...document.querySelectorAll('#dots span')];return {viewport:[innerWidth,innerHeight],scene:r('.scene'),wave:r('.wave'),dialogue:r('#dialogue'),header:r('.project-header,.studio-header'),heading:r('#heading'),dots:r('#dots'),exit:r('#exit'),panel:r('.performance'),next:r('#next'),toResult:document.querySelector('#to-result').hidden?null:r('#to-result'),titleType:getComputedStyle(document.querySelector('#heading')).font,dotsCount:dots.length,activeDots:dots.map((d,i)=>d.getAttribute('aria-current')==='true'?i:null).filter(i=>i!==null),interactiveDots:document.querySelectorAll('#dots button,#dots a,#dots [tabindex]').length}}''')
def st(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def active(page):return page.locator('#dots span[aria-current=true]').evaluate('e=>[...e.parentElement.children].indexOf(e)')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browser=b.version
 for w,h in [(1440,900),(1920,910),(1280,600),(1366,650),(1023,700),(1024,700),(1247,700),(1248,700),(390,667)]:
  for long in [False,True]:
   pair={}
   for label,port in [('A',5178),('B',5179)]:
    c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:'+str(port));ready(page)
    if long:lab(page,'locale','ru');lab(page,'long-line')
    page.evaluate('scrollTo(0,0)');g=geom(page);pair[label]=g
    if label=='A':
     name=str(w)+'x'+str(h)+(' longRU' if long else ' normal')
     check(name+' Exit at media/header left and title centered',abs(g['exit']['x']-g['scene']['x'])<1 and abs(g['header']['x']-g['scene']['x'])<1 and abs(g['heading']['x']+g['heading']['width']/2-w/2)<1,g)
     check(name+' title/dots distinct from Exit',g['exit']['right']<=g['heading']['x'] or g['exit']['bottom']<=g['heading']['y'],g)
     check(name+' exactly3 noninteractive current dots',g['dotsCount']==3 and g['activeDots']==[0] and not g['interactiveDots'])
     check(name+' dialogue external/wave common media width',g['dialogue']['y']>=g['scene']['bottom']-1 and abs(g['wave']['x']-g['scene']['x'])<1 and abs(g['wave']['width']-g['scene']['width'])<1)
     if w>=1248:check(name+' centered useful video/panel24/gutter/taskfit',abs(g['scene']['x']+g['scene']['width']/2-w/2)<1 and abs(g['panel']['x']-g['scene']['right']-24)<1 and g['panel']['right']<=w-31 and g['scene']['width']>=591 and g['next']['bottom']<=h and g['wave']['bottom']<=h,g)
     if (w,h) in [(1440,900),(1280,600),(1248,700),(390,667)] or (w==1920 and not long):shot(page,str(w)+'x'+str(h)+('-longRU' if long else '-normal'))
    c.close()
   a,bb=pair['A'],pair['B'];name=str(w)+'x'+str(h)+(' longRU' if long else ' normal')
   check(name+' A/B wave height and actual dialogue gap equal',abs(a['wave']['height']-bb['wave']['height'])<.1 and abs((a['wave']['y']-a['dialogue']['bottom'])-(bb['wave']['y']-bb['dialogue']['bottom']))<.1,{'Aheight':a['wave']['height'],'Bheight':bb['wave']['height'],'Agap':a['wave']['y']-a['dialogue']['bottom'],'Bgap':bb['wave']['y']-bb['dialogue']['bottom']})
   check(name+' A/B title/dots vertical rhythm equal',abs(a['heading']['y']-bb['heading']['y'])<.1 and abs(a['dots']['y']-bb['dots']['y'])<.1 and a['titleType']==bb['titleType'],{'AtitleY':a['heading']['y'],'BtitleY':bb['heading']['y'],'AdotsY':a['dots']['y'],'BdotsY':bb['dots']['y'],'Afont':a['titleType'],'Bfont':bb['titleType']})
   matched.append({'name':name,**pair})
 # One actual three-position progression,with failed Next and Previous semantics.
 c=b.new_context(viewport={'width':1280,'height':600},device_scale_factor=1);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');ready(page);lab(page,'locale','ru');lab(page,'long-line')
 for i in range(3):
  page.locator('#record').click();page.wait_for_function('document.querySelector("#product").classList.contains("capturing")');page.wait_for_timeout(400);check('Position'+str(i+1)+' capture keeps dot and locks Exit/seek',active(page)==i and page.locator('#exit').is_disabled() and page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible())
  if i==0:shot(page,'1280x600-real-capture')
  page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)
  if i==0:
   candidate=st(page)['candidates'][0];lab(page,'fail-save');page.locator('#next').click();page.wait_for_function('!!JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).failure');check('Failed Next preserves first dot and exact candidate',active(page)==0 and st(page)['candidates'][0]==candidate);shot(page,'1280x600-failed-next');page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===1');check('Retry advances second dot',active(page)==1);page.locator('#previous').click();check('Previous reverses first dot',active(page)==0);page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===1');continue
  page.locator('#next').click()
  if i==1:page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===2');check('Third position active dot',active(page)==2)
 page.wait_for_function('!document.querySelector("#result-player").hidden&&!document.querySelector("#result-play").disabled');check('Initial completion Result hides dots',not page.locator('#dots').is_visible());shot(page,'1280x600-result')
 page.locator('#result-play').click();page.wait_for_timeout(250);page.locator('#exit').click();check('Result Exit still pauses source and preserves accepted',page.locator('#result').evaluate('v=>v.paused') and all(st(page)['accepted']));page.locator('#destination-close').click();check('Direct Result Exit returns focus',page.locator('#exit').evaluate('e=>document.activeElement===e'));page.locator('#return').click();check('Return first dot with accepted takes',active(page)==0 and all(st(page)['accepted']));page.evaluate('scrollTo(0,0)');g=geom(page);check('Saved header utilities/title do not overlap',g['toResult'] is not None and g['exit']['right']<=g['heading']['x'] and g['heading']['right']<=g['toResult']['x'],g);shot(page,'1280x600-saved-header');c.close()
 # Phone saved-header/result fixture is bounded visual evidence,not another full capture run.
 seed={'index':0,'accepted':[{'id':1},{'id':2},{'id':3}],'candidates':[None]*3,'completed':True,'view':'record','locale':'ru'};c=b.new_context(viewport={'width':390,'height':667});c.add_init_script('localStorage.setItem("dubbed-lowfi-v1",'+json.dumps(json.dumps(seed))+')');page=c.new_page();page.goto('http://127.0.0.1:5178');ready(page);lab(page,'long-line');g=geom(page);check('Phone utility48/title second-row no collision',g['exit']['height']>=48 and g['toResult']['height']>=48 and g['exit']['bottom']<=g['heading']['y'] and g['toResult']['bottom']<=g['heading']['y'] and g['exit']['right']<g['toResult']['x'],g);shot(page,'390x667-saved-header');page.locator('#to-result').click();page.wait_for_function('!document.querySelector("#result-player").hidden');check('Phone Result dots hidden,Exit remains48',not page.locator('#dots').is_visible() and page.locator('#exit').bounding_box()['height']>=48);shot(page,'390x667-result');c.close();b.close()
report={'version':'core-journey-panel-highfi-v7','date':'2026-10-28','browser':'Chrome '+browser,'environment':'Windows/headless installed Chrome/DPR1/100% CSS viewport','checks':checks,'matchedGeometry':matched,'pageErrors':errors,'pass':sum(x['pass'] for x in checks),'total':len(checks)};(out/'panel-v7-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':report['pass'],'total':report['total'],'concerns':[x for x in checks if not x['pass']],'pageErrors':errors},ensure_ascii=False))
