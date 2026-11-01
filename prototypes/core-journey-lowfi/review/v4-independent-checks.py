import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;root=out.parent;checks=[];manifest=json.loads((root/'evidence/version.json').read_text());assert manifest['version']=='core-journey-lowfi-v4'
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in manifest['sha256'].items()}
def note(name,data):checks.append({'check':name,'observed':data});(out/'v4-independent-checks.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8');print(name,str(data)[:270],flush=True)
def shot(page,name):page.screenshot(path=str(out/(name+'.png')))
def layout(page,name):
 page.evaluate('scrollTo(0,0)');page.wait_for_timeout(300)
 d=page.locator('.scene,#dialogue,.wave,#scrub,#time,#volume').evaluate_all('(es)=>({height:innerHeight,width:innerWidth,scroll:scrollY,items:es.map(e=>({id:e.id,cls:e.className,rect:e.getBoundingClientRect().toJSON()})),fit:getComputedStyle(document.querySelector("#scene")).objectFit})')
 assert d['scroll']==0 and d['fit']=='contain'
 for e in d['items']:assert e['rect']['top']>=0 and e['rect']['bottom']<=d['height'] and e['rect']['x']>=0 and e['rect']['right']<=d['width'],(name,e)
 stage=d['items'][0]['rect'];assert abs(stage['width']/stage['height']-16/9)<.01
 for e in d['items'][2:4]:assert abs(e['rect']['width']-stage['width'])<1 and abs(e['rect']['x']-stage['x'])<1
 note(name,d);shot(page,name);return d


def grouping(page,name):
 d=page.locator('.project-header,.project-name,#heading,.result-stage,.result-bottom').evaluate_all('(es)=>es.map(e=>({id:e.id,cls:e.className,rect:e.getBoundingClientRect().toJSON()}))');left=d[3]['rect']['x'];right=d[3]['rect']['right'];assert all(abs(e['rect']['x']-left)<1 for e in d);assert abs(d[0]['rect']['right']-right)<1 and abs(d[4]['rect']['right']-right)<1;note(name,d);shot(page,name)
def capture(page):page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();assert page.locator('#pause').is_hidden() and page.locator('#scrub').is_disabled();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
assert all(hashes().values())
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');note('environment',{'version':manifest['version'],'browser':b.version,'os':'Windows','dpr':1,'zoom':'100%','date':'2026-10-27'})
 for w,h in [(1920,910),(1440,900),(1366,650),(1280,600)]:
  page.set_viewport_size({'width':w,'height':h})
  for long in [False,True]:
   page.locator('.lab summary').click();page.locator('#long-line').set_checked(long);page.locator('.lab summary').click();layout(page,f'v4-review-{w}x{h}-'+('long' if long else 'normal'))
 page.set_viewport_size({'width':1440,'height':900});page.locator('.lab summary').click();page.locator('#long-line').uncheck();page.locator('.lab summary').click();layout(page,'v4-review-before-record');expect(page.locator('.utility')).to_be_visible();capture(page);identity=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id');page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click();expect(page.locator('#feedback')).to_contain_text('Couldn’t save');expect(page.locator('.utility')).to_be_visible();assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==identity;note('Failed first save preserves candidate and visible utility',True);shot(page,'v4-review-first-save-failure');page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused && document.querySelector("#take-audio").currentTime>.2');page.locator('#pause').click();t=page.locator('#take-audio').evaluate('(e)=>e.currentTime');page.locator('#pause').click();page.wait_for_timeout(170);assert page.locator('#take-audio').evaluate('(e)=>e.currentTime')>t;note('Candidate audition and Resume survive layout change',True);page.get_by_role('button',name='Retry save',exact=True).click();expect(page.locator('#position')).to_have_text('Line 2 of 3');expect(page.locator('.utility')).to_be_hidden();assert page.locator('.utility').evaluate('(e)=>e.getBoundingClientRect().height')==0;note('First accepted save hides whole utility',page.locator('.utility').evaluate('(e)=>({rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display})'));shot(page,'v4-review-saved-panel');capture(page);page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 3 of 3');capture(page);page.locator('#next').click();expect(page.locator('#assembly')).to_be_visible();grouping(page,'v4-review-result-assembly-desktop');expect(page.locator('#result')).to_be_visible(timeout=5000);grouping(page,'v4-review-result-ready-desktop')
 for w,h in [(390,844),(1280,600)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(100);grouping(page,f'v4-review-result-ready-{w}x{h}')
 page.set_viewport_size({'width':1440,'height':900});page.locator('#return').click();expect(page.locator('#position')).to_have_text('Line 1 of 3');expect(page.locator('.utility')).to_be_hidden();after=layout(page,'v4-review-return-record');assert after['items'][0]['rect']['width']>300;note('Return restores Record composition and saved takes',page.locator('main').inner_text())
 note('page errors',errs);assert not errs;note('final stable hashes',hashes());assert all(hashes().values());b.close()

