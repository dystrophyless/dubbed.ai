import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
checks=[]
def workspace(page,name,full=True):
    g=page.evaluate('''()=>({viewport:[innerWidth,innerHeight],scroll:scrollY,compact:document.querySelector('#main').classList.contains('compact-desktop'),items:Object.fromEntries(['.project-header','#heading','#header-actions','.scene','.script','.wave','.timeline','#time','#volume','.performance','#to-result'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}]}))})''')
    a=g['items'];stage=a['.scene'];panel=a['.performance'];header=a['.project-header']
    assert abs(header['x']-stage['x'])<1 and abs(header['right']-panel['right'])<1,g
    assert abs(a['#heading']['x']-stage['x'])<1,g
    assert abs(panel['x']-stage['right']-24)<1,g
    assert abs(stage['y']-panel['y'])<1,g
    assert abs(a['.wave']['x']-stage['x'])<1 and abs(a['.wave']['width']-stage['width'])<1,g
    assert abs(stage['width']/stage['height']-16/9)<.01,g
    if full:
        for s in ['.scene','.script','.timeline','#time','#volume','.performance']:
            assert a[s]['y']>=0 and a[s]['bottom']<=g['viewport'][1],(s,g)
    if a['#to-result']['width']:
        assert abs(a['#to-result']['right']-panel['right'])<1,g
    page.screenshot(path=str(root/f'{name}.png'))
    checks.append({'scenario':name,'result':'PASS','geometry':g})

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1882,'height':902},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
    for w,h in [(1882,902),(1920,910),(1440,900),(1366,650),(1280,600)]:
        for long in [False,True]:
            page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)')
            page.locator('.lab summary').click();page.locator('#long-line').set_checked(long);page.locator('.lab summary').click()
            workspace(page,f'v5-workspace-{w}x{h}-'+('long' if long else 'normal'))
    page.set_viewport_size({'width':1440,'height':900});page.evaluate('scrollTo(0,0)')
    page.locator('.lab summary').click();page.locator('#long-line').uncheck();page.locator('.lab summary').click()
    page.locator('#record').click();page.wait_for_function('document.querySelector("#scene").currentTime>.6')
    workspace(page,'v5-desktop-recording')
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    workspace(page,'v5-desktop-candidate')
    page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click()
    candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
    page.locator('#next').click();expect(page.locator('#feedback')).to_contain_text('Couldn’t save')
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
    page.get_by_role('button',name='Retry save',exact=True).click();expect(page.locator('#position')).to_have_text('Line 2 of 3')
    expect(page.locator('.utility')).to_be_hidden()
    page.locator('#previous').click();expect(page.locator('#saved')).to_have_text('Saved');page.evaluate('scrollTo(0,0)')
    workspace(page,'v5-desktop-saved')
    page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3')
    for n in [2,3]:
        page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.locator('#next').click()
        if n==2:expect(page.locator('#position')).to_have_text('Line 3 of 3')
    expect(page.locator('#result')).to_be_visible(timeout=5000)
    page.locator('#result').evaluate('(v)=>v.play()');page.wait_for_function('document.querySelector("#result").currentTime>.4');page.locator('#result').evaluate('(v)=>v.pause()')
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/'v5-result-desktop.png'))
    page.locator('#return').click();page.set_viewport_size({'width':1882,'height':902});page.evaluate('scrollTo(0,0)')
    workspace(page,'v5-desktop-completed')
    page.set_viewport_size({'width':1280,'height':600});page.evaluate('scrollTo(0,0)')
    page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click()
    workspace(page,'v5-short-completed-long')
    page.locator('#record').click();page.wait_for_function('document.querySelector("#scene").currentTime>.6')
    workspace(page,'v5-short-recording-long')
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    workspace(page,'v5-short-candidate-long')
    page.locator('#to-result').click();page.get_by_role('button',name='Leave without saving',exact=True).click();expect(page.locator('#result')).to_be_visible(timeout=5000)
    page.set_viewport_size({'width':390,'height':844});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/'v5-result-phone.png'))
    page.locator('#return').click();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/'v5-workspace-phone.png'),full_page=True)
    assert not errors,errors
    (root/'workspace-v5-check-results.json').write_text(json.dumps({'version':'core-journey-lowfi-v5','browser':browser.version,'date':'2026-10-27','environment':'Windows, actual 100% browser viewport, DPR1, coordinate/DOM operation; PNGs are viewport captures except named phone workspace full-page','checks':checks,'pageErrors':errors},indent=2),encoding='utf8')
    browser.close()
print('PASS: coherent shared axes, normal/short desktop normal-saved-recording-completed, full performance visibility and operated save/result path')
