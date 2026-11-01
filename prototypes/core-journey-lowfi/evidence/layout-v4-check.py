import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1920,'height':910},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5178')
    page.wait_for_function('document.querySelector("#scene").readyState>=3')
    page.evaluate('document.fonts.ready')
    expect(page.locator('.utility')).to_be_visible()
    for width,height in [(1920,910),(1440,900),(1366,650),(1280,600)]:
        for long in [False,True]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('scrollTo(0,0)')
            page.locator('.lab summary').click();page.locator('#long-line').set_checked(long);page.locator('.lab summary').click()
            page.wait_for_timeout(100)
            geometry=page.evaluate('''()=>({scroll:scrollY,viewport:[innerWidth,innerHeight],items:Object.fromEntries(['.scene','#dialogue','.wave','#time','#volume','.timeline'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}]}))})''')
            assert geometry['scroll']==0,geometry
            for item in geometry['items'].values():assert item['top']>=0 and item['bottom']<=height,geometry
            stage=geometry['items']['.scene'];wave=geometry['items']['.wave']
            assert abs(stage['width']/stage['height']-16/9)<.01
            assert abs(stage['left']-wave['left'])<1 and abs(stage['width']-wave['width'])<1
            name=f'v4-record-{width}x{height}-'+('long' if long else 'normal')
            page.screenshot(path=str(root/f'{name}.png'))
            checks.append({'scenario':name,'result':'PASS','geometry':geometry})
    page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
    page.evaluate('scrollTo(0,0)')
    page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click()
    page.locator('#next').click()
    expect(page.locator('#feedback')).to_contain_text('Couldn’t save')
    expect(page.locator('.utility')).to_be_visible()
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
    page.get_by_role('button',name='Retry save',exact=True).click()
    expect(page.locator('#position')).to_have_text('Line 2 of 3')
    expect(page.locator('.utility')).to_be_hidden()
    gap=page.evaluate('''()=>({utilityHeight:document.querySelector('.utility').getBoundingClientRect().height,bottomGap:document.querySelector('.performance').getBoundingClientRect().bottom-document.querySelector('#next-help').getBoundingClientRect().bottom})''')
    assert gap['utilityHeight']==0 and gap['bottomGap']<=25,gap
    checks.append({'scenario':'Utility remains available after failed first acceptance; hidden as a whole after first saved take, without divider/gap; candidate retained','result':'PASS','geometry':gap})
    for i in [2,3]:
        page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        page.locator('#next').click()
        if i==2:expect(page.locator('#position')).to_have_text('Line 3 of 3')
    expect(page.locator('#result')).to_be_visible(timeout=5000)
    for width,height in [(1440,900),(390,844),(1280,600)]:
        page.locator('#return').click()
        page.set_viewport_size({'width':width,'height':height})
        page.locator('#to-result').click()
        expect(page.locator('#assembly')).to_be_visible()
        for state in ['assembly','ready']:
            if state=='ready':
                expect(page.locator('#result')).to_be_visible(timeout=5000)
                page.locator('#result').evaluate('(v)=>v.play()')
                page.wait_for_function('document.querySelector("#result").currentTime>.4')
                page.locator('#result').evaluate('(v)=>v.pause()')
            page.evaluate('scrollTo(0,0)')
            geometry=page.evaluate('''()=>Object.fromEntries(['.project-header','.project-name','#heading','.result-stage','.result-bottom'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,{left:r.left,right:r.right,width:r.width}]}))''')
            stage=geometry['.result-stage']
            for selector in ['.project-header','.result-bottom']:
                assert abs(geometry[selector]['left']-stage['left'])<1 and abs(geometry[selector]['right']-stage['right'])<1,geometry
            for selector in ['.project-name','#heading']:assert abs(geometry[selector]['left']-stage['left'])<1,geometry
            page.screenshot(path=str(root/f'v4-result-{width}x{height}-{state}.png'))
            checks.append({'scenario':f'Result {width}x{height} {state}: project label/heading/player/actions share content edges','result':'PASS','geometry':geometry})
    page.locator('#return').click()
    assert not page.locator('#main').evaluate('(m)=>m.classList.contains("result-workspace")')
    expect(page.locator('.utility')).to_be_hidden()
    assert not errors,errors
    (root/'layout-v4-check-results.json').write_text(json.dumps({'version':'core-journey-lowfi-v4','browser':browser.version,'date':'2026-10-27','environment':'Windows, actual Chrome viewport, browser zoom 100%, DPR1; viewport captures, no full-page substitution','checks':checks,'pageErrors':errors},indent=2),encoding='utf8')
    browser.close()
print('PASS: desktop full loop fits at page top; ineligible utility hidden; Result heading/player/actions aligned')
