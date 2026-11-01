import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;root=out.parent;manifest=json.loads((root/'evidence/version.json').read_text());assert manifest['version']=='core-journey-highfi-v2';checks=[]
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in manifest['sha256'].items()}
def note(n,d):checks.append({'check':n,'observed':d});(out/'hf2-independent-recovery.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8');print(n,str(d)[:300],flush=True)
def st(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def opt(page,id,value=True):
 page.locator('.lab summary').click()
 if id=='#locale':page.locator(id).select_option(value)
 else:page.locator(id).set_checked(value)
 page.locator('.lab summary').click()
def cap(page):page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
def pos(page,n):expect(page.locator('#position')).to_contain_text(str(n))
def snap(page,n):page.screenshot(path=str(out/(n+'.png')))
def describe(page,n,action,safe=True):
 expect(page.locator('#feedback')).to_be_visible();assert page.locator('#feedback button,#feedback a').count()==0;assert page.locator('#feedback').get_attribute('aria-live')=='polite';d=page.locator('#feedback,'+action+',.scene,#dialogue').evaluate_all('(es)=>({h:innerHeight,w:innerWidth,scroll:scrollY,items:es.map(e=>({id:e.id,cls:e.className,rect:e.getBoundingClientRect().toJSON(),text:e.id=="feedback"?e.innerText:""}))})');notice=next(e['rect'] for e in d['items'] if e['id']=='feedback');a=next(e['rect'] for e in d['items'] if e['id']==action[1:]);assert not safe or (a['top']>=0 and a['bottom']<=notice['top']-6),(n,d);assert abs((notice['left']+notice['right'])/2-d['w']/2)<1 and notice['bottom']<=d['h']-15;assert not page.locator('#feedback').evaluate('(e)=>e.contains(document.activeElement)');note(n,d);snap(page,n)
def audition_persistent(page,n):
 page.evaluate('window.reviewNoticeMutations=0;window.reviewObserver?.disconnect();window.reviewObserver=new MutationObserver(ms=>window.reviewNoticeMutations+=ms.length);window.reviewObserver.observe(document.querySelector("#feedback"),{childList:true,characterData:true,subtree:true})');page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused && document.querySelector("#take-audio").currentTime>.2');page.wait_for_timeout(250);snap(page,n+'-listening');page.locator('#pause').click();assert page.locator('#feedback').is_visible();m=page.evaluate('window.reviewNoticeMutations');assert m==0;note(n+' notice stable during audition',{'mutations':m,'message':page.locator('#feedback').inner_text(),'visibleErrorNotices':page.locator('#feedback:visible').count()})
assert all(hashes().values())
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);note('environment',{'browser':b.version,'date':'2026-10-27','os':'Windows','zoom':'100%','dpr':1,'version':manifest['version']})
 for w,h,lang in [(1882,902,'en'),(1280,600,'ru'),(390,667,'ru')]:
  for kind in ['microphone','save']:
   context=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w==390 else 'no-preference');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');opt(page,'#locale',lang)
   if lang=='ru':opt(page,'#long-line')
   baseline=page.locator('.scene').bounding_box();label=f'hf2-review-{w}x{h}-{lang}-{kind}'
   if w==390 and kind=='save':
    cap(page);page.locator('#next').click();pos(page,2);cap(page);page.locator('#next').click();pos(page,3);page.locator('#previous').click();pos(page,2);accepted=st(page)['accepted'][1]['id'];cap(page);candidate=st(page)['candidates'][1]['id'];opt(page,'#fail-save');page.locator('#previous').click();expect(page.locator('#guard')).to_be_visible();page.locator('#guard button').nth(2).click();expect(page.locator('#feedback')).to_be_visible();assert st(page)['accepted'][1]['id']==accepted and st(page)['candidates'][1]['id']==candidate
   else:
    cap(page);candidate=st(page)['candidates'][0]['id']
    if kind=='microphone':opt(page,'#fail-mic');page.locator('#record').click()
    else:opt(page,'#fail-save');page.locator('#next').click()
   action='#open-settings' if kind=='microphone' else '#next';describe(page,label,action);current=page.locator('.scene').bounding_box();assert abs(current['width']-baseline['width'])<1 and abs(current['height']-baseline['height'])<1;note(label+' preserves approved media size',{'before':baseline,'after':current});audition_persistent(page,label);assert page.locator('#feedback').is_visible();page.reload();expect(page.locator('#feedback')).to_be_visible();note(label+' notice survives reload',page.locator('#feedback').inner_text());describe(page,label+'-reloaded',action,safe=False);r=page.locator(action).bounding_box();top=page.locator('#feedback').bounding_box()['y'];page.mouse.wheel(0,max(0,r['y']+r['height']-top+12));page.wait_for_timeout(180);describe(page,label+'-recovery-reachable',action)
   if w==390 and kind=='microphone':
    assert st(page)['candidates'][0]['id']==candidate;page.locator('#open-settings').click();expect(page.locator('#guard')).to_be_visible();page.locator('#guard button').nth(0).click();expect(page.locator('#feedback')).to_be_visible();assert page.evaluate('document.activeElement.id')=='open-settings';page.locator('#open-settings').click();page.locator('#guard button').nth(2).click();expect(page.locator('#destination')).to_be_visible();assert st(page)['accepted'][0]['id']==candidate;page.locator('#destination-close').click();expect(page.locator('#feedback')).to_be_visible();page.locator('#next').click();pos(page,2);expect(page.locator('#feedback')).to_be_visible();page.reload();expect(page.locator('#feedback')).to_be_visible();cap(page);expect(page.locator('#feedback')).to_be_hidden();note('Mic recovery persists guards/boundary/navigation/reload; successful capture resolves',True)
   elif w==390:
    assert st(page)['accepted'][1]['id']==accepted and st(page)['candidates'][1]['id']==candidate;page.locator('#next').click();pos(page,1);expect(page.locator('#feedback')).to_be_hidden();assert st(page)['accepted'][1]['id']==candidate;note('Retry after Previous failure/reload preserves exact replacement and requested Previous destination',True)
   elif kind=='save':
    page.locator('#next').click();pos(page,2);expect(page.locator('#feedback')).to_be_hidden();note(label+' successful retry resolves',True)
   note(label+' page errors',errors);assert not errors;context.close()
 note('Stable target hashes',hashes());assert all(hashes().values());b.close()

