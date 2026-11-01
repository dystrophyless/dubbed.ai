import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;root=out.parent;checks=[]
manifest=json.loads((root/'evidence/version.json').read_text());assert manifest['version']=='core-journey-lowfi-v4'
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in manifest['sha256'].items()}
assert all(hashes().values())
def note(name,data):checks.append({'check':name,'observed':data});(out/'v4-phone-context-checks.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8');print(name,str(data)[:180],flush=True)
def click_min(page,selector):
 r=page.locator(selector).bounding_box();height=page.viewport_size['height']
 if r['y']+r['height']>height-8:page.mouse.wheel(0,r['y']+r['height']-height+8);page.wait_for_timeout(200)
 elif r['y']<8:page.mouse.wheel(0,r['y']-8);page.wait_for_timeout(200)
 r=page.locator(selector).bounding_box();assert r['y']>=0 and r['y']+r['height']<=height;page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
def geom(page,name,capturing=False):
 data=page.locator('#scene,#dialogue,#capture-badge').evaluate_all('(es)=>({scroll:scrollY,height:innerHeight,items:es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON()}))})')
 geometry=page.locator('.scene,.wave,#scrub').evaluate_all('(es)=>es.map(e=>({class:e.className,id:e.id,rect:e.getBoundingClientRect().toJSON()}))'); stage=geometry[0]['rect']; assert abs(stage['width']/stage['height']-16/9)<.01; assert all(abs(e['rect']['width']-stage['width'])<1 and abs(e['rect']['x']-stage['x'])<1 for e in geometry[1:]); data['stageAndWave']=geometry
 for e in data['items']:
  if e['id']=='capture-badge' and not capturing:continue
  r=e['rect'];assert r['top']>=0 and r['bottom']<=data['height'],(name,e)
 note(name,data);page.screenshot(path=str(out/(name+'.png')))
def capture(page,name):
 click_min(page,'#record');expect(page.locator('#capture-badge')).to_be_visible();geom(page,name,True);assert page.locator('#next').is_disabled() and page.locator('#replay').is_disabled();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 note('environment',{'browser':browser.version,'date':'2026-10-27','os':'Windows','dpr':1,'zoom':'100%','version':manifest['version']})
 for width,height,long,reduced in [(390,667,True,True)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
  label=f'v4-review-{width}x{height}-'+('long' if long else 'normal')+('-reduce' if reduced else '')
  if long:page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click()
  initial_scroll=page.evaluate('scrollY');capture(page,label+'-first-capture');assert page.locator('#position').inner_text()=='Line 1 of 3'
  click_min(page,'#next');expect(page.locator('#position')).to_have_text('Line 2 of 3');geom(page,label+'-new-line');assert page.locator('#scene').evaluate('(e)=>e.paused')
  capture(page,label+'-second-capture')
  if width==390 and height==667 and not long:
   identity=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[1].id');click_min(page,'#previous');expect(page.locator('#guard')).to_be_visible();page.get_by_role('button',name='Stay',exact=True).click();expect(page.locator('#position')).to_have_text('Line 2 of 3');note('Nearby guard Stay retains candidate',page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[1].id')==identity)
   page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();click_min(page,'#next');expect(page.locator('#feedback')).to_contain_text('Couldn’t save');assert page.locator('#position').inner_text()=='Line 2 of 3';assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[1].id')==identity
   click_min(page,'#take');page.wait_for_function('!document.querySelector("#take-audio").paused && document.querySelector("#take-audio").currentTime>.2');page.locator('#pause').click();note('Nearby failure retains exact candidate and audition',True)
   page.get_by_role('button',name='Retry save',exact=True).click();expect(page.locator('#position')).to_have_text('Line 3 of 3');geom(page,label+'-retry-next-line');click_min(page,'#previous');expect(page.locator('#position')).to_have_text('Line 2 of 3');geom(page,label+'-previous-line');note('Retry and accepted Previous remain usable',True)
  note(label+' page errors',errors);assert not errors;context.close()
 note('final stable target hashes',hashes());assert all(hashes().values());browser.close()


