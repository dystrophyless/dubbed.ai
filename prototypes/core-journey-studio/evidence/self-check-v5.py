import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT=Path(__file__).parent
PROTO=OUT.parent
checks=[]
errors=[]
KEY='dubbed-studio-lowfi-v1'

def result(name,**details):
    checks.append(dict(scenario=name,result='PASS',**details))
    print('PASS '+name,flush=True)

def state(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)

def click(page,selector):
    r=page.locator(selector).bounding_box()
    h=page.viewport_size['height']
    if r['y']<0 or r['y']+r['height']>h:
        page.mouse.wheel(0,r['y']+r['height']-h+12 if r['y']>=0 else r['y']-12)
        page.wait_for_timeout(150)
    r=page.locator(selector).bounding_box()
    assert r['y']>=0 and r['y']+r['height']<=h,(selector,r,h)
    page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)

def scenario(page,control):
    page.locator('.lab summary').click();page.locator(control).check();page.locator('.lab summary').click()

def capture(page):
    click(page,'#record');expect(page.locator('#capture-badge')).to_be_visible()
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)

def screen(page,name):
    page.wait_for_timeout(220)
    page.screenshot(path=str(OUT/(name+'.png')))

def setup(browser,w,h,ru=False,long=False,motion='no-preference'):
    ctx=browser.new_context(viewport=dict(width=w,height=h),device_scale_factor=1,reduced_motion=motion)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
    if ru or long:
        page.locator('.lab summary').click()
        if ru:page.locator('#locale').select_option('ru')
        if long:page.locator('#long-line').check()
        page.locator('.lab summary').click()
    page.wait_for_timeout(200)
    return ctx,page

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for w,h,ru,long,motion in [(1920,910,False,False,'no-preference'),(1440,900,False,False,'no-preference'),(1366,650,False,False,'no-preference'),(1280,600,False,False,'no-preference'),(390,844,False,False,'no-preference'),(390,667,False,False,'no-preference'),(1280,600,True,True,'no-preference'),(390,667,True,True,'reduce')]:
        ctx,page=setup(browser,w,h,ru,long,motion);name=f'studio-v5-{w}x{h}-'+('ru-long' if ru else 'en')+('-reduced' if motion=='reduce' else '')
        assert page.locator('#dots span').count()==3
        assert page.locator('#dots [aria-current=true]').count()==1
        assert page.locator('.global').count()==0
        assert page.locator('.wave path.original-envelope').count()==1
        assert page.locator('.wave line:not(.cursor)').count()==0
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        bounds=page.evaluate('''()=>Object.fromEntries(['.scene','.script','.timeline','.studio-controls'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}]}))''')
        assert abs(bounds['.scene']['width']/bounds['.scene']['height']-16/9)<.01
        assert page.locator('#scene').evaluate('(e)=>getComputedStyle(e).objectFit')=='contain'
        if w>=768:
            for r in bounds.values():assert r['y']>=0 and r['bottom']<=h,(name,bounds)
        g=page.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),a=r('.scene'),d=r('.script'),w=r('.wave');return {scene:[a.x,a.y,a.width,a.height,a.bottom],dialogue:[d.x,d.top,d.width,d.height,d.bottom],wave:[w.x,w.width],parent:document.querySelector('.script').parentElement.className,fit:document.querySelector('main').dataset.verticalFit}}''')
        assert g['parent']=='rehearsal' and g['dialogue'][1]>=g['scene'][4],g
        assert abs(g['wave'][0]-g['scene'][0])<1 and abs(g['wave'][1]-g['scene'][2])<1,g
        if w>=768:assert g['scene'][2]>=576,g
        assert page.locator('#process-again').count()==0
        presentation=page.evaluate('''()=>{const main=document.querySelector('main'),style=getComputedStyle(main),timeline=document.querySelector('.timeline').getBoundingClientRect(),row=document.querySelector('.studio-controls').getBoundingClientRect();return {gap:row.top-timeline.bottom,border:style.borderWidth,radius:style.borderRadius,shadow:style.boxShadow,background:style.backgroundColor,position:document.querySelector('#position').textContent,description:document.querySelector('#wave-description').textContent}}''')
        assert presentation['gap']>=24 and presentation['border']=='0px' and presentation['radius']=='0px' and presentation['shadow']=='none' and presentation['background']=='rgba(0, 0, 0, 0)',presentation
        assert page.locator('.wave-key,#take-key,.original-key,#speaker,#panel-speaker').count()==0
        assert 'Shaman' not in page.locator('#product').inner_text()
        assert presentation['position']==('Реплика 1 / 3' if ru else 'Line 1 / 3')
        assert presentation['description']
        result(name+' aligned canvas/outside dialogue/no legend or speaker/24px gap',geometry=g,presentation=presentation)
        screen(page,name+'-before')
        click(page,'#record');page.wait_for_timeout(1600)
        ratio=float(page.locator('.wave').get_attribute('data-overlay-progress'));assert .1<ratio<.8
        assert page.locator('#scrub').is_disabled()
        before=page.locator('#scene').evaluate('(e)=>e.currentTime')
        page.locator('#scrub').evaluate('(e)=>{e.value=990;e.dispatchEvent(new Event("input"));e.dispatchEvent(new Event("change"));}')
        after=page.locator('#scene').evaluate('(e)=>e.currentTime');assert abs(after-before)<.5
        screen(page,name+'-during')
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=8000)
        assert float(page.locator('.wave').get_attribute('data-overlay-progress'))==1
        assert page.locator('.wave .take-envelope').is_visible()
        screen(page,name+'-after')
        result(name+' initial/capture/complete',bounds=bounds,midCaptureReveal=ratio,captureSeekLocked=True)
        # Use actual minimal wheel to Next, then restore useful scene/dialogue context on turn change.
        click(page,'#next');page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")')
        assert page.locator('#dots span').nth(1).get_attribute('aria-current')=='true'
        assert page.locator('#process-again').count()==0
        if w<768:
            r=page.locator('.scene').bounding_box();d=page.locator('#dialogue').bounding_box();assert r['y']>=0 and d['y']+d['height']<=h,(name,r,d)
        result(name+' Next context and removed reset action')
        ctx.close()

    ctx,page=setup(browser,1440,900)
    click(page,'#replay');page.wait_for_timeout(700);click(page,'#pause');paused=page.locator('#scene').evaluate('(e)=>e.currentTime');page.wait_for_timeout(350)
    assert abs(page.locator('#scene').evaluate('(e)=>e.currentTime')-paused)<.1
    click(page,'#pause');page.wait_for_timeout(250);assert page.locator('#scene').evaluate('(e)=>e.currentTime')>paused
    click(page,'#replay');page.wait_for_timeout(150);assert page.locator('#scene').evaluate('(e)=>e.currentTime')<.5
    # Pointer drag must remain paused while held and play only after release.
    r=page.locator('#scrub').bounding_box();page.mouse.move(r['x']+r['width']*.4,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+r['width']*.65,r['y']+r['height']/2);page.wait_for_timeout(200)
    assert page.locator('#scene').evaluate('(e)=>e.paused');page.mouse.up();page.wait_for_timeout(200);assert not page.locator('#scene').evaluate('(e)=>e.paused')
    page.wait_for_function('document.querySelector("#scene").paused',timeout=7000);click(page,'#replay');page.wait_for_timeout(150);assert page.locator('#scene').evaluate('(e)=>e.currentTime')<.5
    result('Original restart/end, listening Pause/Resume, held/released pointer seek')
    capture(page);candidate=state(page)['candidates'][0]['id'];click(page,'#take');page.wait_for_timeout(300)
    assert page.locator('#scene').evaluate('(e)=>e.muted');assert not page.locator('#take-audio').evaluate('(e)=>e.paused')
    click(page,'#pause');click(page,'#pause');page.wait_for_timeout(150)
    assert page.locator('#scene').evaluate('(e)=>e.muted');assert state(page)['candidates'][0]['id']==candidate
    click(page,'#next');page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")')
    capture(page);click(page,'#next');page.wait_for_function('document.querySelector("#position").textContent.includes("3 / 3")');capture(page);click(page,'#next')
    expect(page.locator('#assembly')).to_be_visible();page.wait_for_function('document.querySelector("#assembly").hidden');screen(page,'studio-v5-desktop-result')
    assert all(state(page)['accepted']);result('Complete connected journey, take source sync, assembly/result')
    click(page,'#return');capture(page);new=state(page)['candidates'][0]['id'];old=state(page)['accepted'][0]['id'];assert new!=old
    scenario(page,'#fail-save');click(page,'#exit');expect(page.locator('#guard')).to_be_visible();page.locator('#guard [value=save]').click()
    expect(page.locator('#feedback')).to_be_visible();assert state(page)['candidates'][0]['id']==new and state(page)['accepted'][0]['id']==old
    assert state(page)['failureDestination']=='My projects';assert page.locator('#next').is_enabled();screen(page,'studio-v5-desktop-save-failure-during')
    page.wait_for_timeout(8600);expect(page.locator('#feedback')).to_be_hidden();assert state(page)['candidates'][0]['id']==new;screen(page,'studio-v5-desktop-save-failure-after')
    click(page,'#next');expect(page.locator('#destination')).to_be_visible();assert page.locator('#destination-title').inner_text()=='My projects';assert state(page)['accepted'][0]['id']==new
    result('Rerecord + failed Exit save retains candidate/old accepted/destination; notice expires; retry reaches retained destination')
    ctx.close()

    ctx,page=setup(browser,390,667,True,False,'reduce');scenario(page,'#fail-mic');click(page,'#record')
    expect(page.locator('#feedback')).to_be_visible();expect(page.locator('#open-settings')).to_be_visible();screen(page,'studio-v5-phone-mic-failure-during')
    page.wait_for_timeout(8200);expect(page.locator('#feedback')).to_be_hidden();expect(page.locator('#open-settings')).to_be_visible();screen(page,'studio-v5-phone-mic-failure-after')
    click(page,'#open-settings');expect(page.locator('#destination')).to_be_visible();assert page.locator('#settings-note').is_visible();click(page,'#destination-close');capture(page)
    click(page,'#exit');page.locator('#guard [value=stay]').click();assert state(page)['candidates'][0]
    click(page,'#next');page.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');capture(page);click(page,'#previous');page.locator('#guard [value=discard]').click();page.wait_for_function('document.querySelector("#position").textContent.includes("1 / 3")');assert state(page)['index']==0 and state(page)['candidates'][1] is None
    result('Short-phone RU reduced motion: timed microphone notice, durable Settings, Stay and guarded Previous discard')
    ctx.close()

    assert not errors,errors
    (OUT/'self-check-v5-results.json').write_text(json.dumps(dict(version='core-journey-studio-lowfi-v5',date='2026-10-27',timezone='Asia/Qyzylorda',browser=browser.version,dpr=1,zoom='100% CSS viewport',method='Actual Chrome media playback, coordinate clicks with minimal wheel exposure; scenario switches outside product; no full-page screenshots',checks=checks,pageErrors=errors,limits='Synthetic fixture input envelope/takes and simulated save/assembly, no microphone/backend/physical-device or actual render proof'),indent=2)+'\n',encoding='utf-8')
    browser.close()
print('PASS',len(checks),'scenario groups; no page errors; original owner-removal amendment checked separately')
