import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).parent
checks=[]
def data(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def lab(page,lang=None,long=None,fail=None):
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click()
    if lang:page.locator('#locale').select_option(lang)
    if long is not None:page.locator('#long-line').set_checked(long)
    if fail:page.locator('#'+fail).check()
    page.locator('.lab summary').click()
def record(page):
    page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
def watch(page):
    page.evaluate('''()=>{window.toastFrames=[];window.liveChanges=0;window.stopWatch=false;window.liveObserver?.disconnect();window.liveObserver=new MutationObserver(m=>window.liveChanges+=m.length);liveObserver.observe(document.querySelector('#notification-announcement'),{subtree:true,childList:true,characterData:true});let start=performance.now(),shown=false;function frame(){let e=document.querySelector('#feedback'),c=getComputedStyle(e);shown ||= !e.hidden;toastFrames.push({ms:performance.now()-start,phase:e.dataset.phase,hidden:e.hidden,opacity:Number(c.opacity),transform:c.transform});if(!stopWatch&&!(shown&&e.hidden)&&performance.now()-start<23000)requestAnimationFrame(frame)}requestAnimationFrame(frame)}''')
def bounds(page,desktop,action):
    g=page.evaluate('''()=>({viewport:[innerWidth,innerHeight],scroll:scrollY,items:Object.fromEntries(['.project-header','.scene','#dialogue','.timeline','.performance','#feedback','#next','#open-settings','#take-help'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{top:r.top,bottom:r.bottom,left:r.left,right:r.right,w:r.width,h:r.height}]}))})''')
    n=g['items']['#feedback'];assert abs((n['left']+n['right'])/2-g['viewport'][0]/2)<1
    assert page.locator('#feedback button,#feedback a,#feedback input').count()==0
    assert page.locator('#feedback').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(32, 32, 32)'
    assert page.locator('#feedback').get_attribute('aria-hidden')=='true'
    assert n['bottom']<=g['viewport'][1]-15 and n['top']>=0
    for s in (['.project-header','.scene','#dialogue','.timeline','.performance'] if desktop else [action,'#take-help']):
        r=g['items'][s];assert r['top']>=0 and r['bottom']<=n['top']-12,(s,g)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    return g
def lifetime(page,name,trigger,desktop,action,reduced=False,hover=False):
    watch(page);trigger();page.mouse.move(0,0);page.wait_for_function('!document.querySelector("#feedback").hidden');page.wait_for_timeout(65)
    entry=page.locator('#feedback').evaluate('(e)=>({phase:e.dataset.phase,opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,transition:getComputedStyle(e).transitionDuration})')
    page.screenshot(path=str(root/f'{name}-enter.png'))
    page.wait_for_timeout(220);expect(page.locator('#feedback')).to_be_visible();g=bounds(page,desktop,action);page.screenshot(path=str(root/f'{name}-during.png'))
    if reduced:assert entry['transition']=='0s' and float(entry['opacity'])==1,entry
    # An ordinary guard/Stay render does not announce or restart the popup.
    live=page.evaluate('liveChanges');page.locator('#previous').click();expect(page.locator('#guard')).to_be_visible();page.locator('#guard [value=stay]').click();expect(page.locator('#guard')).to_be_hidden();assert page.evaluate('liveChanges')==live
    focus=page.evaluate('document.activeElement.id');scroll_before=page.evaluate('scrollY')
    if hover:
        r=page.locator('#feedback').bounding_box();page.mouse.move(r['x']+30,r['y']+30);page.mouse.move(r['x']+40,r['y']+30);page.wait_for_timeout(8500);expect(page.locator('#feedback')).to_be_visible();assert page.locator('#feedback').get_attribute('data-phase')=='open';page.screenshot(path=str(root/f'{name}-hover-paused.png'));page.mouse.move(0,0)
    if not reduced:
        page.wait_for_function('document.querySelector("#feedback").dataset.phase==="exit"',timeout=12000);page.wait_for_timeout(45)
        exit_state=page.locator('#feedback').evaluate('(e)=>({opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,phase:e.dataset.phase})')
        page.screenshot(path=str(root/f'{name}-exit.png'))
    else:exit_state={'motion':'immediate'}
    expect(page.locator('#feedback')).to_be_hidden(timeout=12000);page.wait_for_timeout(35)
    assert page.evaluate('document.activeElement.id')==focus
    assert abs(page.evaluate('scrollY')-scroll_before)<1,('timeout moved page',scroll_before,page.evaluate('scrollY'))
    page.screenshot(path=str(root/f'{name}-after.png'));frames=page.evaluate('toastFrames');shown=[f for f in frames if not f['hidden']];hidden=[f for f in frames if f['hidden'] and f['ms']>shown[-1]['ms']];assert shown and hidden,frames[-5:]
    elapsed=hidden[0]['ms']-shown[0]['ms']
    assert (15900<=elapsed<=19000) if hover else (7800<=elapsed<=8800),(elapsed,hover)
    if not reduced:
        assert any(0<f['opacity']<.98 and f['ms']<shown[0]['ms']+230 for f in shown),shown[:15]
        assert any(f['phase']=='exit' and 0<f['opacity']<.98 for f in shown),shown[-15:]
    assert page.evaluate('liveChanges')==live
    page.evaluate('stopWatch=true;liveObserver.disconnect()')
    return {'result':'PASS','boundsDuring':g,'entry':entry,'exit':exit_state,'elapsedToHiddenMs':elapsed,'intentionalHoverPaused':hover,'frames':frames,'focusAfterTimeout':focus,'scrollBeforeAfterTimeout':[scroll_before,page.evaluate('scrollY')]}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for w,h,lang,long,motion in [(1882,902,'en',False,'no-preference'),(1280,600,'ru',True,'no-preference'),(390,844,'en',False,'no-preference'),(390,667,'ru',True,'reduce')]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion=motion);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');lab(page,lang,long)
        # Prepare accepted lines0/1 and a real replacement through the actual journey.
        for index in [0,1]:
            record(page);page.locator('#next').click();page.wait_for_function('(i)=>JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===i',arg=index+1)
        page.locator('#previous').click();record(page);saved=data(page)['accepted'][1]['id'];candidate=data(page)['candidates'][1]['id'];name=f'hf3-{w}x{h}-{lang}';before_width=page.locator('.scene').bounding_box()['width'];page.screenshot(path=str(root/f'{name}-before.png'))
        def microphone():
            lab(page,fail='fail-mic');page.locator('#record').click()
        mic=lifetime(page,name+'-microphone',microphone,w>=768,'#open-settings',motion=='reduce')
        assert data(page)['accepted'][1]['id']==saved and data(page)['candidates'][1]['id']==candidate
        assert abs(mic['boundsDuring']['items']['.scene']['w']-before_width)<1
        expect(page.locator('#open-settings')).to_be_visible();assert ('Microphone' if lang=='en' else '\u041c\u0438\u043a\u0440\u043e\u0444\u043e\u043d') in page.locator('#take-help').inner_text()
        # Hidden stays hidden through listening/Resume and its ordinary renders.
        text=page.locator('#take-help').inner_text();page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();page.locator('#pause').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#take-help').inner_text()==text
        # A new identical failure can appear again, then explicit listening yields immediately.
        microphone();page.mouse.move(0,0);expect(page.locator('#feedback')).to_be_visible();page.wait_for_timeout(240);page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');expect(page.locator('#feedback')).to_be_hidden(timeout=500);page.locator('#pause').click();assert data(page)['candidates'][1]['id']==candidate
        # Timeout preserves failed Previous intent and both exact take IDs.
        def fail_previous():
            lab(page,fail='fail-save');page.locator('#previous').click();page.locator('#guard [value=save]').click()
        save=lifetime(page,name+'-save',fail_previous,w>=768,'#next',motion=='reduce',hover=w==1882)
        assert data(page)['accepted'][1]['id']==saved and data(page)['candidates'][1]['id']==candidate and data(page)['failureDestination']=='previous'
        assert abs(save['boundsDuring']['items']['.scene']['w']-before_width)<1
        assert ('previous line' if lang=='en' else '\u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u0439 \u0440\u0435\u043f\u043b\u0438\u043a\u0435') in page.locator('#take-help').inner_text();expect(page.locator('#next')).to_be_enabled()
        # Reload restores the durable issue, not a new transient popup or announcement.
        page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#notification-announcement').inner_text()=='';assert data(page)['candidates'][1]['id']==candidate
        page.locator('#next').click();expect(page.locator('#next')).to_have_attribute('aria-busy','true');assert data(page)['candidates'][1]['id']==candidate and data(page)['accepted'][1]['id']==saved
        page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===0');assert data(page)['accepted'][1]['id']==candidate;expect(page.locator('#feedback')).to_be_hidden();assert not data(page).get('failure')
        assert not errors,errors;checks.append({'viewport':[w,h],'locale':lang,'longDialogue':long,'motion':motion,'result':'PASS','approvedSceneWidthUnchanged':before_width,'microphone':mic,'save':save,'pageErrors':errors,'retention':'exact candidate/accepted and Previous intent preserved through timeout/reload; successful retry resolves only afterward','retrigger':'new identical failure reappears; explicit audition exits without clearing guidance; ordinary renders/reload do not reopen'})
        ctx.close()
    browser.close()
(root/'highfi-v3-toast-results.json').write_text(json.dumps({'version':'core-journey-highfi-v3','date':'2026-10-27','environment':'Windows installed Chrome156; actual inner viewports zoom100% DPR1; real elapsed timers, no fake clock; no real microphone/backend/SR speech','checks':checks},indent=2),encoding='utf8')
print('PASS: actual v3 entry/hold/exit/timeout, durable recovery, deliberate hover pause, retrigger/render distinction, no overlap and exact-candidate Previous retry')
