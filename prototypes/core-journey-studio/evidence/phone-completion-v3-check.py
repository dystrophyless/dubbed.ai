import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

out=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':390,'height':667},reduced_motion='reduce',device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3')
    page.locator('.lab summary').click();page.locator('#locale').select_option('ru');page.locator('.lab summary').click()
    # Browser locator clicks expose controls; manual-style scrolling is covered by self-check.py.
    page.locator('#scrub').focus();page.keyboard.down('End');assert page.locator('#scene').evaluate('(e)=>e.paused');page.keyboard.up('End');page.wait_for_timeout(200);assert not page.locator('#scene').evaluate('(e)=>e.paused')
    for i in range(3):
        page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=9000)
        if i==0:
            page.locator('#take').click();page.wait_for_function('document.querySelector("#scene").paused',timeout=7000);page.locator('#take').click();page.wait_for_timeout(180)
            assert page.locator('#scene').evaluate('(e)=>e.currentTime<.6 && e.muted && !e.paused')
            assert not page.locator('#take-audio').evaluate('(e)=>e.paused')
        if i<2:
            page.locator('#next').click();page.wait_for_function('(n)=>document.querySelector("#position").textContent.includes(n+" / 3")',arg=str(i+2))
    page.locator('#exit').click();page.locator('#guard [value=save]').click();expect(page.locator('#destination')).to_be_visible()
    assert page.locator('#destination-title').inner_text()=='Мои проекты'
    state=page.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1"))');assert state['completed'] and all(state['accepted']) and state['view']=='record'
    page.locator('#destination-close').click();page.locator('#to-result').click();page.wait_for_function('!document.querySelector("#result-view").hidden && document.querySelector("#assembly").hidden')
    page.evaluate('scrollTo(0,0)');page.wait_for_timeout(200);page.screenshot(path=str(out/'studio-v3-phone-result.png'))
    assert not errors,errors
    result={'version':'core-journey-studio-lowfi-v3','browser':browser.version,'date':'2026-10-27','viewport':[390,667],'locale':'ru','reducedMotion':True,'result':'PASS','checked':['Keyboard held seek pauses; release plays','Your take restarts from ended fixed window with synchronized muted video and sample audio','All three recorded/accepted windows and exact three-dot position','Initial final-gap Save and leave preserves explicit My projects destination','Explicit To result after completion; grouped phone Result'],'pageErrors':errors,'limits':'Simulated capture/save/assembly; synthetic sample and illustrative MP4, not actual user media render'}
    (out/'phone-completion-v3-results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');browser.close()
print('PASS phone completion, keyboard release seek, ended take restart and explicit final-gap Exit destination')
