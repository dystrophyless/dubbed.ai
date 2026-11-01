import json,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent
checks=[]
def record(name,data=None):
 checks.append({'check':name,'observed':data}); print(name, str(data)[:350],flush=True)
def media(page):
 return page.locator('video,audio').evaluate_all('(es)=>es.map(e=>({id:e.id,src:e.currentSrc,time:e.currentTime,paused:e.paused,muted:e.muted,volume:e.volume,ready:e.readyState}))')
def store(page): return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def snap(page,name,full=False): page.screenshot(path=str(out/(name+'.png')),full_page=full)
def capture(page):
 page.locator('#record').click(); expect(page.locator('#capture-badge')).to_be_visible(); page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
def toggle(page,id):
 page.locator('.lab summary').click(); page.locator(id).check(); page.locator('.lab summary').click()
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 record('environment',{'browser':b.version,'viewport':page.viewport_size})
 record('initial empty disabled',{'next':page.locator('#next').is_disabled(),'take':page.locator('#take').is_disabled(),'media':media(page)})
 for size,name in [({'width':390,'height':844},'review-phone-initial'),({'width':390,'height':667},'review-shortphone-initial'),({'width':1280,'height':600},'review-shortdesktop-initial')]:
  page.set_viewport_size(size);page.evaluate('scrollTo(0,0)');snap(page,name);snap(page,name+'-full',True)
  record(name, page.locator('#scene,#dialogue,#replay,#record,#take,#next').evaluate_all('(es)=>es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON()}))'))
 page.set_viewport_size({'width':1440,'height':900})
 page.locator('#replay').click();page.wait_for_function('document.querySelector("#scene").paused && document.querySelector("#scene").currentTime>4',timeout=10000)
 record('replay ended',media(page));page.locator('#replay').click();page.wait_for_timeout(300);record('replay restart after ended',media(page))
 page.locator('#replay').click();record('active Replay pauses',media(page));page.locator('#replay').click();page.wait_for_timeout(250);record('paused Replay restarts',media(page))
 page.locator('#record').click();snap(page,'review-desktop-capturing');record('capture locks',page.locator('#next,#previous,#replay,#take,#record,#scrub').evaluate_all('(es)=>es.map(e=>({id:e.id,disabled:e.disabled,text:e.innerText}))'))
 page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);record('capture automatically ends same line',page.locator('main').inner_text())
 first=store(page)['candidates'][0]['id'];page.locator('#take').click();page.wait_for_timeout(500);record('candidate audition',media(page))
 page.locator('#record').click();record('Record supersedes candidate audition',media(page));page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
 candidate=store(page)['candidates'][0]['id'];record('rerecord produced different candidate',first!=candidate)
 page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');a=store(page)['accepted'][0]['id'];record('accept exact candidate then advance',a==candidate)
 page.locator('#previous').click();expect(page.locator('#position')).to_have_text('Line 1 of 3');record('accepted revisit',page.locator('main').inner_text());page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');record('revisit Next leaves accepted id',store(page)['accepted'][0]['id']==a)
 capture(page);page.locator('#previous').click();snap(page,'review-previous-guard');record('previous guard text',page.locator('#guard').inner_text());page.get_by_role('button',name='Stay',exact=True).click()
 page.locator('#previous').click();page.get_by_role('button',name='Go without saving',exact=True).click();expect(page.locator('#position')).to_have_text('Line 1 of 3');page.locator('#next').click();record('discard previous leaves empty line two',{'next':page.locator('#next').is_disabled(),'take':page.locator('#take').is_disabled()})
 capture(page);page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 3 of 3');page.locator('#previous').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');old=store(page)['accepted'][1]['id'];capture(page);c=store(page)['candidates'][1]['id'];toggle(page,'#fail-save');page.locator('#next').click();expect(page.locator('#feedback')).to_contain_text('Couldn’t save');record('failed replacement preserves old and exact candidate',{'accepted':store(page)['accepted'][1]['id']==old,'candidate':store(page)['candidates'][1]['id']==c,'text':page.locator('main').inner_text()})
 page.set_viewport_size({'width':390,'height':844});page.evaluate('scrollTo(0,0)');snap(page,'review-phone-failed-save-full',True)
 page.locator('#take').click();page.wait_for_timeout(400);record('failed-save candidate still plays',media(page));page.locator('#pause').click()
 page.get_by_role('button',name='Retry save',exact=True).click();expect(page.locator('#position')).to_have_text('Line 3 of 3');record('retry accepts exact candidate',store(page)['accepted'][1]['id']==c)
 capture(page);page.get_by_role('button',name='Settings',exact=True).click();record('workspace guard',page.locator('#guard').inner_text());snap(page,'review-phone-exit-guard');page.get_by_role('button',name='Stay',exact=True).click()
 page.locator('#next').click();expect(page.locator('#assembly')).to_be_visible();record('assembly after final acceptance',page.locator('main').inner_text());expect(page.locator('#result')).to_be_visible(timeout=5000);page.wait_for_function('document.querySelector("#result").readyState>=3');page.evaluate('scrollTo(0,0)');snap(page,'review-phone-result');record('result hierarchy',page.locator('main').inner_text())
 page.locator('#result').evaluate('(e)=>e.play()');page.wait_for_timeout(800);record('result plays distinct source',media(page));page.locator('#result').evaluate('(e)=>e.pause()')
 page.set_viewport_size({'width':1440,'height':900});snap(page,'review-desktop-result')
 with page.expect_download() as d:page.locator('#download').click()
 record('download',d.value.suggested_filename)
 page.locator('#return').click();expect(page.locator('#position')).to_have_text('Line 1 of 3');record('result return first accepted no capture',{'text':page.locator('main').inner_text(),'media':media(page)})
 capture(page);page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name='Leave without saving',exact=True).click();record('Settings boundary',page.locator('#destination').inner_text());page.locator('#destination-close').click();toggle(page,'#fail-mic');page.locator('#record').click();record('capture failure protected accepted and Settings-only recovery',page.locator('main').inner_text());snap(page,'review-desktop-input-failure')
 record('page errors',errors)
 manifest=json.loads((out.parent/'evidence/version.json').read_text());record('stable target hashes',{f:hashlib.sha256((out.parent/f).read_bytes()).hexdigest()==h for f,h in manifest['sha256'].items()})
 (out/'independent-checks.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8')
 b.close()

