import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
checks=[]
def locale(page,lang,long=False):
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#locale').select_option(lang);page.locator('#long-line').set_checked(long);page.locator('.lab summary').click()

def frame(page,name):
    g=page.evaluate('''()=>({viewport:[innerWidth,innerHeight],scroll:scrollY,items:Object.fromEntries(['.project-header','.scene','.script','.wave','.timeline','.performance','#to-result'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}]}))})''')
    a=g['items'];s=a['.scene'];p=a['.performance'];h=a['.project-header'];w=a['.wave']
    assert abs(h['x']-s['x'])<1 and abs(h['right']-p['right'])<1,g
    assert abs(p['x']-s['right']-24)<1 and abs(p['y']-s['y'])<1,g
    assert abs(s['w']/s['h']-16/9)<.01 and abs(w['w']-s['w'])<1 and abs(w['x']-s['x'])<1,g
    for k in ['.scene','.script','.timeline','.performance']:assert a[k]['y']>=0 and a[k]['bottom']<=g['viewport'][1],(k,g)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/f'{name}.png'))
    checks.append({'scenario':name,'result':'PASS','geometry':g})

def finish_record(page):
    page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)

def held_seek(page,source):
    page.locator('#scrub').scroll_into_view_if_needed();r=page.locator('#scrub').bounding_box();y=r['y']+r['height']/2
    page.mouse.move(r['x']+r['width']*.2,y);page.mouse.down();page.mouse.move(r['x']+r['width']*.35,y,steps=5);page.wait_for_timeout(150)
    assert page.locator('#scene').evaluate('(v)=>v.paused') and page.locator('#take-audio').evaluate('(v)=>v.paused')
    at=page.locator('#scene').evaluate('(v)=>v.currentTime');page.wait_for_timeout(150);assert abs(page.locator('#scene').evaluate('(v)=>v.currentTime')-at)<.03
    page.mouse.up();page.wait_for_function('!document.querySelector("#scene").paused')
    assert page.locator('#scene').evaluate('(v)=>v.muted')==(source=='take')
    if source=='take':page.wait_for_function('!document.querySelector("#take-audio").paused')
    checks.append({'scenario':f'{source}: held seek paused, release plays correct synchronized source','result':'PASS'})

def result_edges(page):
    g=page.evaluate('''()=>Object.fromEntries(['.project-header','.result-stage','.result-bottom'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,[r.left,r.right]]}))''')
    for edges in g.values():assert all(abs(x-y)<1 for x,y in zip(edges,g['.result-stage'])),g

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1882,'height':902},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
    recipe=page.locator('#replay').evaluate('(e)=>{let r=e.getBoundingClientRect(),c=getComputedStyle(e);return{height:r.height,fontSize:c.fontSize,weight:c.fontWeight,radius:c.borderRadius}}')
    assert recipe=={'height':40,'fontSize':'14px','weight':'500','radius':'6px'},recipe
    cdp=page.context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable');doc=cdp.send('DOM.getDocument')['root']['nodeId'];fonts={}
    for selector in ['#replay .hf-label','#dialogue','#heading']:
        node=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':selector})['nodeId'];fonts[selector]=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})
    assert fonts['#replay .hf-label']['fonts'][0]['postScriptName']=='MabryPro-Medium'
    assert fonts['#dialogue']['fonts'][0]['postScriptName']=='MabryPro-Regular'
    checks.append({'scenario':'Actual app uses calibrated task40/14/20/500/radius6 and real Mabry Regular/Medium faces','result':'PASS','recipe':recipe,'platformFonts':fonts})
    for width,height,lang,long in [(1882,902,'en',False),(1882,902,'ru',True),(1920,910,'en',False),(1440,900,'en',False),(1440,900,'ru',True),(1366,650,'en',False),(1366,650,'ru',True),(1280,600,'en',False),(1280,600,'ru',True)]:
        page.set_viewport_size({'width':width,'height':height});locale(page,lang,long);frame(page,f'hf2-record-{width}x{height}-{lang}')
    page.set_viewport_size({'width':1440,'height':900});locale(page,'en')
    page.locator('#replay').click();page.wait_for_function('document.querySelector("#scene").paused && document.querySelector("#scene").currentTime>=5',timeout=10000)
    page.locator('#replay').click();page.wait_for_function('!document.querySelector("#scene").paused && document.querySelector("#scene").currentTime<1')
    page.wait_for_function('document.querySelector("#scene").currentTime>.7');page.locator('#pause').click();at=page.locator('#scene').evaluate('(v)=>v.currentTime');expect(page.locator('#pause')).to_have_text('Resume');page.locator('#pause').click();page.wait_for_function('(at)=>document.querySelector("#scene").currentTime>at+.15',arg=at)
    held_seek(page,'original')
    original_wave=page.locator('.wave').evaluate('(e)=>Array.from(e.querySelectorAll("line"),n=>n.getAttribute("y1")).join()')
    page.locator('#record').click();page.wait_for_function('document.querySelector("#scene").currentTime>.5');expect(page.locator('#scrub')).to_be_disabled();expect(page.locator('#pause')).to_be_hidden();frame(page,'hf2-desktop-recording')
    before=page.locator('#scene').evaluate('(v)=>v.currentTime');page.keyboard.press('End');assert 0<=page.locator('#scene').evaluate('(v)=>v.currentTime')-before<1
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
    page.locator('#take').click();page.wait_for_function('document.querySelector("#take-audio").currentTime>.4')
    assert page.locator('.wave').evaluate('(e)=>Array.from(e.querySelectorAll("line"),n=>n.getAttribute("y1")).join()')!=original_wave
    page.locator('#pause').click();at=page.locator('#take-audio').evaluate('(v)=>v.currentTime');page.locator('#pause').click();page.wait_for_function('(at)=>document.querySelector("#take-audio").currentTime>at+.15',arg=at)
    held_seek(page,'take');page.locator('#pause').click()
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click()
    expect(page.locator('#next')).to_have_attribute('aria-busy','true');expect(page.locator('#next')).to_be_enabled()
    expect(page.locator('#feedback')).to_contain_text('Couldn’t save');page.screenshot(path=str(root/'hf2-save-error-desktop-en.png'))
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
    page.get_by_role('button',name='Retry save',exact=True).click();expect(page.locator('#position')).to_have_text('Line 2 of 3');expect(page.locator('.utility')).to_be_hidden();assert page.evaluate('document.activeElement.id')=='replay'
    page.locator('#previous').click();expect(page.locator('#saved')).to_have_text('Saved');page.evaluate('scrollTo(0,0)');frame(page,'hf2-desktop-saved')
    page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3')
    for n in [2,3]:
        finish_record(page);page.locator('#next').click()
        if n==2:expect(page.locator('#position')).to_have_text('Line 3 of 3')
    expect(page.locator('#assembly')).to_be_visible();result_edges(page);assert page.locator('#assembly-icon').evaluate('(e)=>getComputedStyle(e).animationName')=='hf-spin';page.screenshot(path=str(root/'hf2-result-assembly-en.png'))
    expect(page.locator('#result')).to_be_visible(timeout=5000);assert page.locator('#assembly-icon').evaluate('(e)=>getComputedStyle(e).animationName')=='none';assert page.locator('#result').evaluate('(v)=>v.paused')
    page.locator('#result').evaluate('(v)=>v.play()');page.wait_for_function('document.querySelector("#result").currentTime>.4');page.locator('#result').evaluate('(v)=>v.pause()');result_edges(page);page.screenshot(path=str(root/'hf2-result-desktop-en.png'))
    with page.expect_download() as download:page.locator('#download').click()
    assert download.value.suggested_filename.endswith('.mp4')
    page.locator('#return').click();expect(page.locator('#position')).to_have_text('Line 1 of 3');assert page.locator('#result').evaluate('(v)=>v.paused')
    page.set_viewport_size({'width':1882,'height':902});page.evaluate('scrollTo(0,0)');frame(page,'hf2-desktop-completed-en')
    checks.append({'scenario':'EN full loop: replay/end/replay, listening Resume, candidate audition/rerecord safety, failed save/Retry, busy semantics, accepted revisit, assembly/play/download/return','result':'PASS'})
    locale(page,'ru',True);assert page.locator('html').get_attribute('lang')=='ru' and page.locator('#dialogue').get_attribute('lang')=='ru';page.set_viewport_size({'width':390,'height':844});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/'hf2-phone-saved-ru.png'),full_page=True)
    old=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0].id')
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();expect(page.locator('#feedback')).to_contain_text('Микрофон недоступен');assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0].id')==old
    page.get_by_role('button',name='Открыть настройки',exact=True).click();expect(page.locator('#settings-note')).to_be_visible();page.get_by_role('button',name='Вернуться к сцене',exact=True).click();page.wait_for_function('document.activeElement.id==="open-settings"')
    checks.append({'scenario':'Blocked capture preserves accepted take; only Settings boundary recovery; closing boundary restores the logical recovery trigger','result':'PASS'})
    finish_record(page);new=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click();expect(page.locator('#feedback')).to_contain_text('Не удалось сохранить')
    page.screenshot(path=str(root/'hf2-save-error-phone-ru.png'),full_page=True)
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0].id')==old and page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==new
    page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');expect(page.locator('#feedback')).to_contain_text('Не удалось сохранить');page.locator('#pause').click()
    page.get_by_role('button',name='Повторить сохранение',exact=True).click();expect(page.locator('#position')).to_have_text('Реплика 2 из 3');finish_record(page)
    guarded=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[1].id');page.locator('#previous').click();expect(page.get_by_role('dialog',name='Сохранить этот дубль?',exact=True)).to_be_visible();page.screenshot(path=str(root/'hf2-guard-phone-ru.png'))
    assert page.locator('#guard').bounding_box()['width']<=358
    for _ in range(5):page.keyboard.press('Tab');assert page.locator('#guard').evaluate('(d)=>d.contains(document.activeElement)')
    page.keyboard.press('Escape');assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[1].id')==guarded
    page.locator('#previous').click();page.get_by_role('button',name='Сохранить и перейти',exact=True).click();expect(page.locator('#position')).to_have_text('Реплика 1 из 3')
    page.emulate_media(reduced_motion='reduce',color_scheme='dark');page.locator('#to-result').click();expect(page.locator('#assembly')).to_be_visible();assert page.locator('#assembly-icon').evaluate('(e)=>getComputedStyle(e).animationName')=='none';page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/'hf2-result-assembly-phone-ru-reduced.png'))
    expect(page.locator('#result')).to_be_visible(timeout=5000);result_edges(page);page.screenshot(path=str(root/'hf2-result-phone-ru.png'));assert page.evaluate('getComputedStyle(document.documentElement).backgroundColor')=='rgb(255, 255, 255)'
    checks.append({'scenario':'RU phone long dialogue: replacement failure protects candidate/accepted, persistent audition feedback, Retry, native guard focus/Escape/Save and go, reduced pending motion and Light under dark preference','result':'PASS'})
    page.locator('#return').click()
    page.set_viewport_size({'width':720,'height':450});page.evaluate('scrollTo(0,0)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(root/'hf2-200percent-reflow-equivalent.png'),full_page=True)
    checks.append({'scenario':'720x450 CSS reflow equivalent for a 1440x900 surface at 200%; actual browser-UI zoom not asserted','result':'PASS'})
    assert page.locator('.hf-icon svg').evaluate_all('(els)=>els.every(e=>e.getAttribute("stroke-width")==="1.1"&&e.getAttribute("fill")==="none")')
    touch=browser.new_context(viewport={'width':390,'height':667},has_touch=True,device_scale_factor=1);tp=touch.new_page();tp.goto('http://127.0.0.1:5178');tp.wait_for_function('document.querySelector("#scene").readyState>=3');tp.locator('#replay').click();tp.locator('#scrub').scroll_into_view_if_needed();r=tp.locator('#scrub').bounding_box();assert r['height']>=48
    cdp=touch.new_cdp_session(tp);y=r['y']+r['height']/2
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']*.2,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':r['x']+r['width']*.4,'y':y}]});tp.wait_for_timeout(150);assert tp.locator('#scene').evaluate('(v)=>v.paused');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.wait_for_function('!document.querySelector("#scene").paused');checks.append({'scenario':'Emulated phone touch drag: full 48px playhead, paused while held, selected source plays on release','result':'PASS'});touch.close()
    assert not errors,errors
    (root/'highfi-v2-journey-results.json').write_text(json.dumps({'version':'core-journey-highfi-v2','browser':browser.version,'date':'2026-10-27','environment':'Windows, actual Chrome viewports, zoom100%, DPR1; mouse/keyboard + emulated touch, no real microphone/mobile hardware','checks':checks,'pageErrors':errors},indent=2),encoding='utf8');browser.close()
print('PASS: high-fi calibrated journey, preserved axes/fit, EN/RU safety and guards, transport/touch, pending/reduced motion, Result and reflow')
