import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;root=out.parent;m=json.loads((root/'evidence/version.json').read_text());assert m['version']=='core-journey-studio-lowfi-v2';old=root.parent/'core-journey-lowfi';om=(old/'evidence/version.json').read_bytes();checks=[]
def note(n,d):checks.append({'check':n,'observed':d});(out/'v2-independent-checks.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8');print(n,str(d)[:250],flush=True)
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in m['sha256'].items()}
def shot(page,n):page.screenshot(path=str(out/(n+'.png')))
def opt(page,id,v=True):
 page.locator('.lab summary').click()
 if id=='#locale':page.locator(id).select_option(v)
 else:page.locator(id).set_checked(v)
 page.locator('.lab summary').click()
def measure(page,n,fit=True):
 d=page.locator('#scene,#dialogue,#pause,.wave,#next,#exit').evaluate_all('(es)=>({w:innerWidth,h:innerHeight,scroll:scrollY,items:es.map(e=>({id:e.id,cls:e.className,rect:e.getBoundingClientRect().toJSON()})),video:{w:document.querySelector("#scene").videoWidth,h:document.querySelector("#scene").videoHeight,position:getComputedStyle(document.querySelector("#scene")).objectPosition,fit:getComputedStyle(document.querySelector("#scene")).objectFit}})');scene=next(e['rect'] for e in d['items'] if e['id']=='scene');caption=next(e['rect'] for e in d['items'] if e['id']=='dialogue');k=min(scene['width']/d['video']['w'],scene['height']/d['video']['h']);pictureBottom=scene['top']+d['video']['h']*k;d['pictureBottomTopAligned']=pictureBottom;d['captionClearance']=caption['top']-pictureBottom
 assert d['video']['fit']=='contain';assert page.locator('#dialogue').count()==1
 if d['w']>=768 and d['h']<=700:assert d['captionClearance']>=6 and caption['bottom']<=scene['bottom'] and scene['width']>570 and d['video']['position']=='50% 0%'
 if fit:assert all(e['rect']['top']>=0 and e['rect']['bottom']<=d['h'] for e in d['items'] if e['rect']['width'] and e['id']!='pause')
 note(n,d);shot(page,n)
assert all(hashes().values())
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1280,'height':600},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');opt(page,'#locale','ru');opt(page,'#long-line');note('environment',{'browser':b.version,'date':'2026-10-27','os':'Windows','DPR':1,'zoom':'100%','version':m['version']});measure(page,'studio-v2-review-short-long-before');page.locator('#replay').click();page.wait_for_timeout(350);measure(page,'studio-v2-review-short-long-listening');pause=page.locator('#pause').bounding_box();caption=page.locator('#dialogue').bounding_box();assert pause['y']+pause['height']<caption['y'];page.locator('#pause').click();t=page.locator('#scene').evaluate('(e)=>e.currentTime');measure(page,'studio-v2-review-short-long-paused');page.locator('#pause').click();page.wait_for_timeout(180);assert page.locator('#scene').evaluate('(e)=>e.currentTime')>t
 page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();assert page.locator('#pause').is_hidden() and page.locator('#scrub').is_disabled();page.wait_for_timeout(1000);measure(page,'studio-v2-review-short-long-capture');early=float(page.locator('.wave').get_attribute('data-overlay-progress'));page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.wait_for_timeout(180);measure(page,'studio-v2-review-short-long-after');assert 0<early<1 and page.locator('.wave').get_attribute('data-overlay-progress')=='1';page.locator('#take').click();page.wait_for_function('document.querySelector("#take-audio").currentTime>.2 && !document.querySelector("#take-audio").paused');measure(page,'studio-v2-review-short-long-audition');page.locator('#pause').click();page.locator('#next').click();expect(page.locator('#position')).to_contain_text('2')
 for w,h in [(1366,650),(1440,900),(1280,700),(1280,701),(768,700),(767,700),(1280,600)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(220);measure(page,f'studio-v2-review-resize-{w}x{h}',fit=w>=768)
 opt(page,'#long-line',False);measure(page,'studio-v2-review-short-normal')
 note('Page errors',errors);assert not errors;note('Studio target hashes',hashes());assert all(hashes().values());baseline=json.loads(om);bad=[f for f,h in baseline['sha256'].items() if hashlib.sha256((old/f).read_bytes()).hexdigest()!=h];assert not bad and (old/'evidence/version.json').read_bytes()==om;note('Original comparison unchanged',{'files':len(baseline['sha256']),'manifestUnchanged':True,'mismatches':bad});b.close()

