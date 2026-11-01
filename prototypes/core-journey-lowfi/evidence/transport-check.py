import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
checks=[]
def check_geometry(page,label):
    values=page.evaluate('''()=>{let s=document.querySelector('.scene').getBoundingClientRect(),w=document.querySelector('.wave').getBoundingClientRect(),v=document.querySelector('#scene');return {stage:{x:s.x,width:s.width,height:s.height},wave:{x:w.x,width:w.width},playheadTarget:document.querySelector('#scrub').getBoundingClientRect().height,objectFit:getComputedStyle(v).objectFit,overflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert abs(values['stage']['width']/values['stage']['height']-16/9)<.01,values
    assert abs(values['stage']['width']-values['wave']['width'])<1,values
    assert abs(values['stage']['x']-values['wave']['x'])<1,values
    assert values['objectFit']=='contain' and not values['overflow'],values
    if page.viewport_size['width']<768: assert values['playheadTarget']>=48,values
    checks.append({'scenario':label,'result':'PASS','geometry':values})

def drag_and_release(page,source):
    page.locator('#scrub').scroll_into_view_if_needed()
    r=page.locator('#scrub').bounding_box()
    page.mouse.move(r['x']+r['width']*.2,r['y']+r['height']/2)
    page.mouse.down()
    page.mouse.move(r['x']+r['width']*.35,r['y']+r['height']/2,steps=6)
    page.wait_for_timeout(200)
    assert page.locator('#scene').evaluate('(v)=>v.paused')
    assert page.locator('#take-audio').evaluate('(a)=>a.paused')
    at=page.locator('#scene').evaluate('(v)=>v.currentTime')
    page.wait_for_timeout(200)
    assert abs(page.locator('#scene').evaluate('(v)=>v.currentTime')-at)<.03
    page.mouse.up()
    page.wait_for_function('!document.querySelector("#scene").paused')
    assert page.locator('#scene').evaluate('(v)=>v.muted')==(source=='take')
    if source=='take':
        page.wait_for_function('!document.querySelector("#take-audio").paused')
        assert abs(page.locator('#take-audio').evaluate('(a)=>a.currentTime')-page.locator('#scene').evaluate('(v)=>v.currentTime'))<.25
    checks.append({'scenario':f'{source}: drag stays paused, LMB release starts selected synchronized source at sought position','result':'PASS','soughtTime':at})

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5178')
    page.wait_for_function('document.querySelector("#scene").readyState>=3')
    check_geometry(page,'Desktop 16:9 stage and exactly aligned full-width waveform')
    assert page.get_by_text('Recording ends automatically with this line.',exact=True).count()==0
    assert page.locator('#process-again').evaluate('(b)=>getComputedStyle(b).textDecorationLine')=='none'
    page.locator('#replay').click()
    page.wait_for_function('document.querySelector("#scene").currentTime>1')
    page.locator('#pause').click()
    expect(page.locator('#pause')).to_have_text('Resume')
    paused=page.locator('#scene').evaluate('(v)=>v.currentTime')
    page.wait_for_timeout(250)
    assert abs(page.locator('#scene').evaluate('(v)=>v.currentTime')-paused)<.03
    page.locator('#pause').click()
    page.wait_for_function('(at)=>document.querySelector("#scene").currentTime>at+.2',arg=paused)
    checks.append({'scenario':'Pause exposes Resume; Resume continues original from paused position','result':'PASS','pausedAt':paused})
    drag_and_release(page,'original')
    page.locator('#record').click()
    expect(page.locator('#scrub')).to_be_disabled()
    expect(page.locator('#pause')).to_be_hidden()
    before=page.locator('#scene').evaluate('(v)=>v.currentTime')
    r=page.locator('#scrub').bounding_box()
    page.mouse.click(r['x']+r['width']*.9,r['y']+r['height']/2)
    page.keyboard.press('End')
    after=page.locator('#scene').evaluate('(v)=>v.currentTime')
    assert 0<=after-before<1,(before,after)
    assert page.locator('#scene').evaluate('(v)=>!v.paused')
    expect(page.locator('#next-help')).to_be_hidden()
    expect(page.locator('#take-help')).to_have_text('Perform the line while the scene plays.')
    checks.append({'scenario':'Capture: seek disabled for pointer and keyboard; no Pause/Resume; current-time only advances naturally; consistent capture hints','result':'PASS'})
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
    page.locator('#take').click()
    page.wait_for_function('document.querySelector("#take-audio").currentTime>.5')
    page.locator('#pause').click()
    take_at=page.locator('#take-audio').evaluate('(a)=>a.currentTime')
    page.locator('#pause').click()
    page.wait_for_function('(at)=>document.querySelector("#take-audio").currentTime>at+.15',arg=take_at)
    drag_and_release(page,'take')
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
    checks.append({'scenario':'Candidate Pause/Resume and seeking retain candidate identity','result':'PASS'})
    page.locator('#replay').click()
    assert page.locator('#scene').evaluate('(v)=>v.currentTime')<.5
    page.wait_for_function('document.querySelector("#scene").currentTime>.7')
    page.locator('#replay').click()
    page.wait_for_function('!document.querySelector("#scene").paused && document.querySelector("#scene").currentTime<.5')
    checks.append({'scenario':'Replay explicitly restarts even while original is already playing; Pause remains a separate action','result':'PASS'})
    page.wait_for_function('document.querySelector("#scene").paused && document.querySelector("#scene").currentTime>=5',timeout=10000)
    page.locator('#replay').click()
    page.wait_for_function('!document.querySelector("#scene").paused && document.querySelector("#scene").currentTime<1')
    checks.append({'scenario':'Replay explicitly restarts; ended-window replay remains usable','result':'PASS'})
    page.locator('#pause').click()
    for width,height,name in [(1440,900,'desktop'),(1280,600,'short-desktop'),(390,844,'phone'),(390,667,'short-phone')]:
        page.set_viewport_size({'width':width,'height':height})
        check_geometry(page,f'{name}: exact 16:9 stage/wave alignment')
        page.screenshot(path=str(root/f'v5-{name}.png'),full_page=True)
        if width<768:
            for source,selector in [('original','#replay'),('take','#take')]:
                page.locator(selector).click()
                page.wait_for_function('document.querySelector("#scene").currentTime>.4')
                page.locator('#pause').click()
                paused=page.locator('#scene').evaluate('(v)=>v.currentTime')
                expect(page.locator('#pause')).to_have_text('Resume')
                page.locator('#pause').click()
                page.wait_for_function('(at)=>document.querySelector("#scene").currentTime>at+.15',arg=paused)
                drag_and_release(page,source)
            checks.append({'scenario':f'{name}: original/candidate listening Resume and actual held-drag release-to-play operated','result':'PASS'})
    assert not errors,errors
    (root/'transport-check-results.json').write_text(json.dumps({'version':'core-journey-lowfi-v5','browser':browser.version,'date':'2026-10-27','checks':checks,'pageErrors':errors},indent=2),encoding='utf8')
    browser.close()
print('PASS: listening Resume, release-to-play seeking, capture seek lock, exact stage/wave geometry')
