import json, time, hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(__file__).parent
checks=[]; geometry=[]
def check(name, value, detail=None):
    checks.append({'name':name,'pass':bool(value),'detail':detail})
    if not value: print('CONCERN',name,detail,flush=True)
def ready(page):
    page.wait_for_function('document.querySelector("#scene").readyState>=3')
    page.wait_for_timeout(180)
def lab(page, name, value=True):
    details=page.locator('.lab details')
    if not details.get_attribute('open'): page.locator('.lab summary').click()
    if name=='locale': page.locator('#locale').select_option(value)
    else: page.locator('#'+name).set_checked(value)
    page.locator('.lab summary').click()
def capture(page):
    page.locator('#record').click()
    page.wait_for_function('document.querySelector("#product").classList.contains("capturing")')
def finish(page):
    page.wait_for_function('!document.querySelector("#product").classList.contains("capturing")',timeout=10000)
def storage(page, key='dubbed-studio-lowfi-v1'):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
def bounds(page):
    return page.evaluate('''()=>{let rect=s=>{let r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {viewport:{width:innerWidth,height:innerHeight},scrollY,scrollHeight:document.documentElement.scrollHeight,scene:rect('.scene'),video:rect('#scene'),script:rect('.script'),dialogue:rect('#dialogue'),wave:rect('.wave'),controls:rect('.studio-controls'),main:rect('#main')}}''')
def snap(page,name):page.screenshot(path=str(out/name))

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    version=browser.version
    for width,height,long in [(1440,900,False),(1366,650,True),(1280,600,True),(1280,699,True),(1280,700,True),(1280,701,True),(390,667,True)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page)
        if long:lab(page,'locale','ru');lab(page,'long-line')
        page.evaluate('scrollTo(0,0)');page.wait_for_timeout(100)
        g=bounds(page);g['longRU']=long;geometry.append(g)
        check(f'{width}x{height} dialogue outside complete frame',g['script']['y']>=g['scene']['bottom']-1,g)
        check(f'{width}x{height} shared scene-wave edges',abs(g['scene']['x']-g['wave']['x'])<1 and abs(g['scene']['width']-g['wave']['width'])<1)
        check(f'{width}x{height} whole 16:9 frame',abs(g['scene']['width']/g['scene']['height']-16/9)<.015)
        if width>=768:check(f'{width}x{height} task controls fit',g['controls']['bottom']<=height and g['scene']['width']>=607,g)
        if width==1440:snap(page,'studio-v3-review-desktop.png')
        if width==390:snap(page,'studio-v3-review-phone-long-before.png')
        ctx.close()
    seq=[g['scene']['width'] for g in geometry if g['viewport']['height'] in [699,700,701]]
    check('699/700/701 continuous scene size',max(seq)-min(seq)<5,seq)
    ctx=browser.new_context(viewport={'width':1280,'height':600},device_scale_factor=1)
    page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page);lab(page,'locale','ru');lab(page,'long-line')
    page.locator('#replay').click();page.wait_for_timeout(700);page.locator('#pause').click()
    paused=page.locator('#scene').evaluate('v=>v.currentTime');page.wait_for_timeout(250)
    check('Pause preserves listening time',abs(page.locator('#scene').evaluate('v=>v.currentTime')-paused)<.025)
    page.locator('#pause').click();page.wait_for_timeout(300)
    check('Resume continues listening time',page.locator('#scene').evaluate('v=>v.currentTime')>paused+.15)
    rect=page.locator('#scrub').bounding_box();page.mouse.move(rect['x']+rect['width']*.35,rect['y']+rect['height']/2);page.mouse.down();page.mouse.move(rect['x']+rect['width']*.55,rect['y']+rect['height']/2)
    held=page.locator('#scene').evaluate('v=>({paused:v.paused,time:v.currentTime})');page.wait_for_timeout(200)
    check('Held seek pauses playback',held['paused'] and abs(page.locator('#scene').evaluate('v=>v.currentTime')-held['time'])<.03)
    page.mouse.up();page.wait_for_timeout(220);check('Released seek plays',not page.locator('#scene').evaluate('v=>v.paused'))
    capture(page);page.wait_for_timeout(650)
    a=page.locator('.wave').get_attribute('data-overlay-progress');source_path=page.locator('.original-envelope').get_attribute('d')
    check('Capture supersedes listening and locks scrub/Pause',page.locator('#scrub').is_disabled() and not page.locator('#pause').is_visible())
    frame=bounds(page);page.wait_for_timeout(750);b=page.locator('.wave').get_attribute('data-overlay-progress')
    check('Take overlay grows while original stays fixed',float(b)>float(a) and page.locator('.original-envelope').get_attribute('d')==source_path,[a,b])
    snap(page,'studio-v3-review-short-long-recording.png');finish(page);after=bounds(page)
    check('Capture completion preserves frame/dialogue box',abs(frame['scene']['width']-after['scene']['width'])<1 and abs(frame['script']['y']-after['script']['y'])<1)
    check('Completed overlay retained',page.locator('.wave').get_attribute('data-has-take')=='true' and float(page.locator('.wave').get_attribute('data-overlay-progress'))>.99)
    snap(page,'studio-v3-review-short-long-candidate.png')
    page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');page.locator('#previous').click()
    accepted=storage(page)['accepted'][0];capture(page);finish(page);candidate=storage(page)['candidates'][0]
    lab(page,'fail-save');page.locator('#exit').click();check('Exit with candidate has keep-take guard',page.locator('#guard').is_visible());page.locator('#guard button[value=save]').click();page.wait_for_function('document.querySelector("#next").textContent.includes("Повторить")')
    failed=storage(page);check('Failed Exit save preserves exact candidate/accepted/destination',failed['candidates'][0]==candidate and failed['accepted'][0]==accepted and failed['failureDestination']=='My projects',failed)
    snap(page,'studio-v3-review-failed-exit-save.png');page.reload();ready(page);restored=storage(page)
    check('Reload preserves failed candidate/accepted/destination',restored['candidates'][0]==candidate and restored['accepted'][0]==accepted and restored['failureDestination']=='My projects')
    page.locator('#take').click();page.wait_for_timeout(350)
    check('Retained candidate audition plays synchronized sample',page.locator('#scene').evaluate('v=>!v.paused&&v.muted') and page.locator('#take-audio').evaluate('a=>!a.paused&&a.currentTime>0'))
    page.locator('#next').click();page.wait_for_function('document.querySelector("#destination").open');check('Retry preserves Exit destination',page.locator('#destination-title').inner_text()=='Мои проекты')
    page.locator('#destination-close').click();page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")')
    capture(page);finish(page);page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("3 / 3")');capture(page);finish(page);page.locator('#next').click();page.wait_for_function('!document.querySelector("#result-view").hidden');page.wait_for_function('!document.querySelector("#result").hidden')
    check('Sequential acceptance still reaches Result',storage(page)['completed'] and all(storage(page)['accepted']))
    snap(page,'studio-v3-review-result.png');page.locator('#return').click();check('Result return restores recording',page.locator('#record-view').is_visible())
    ctx.close()
    for url,key in [('http://127.0.0.1:5179','dubbed-studio-lowfi-v1'),('http://127.0.0.1:5178','dubbed-lowfi-v1')]:
        ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1);page=ctx.new_page();page.goto(url);ready(page)
        check(url+' no removed feature UI/handler nodes',page.locator('[id*=reprocess],[id*=process-again],[id*=repeat-prep]').count()==0 and 'Process again' not in page.locator('#product').inner_text())
        capture(page);finish(page);page.locator('#next').click();page.wait_for_timeout(650)
        check(url+' no removed feature after acceptance','Process again' not in page.locator('#product').inner_text())
        ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':667},device_scale_factor=1,reduced_motion='reduce');page=ctx.new_page();page.goto('http://127.0.0.1:5179');ready(page);lab(page,'locale','ru');lab(page,'long-line');capture(page);page.wait_for_timeout(800);snap(page,'studio-v3-review-phone-long-recording.png');g=bounds(page)
    check('Phone capture reorients scene/dialogue/time',g['scene']['y']>=15 and g['dialogue']['bottom']<=667 and g['wave']['bottom']<=667,g)
    finish(page);page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');capture(page);page.wait_for_timeout(700);g=bounds(page)
    check('Phone Next-to-record context survives',g['scene']['y']>=15 and g['dialogue']['bottom']<=667 and g['wave']['bottom']<=667,g)
    snap(page,'studio-v3-review-phone-line2-recording.png');ctx.close();browser.close()
result={'version':'core-journey-studio-lowfi-v3','browser':'Chrome '+version,'mode':'headless actual Chrome; DPR1; 100% CSS viewport','checks':checks,'geometry':geometry,'pass':sum(x['pass'] for x in checks),'total':len(checks),'date':'2026-10-27'}
(out/'v3-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'browser':result['browser'],'pass':result['pass'],'total':result['total'],'concerns':[x for x in checks if not x['pass']]},ensure_ascii=False),flush=True)
