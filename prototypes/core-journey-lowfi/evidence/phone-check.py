import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    page.goto('http://127.0.0.1:5178')
    page.wait_for_function('document.querySelector("#scene").readyState >= 3')
    assert page.locator('#scene').evaluate('(v)=>v.paused')
    page.screenshot(path=str(root/'phone-initial.png'),full_page=True)
    for expected_line in [2,3]:
        page.locator('#record').click()
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        if expected_line==2:
            page.locator('#next').click()
        else:
            page.locator('#previous').click()
            page.get_by_role('button',name='Save and go',exact=True).click()
            expect(page.locator('#position')).to_have_text('Line 1 of 3')
            page.locator('#next').click()
            expect(page.locator('#position')).to_have_text('Line 2 of 3')
            accepted=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[1].id')
            page.locator('#record').click()
            page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
            page.locator('.lab summary').click()
            page.locator('#fail-save').check()
            page.locator('.lab summary').click()
            page.locator('#next').click()
            expect(page.locator('#feedback')).to_contain_text('Couldn’t save')
            assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[1].id')==accepted
            page.locator('#take').click()
            page.wait_for_function('!document.querySelector("#take-audio").paused')
            expect(page.locator('#feedback')).to_contain_text('Couldn’t save')
            page.locator('#pause').click()
            page.screenshot(path=str(root/'phone-failed-save.png'),full_page=True)
            page.get_by_role('button',name='Retry save',exact=True).click()
        expect(page.locator('#position')).to_have_text(f'Line {expected_line} of 3')
    results.append('Phone record → Next; Previous Save and go; accepted revisit; failed replacement retains old accepted take and candidate; persistent error during audition; Retry save succeeds')
    page.locator('#record').click()
    page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
    candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[2].id')
    page.locator('.lab summary').click()
    page.locator('#fail-mic').check()
    page.locator('.lab summary').click()
    page.locator('#record').click()
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[2].id')==candidate
    page.locator('#previous').click()
    page.keyboard.press('Escape')
    assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[2].id')==candidate
    page.locator('#previous').click()
    page.get_by_role('button',name='Save and go',exact=True).click()
    expect(page.locator('#position')).to_have_text('Line 2 of 3')
    expect(page.locator('#feedback')).to_contain_text('assembling in the background')
    results.append('Phone failed recapture retains candidate; Escape keeps take; final-gap Save and go honors Previous and completion message')
    page.locator('#to-result').click()
    expect(page.locator('#result')).to_be_visible(timeout=5000)
    page.screenshot(path=str(root/'phone-result.png'),full_page=True)
    page.locator('#return').click()
    page.screenshot(path=str(root/'phone-saved.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':667})
    page.locator('.lab summary').click()
    page.locator('#long-line').check()
    page.locator('.lab summary').click()
    page.screenshot(path=str(root/'phone-long-dialogue.png'),full_page=True)
    for width in [767,768]:
        page.set_viewport_size({'width':width,'height':700})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    results.append('Phone Result and return; long-dialogue short-phone capture; 767/768 boundary without horizontal overflow')
    cdp=page.context.new_cdp_session(page)
    cdp.send('DOM.enable');cdp.send('CSS.enable')
    node=cdp.send('DOM.querySelector',{'nodeId':cdp.send('DOM.getDocument')['root']['nodeId'],'selector':'#dialogue'})['nodeId']
    fonts=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})
    (root/'phone-check-results.json').write_text(json.dumps({'browser':browser.version,'date':'2026-10-27','results':results,'dialoguePlatformFonts':fonts},indent=2),encoding='utf8')
    browser.close()
print(json.dumps(results,indent=2))
