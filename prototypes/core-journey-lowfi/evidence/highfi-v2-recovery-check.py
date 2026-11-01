import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).parent
checks=[]
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def lab(page,lang=None,long=None,fail=None):
    page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click()
    if lang:page.locator('#locale').select_option(lang)
    if long is not None:page.locator('#long-line').set_checked(long)
    if fail:page.locator('#'+fail).check()
    page.locator('.lab summary').click()
def record(page):
    page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();expect(page.locator('#feedback')).to_be_hidden();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
def notice_geometry(page,desktop=False,action='#next'):
    page.wait_for_timeout(120)
    g=page.evaluate('''()=>({scroll:scrollY,viewport:[innerWidth,innerHeight],items:Object.fromEntries(['#feedback','.project-header','.scene','#dialogue','.timeline','.performance','#next','#open-settings'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height}]}))})''')
    n=g['items']['#feedback'];assert abs((n['left']+n['right'])/2-g['viewport'][0]/2)<1
    assert n['top']>=0 and n['bottom']<=g['viewport'][1]-15
    assert page.locator('#feedback button,#feedback a,#feedback input').count()==0
    assert page.locator('#feedback').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)'
    if desktop:
        assert g['items']['.project-header']['top']>=0,g
        for s in ['.scene','#dialogue','.timeline','.performance']:
            r=g['items'][s];assert r['top']>=0 and r['bottom']<=n['top']-12,(s,g)
    else:
        r=g['items'][action];assert r['top']>=0 and r['bottom']<=n['top']-12,(action,g)
        panel=g['items']['.performance']
        if panel['h']<=n['top']-32:assert panel['top']>=0 and panel['bottom']<=n['top']-12,g
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    return g
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for w,h,lang,long,motion in [(1882,902,'en',False,'no-preference'),(1280,600,'ru',True,'no-preference'),(390,844,'en',False,'no-preference'),(390,667,'ru',True,'reduce')]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion=motion)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');lab(page,lang,long)
        # Accepted lines and a replacement are produced through the actual connected journey.
        for index in [0,1]:
            record(page);page.locator('#next').click();page.wait_for_function('(i)=>JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===i',arg=index+1)
        page.locator('#previous').click();record(page);saved=state(page)['accepted'][1]['id'];candidate=state(page)['candidates'][1]['id']
        lab(page,fail='fail-mic');page.locator('#record').click();expect(page.locator('#feedback')).to_be_visible();expect(page.locator('#open-settings')).to_be_visible()
        assert state(page)['accepted'][1]['id']==saved and state(page)['candidates'][1]['id']==candidate
        mic=notice_geometry(page,w>=768,'#open-settings')
        assert not page.locator('#feedback').evaluate('(e)=>e.contains(document.activeElement)')
        name=f'hf2-recovery-{w}x{h}-{lang}'
        page.screenshot(path=str(root/f'{name}-microphone.png'))
        # Same notice DOM survives listening renders. A new failed attempt announces afresh.
        page.evaluate('window.noticeMutations=0;window.noticeObserver=new MutationObserver(m=>window.noticeMutations+=m.length);noticeObserver.observe(document.querySelector("#feedback"),{subtree:true,childList:true,characterData:true})')
        page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();page.locator('#pause').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();assert page.evaluate('noticeMutations')==0
        expect(page.locator('#feedback')).to_be_visible();assert state(page)['candidates'][1]['id']==candidate
        context=page.evaluate('''()=>{let n=document.querySelector('#feedback').getBoundingClientRect();return Object.fromEntries(['.scene','#dialogue'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,[r.top,r.bottom,n.top]]}))}''')
        for r in context.values():assert r[0]>=0 and r[1]<=r[2]-12,context
        lab(page,fail='fail-mic');page.locator('#record').click();expect(page.locator('#feedback')).to_be_visible();page.wait_for_timeout(120);assert page.evaluate('noticeMutations')>0;page.evaluate('noticeObserver.disconnect()')
        # Settings remains guarded when the blocked attempt left a candidate.
        page.locator('#previous').click();page.locator('#guard [value=stay]').click();expect(page.locator('#guard')).to_be_hidden();assert state(page)['candidates'][1]['id']==candidate;expect(page.locator('#feedback')).to_be_visible()
        page.locator('#open-settings').click();expect(page.locator('#guard')).to_be_visible();page.locator('#guard [value=stay]').click();expect(page.locator('#guard')).to_be_hidden();assert state(page)['candidates'][1]['id']==candidate
        page.locator('#open-settings').click();page.locator('#guard [value=save]').click();expect(page.locator('#settings-note')).to_be_visible();assert state(page)['accepted'][1]['id']==candidate and state(page)['candidates'][1] is None
        page.locator('#destination-close').click();page.wait_for_function('document.activeElement.id==="open-settings"');notice_geometry(page,False,'#open-settings')
        # Accepting a retained candidate does not claim to fix microphone access.
        expect(page.locator('#feedback')).to_be_visible();page.locator('#previous').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===0');expect(page.locator('#feedback')).to_be_visible()
        page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');expect(page.locator('#feedback')).to_be_visible();expect(page.locator('#open-settings')).to_be_visible();lab(page,long=long)
        # A successful new simulated capture resolves the microphone notice.
        record(page);old=state(page)['accepted'][0]['id'];new=state(page)['candidates'][0]['id'];lab(page,fail='fail-save');page.locator('#next').click();expect(page.locator('#feedback')).to_be_visible()
        expect(page.locator('#next')).to_have_text('Retry save' if lang=='en' else '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435')
        assert state(page)['accepted'][0]['id']==old and state(page)['candidates'][0]['id']==new
        save=notice_geometry(page,w>=768);page.screenshot(path=str(root/f'{name}-save.png'))
        page.locator('#next').focus();notice_geometry(page,False)
        page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();expect(page.locator('#feedback')).to_be_visible()
        page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');expect(page.locator('#feedback')).to_be_visible();assert state(page)['accepted'][0]['id']==old and state(page)['candidates'][0]['id']==new
        page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===1');expect(page.locator('#feedback')).to_be_hidden();assert state(page)['accepted'][0]['id']==new
        if w==1882:
            # Retry after failed Save and go must retain its Previous destination across reload.
            record(page);prev=state(page)['candidates'][1]['id'];lab(page,fail='fail-save');page.locator('#previous').click();page.locator('#guard [value=save]').click();expect(page.locator('#feedback')).to_be_visible();assert state(page)['failureDestination']=='previous';page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('#next').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===0');assert state(page)['accepted'][1]['id']==prev
        assert not errors,errors
        checks.append({'viewport':[w,h],'locale':lang,'longDialogue':long,'motion':motion,'result':'PASS','microphone':mic,'save':save,'pageErrors':errors,'scenarios':['no embedded actions/white centered persistent notice','exact candidate+accepted protection','audition/Resume keeps notice without duplicate DOM announcements','repeated failure emits new live update','Settings-only recovery/close focus','guard Stay/Save and leave and turn navigation preserve microphone issue','reload restores unresolved issue and take IDs','successful capture clears microphone issue','ordinary Next becomes exact-candidate Retry save','retry resolves notice and advances only after acceptance']})
        ctx.close()
    browser.close()
(root/'highfi-v2-recovery-results.json').write_text(json.dumps({'version':'core-journey-highfi-v2','date':'2026-10-27','environment':'Windows installed Chrome156, real viewports zoom100% DPR1, mouse+keyboard; reduced motion in short-phone RU; no real SR/device/backend','checks':checks},indent=2),encoding='utf8')
print('PASS: v2 recovery desktop/phone/short, separated actions, persistence, focus, repeated audition/navigation and exact-candidate Retry')
