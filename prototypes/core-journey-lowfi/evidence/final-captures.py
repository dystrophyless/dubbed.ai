import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    page.goto('http://127.0.0.1:5178')
    page.wait_for_function('document.querySelector("#scene").readyState>=3')
    page.screenshot(path=str(root/'final-desktop.png'),full_page=True)
    for i in range(3):
        page.locator('#record').click()
        expect(page.get_by_role('button',name='Settings',exact=True)).to_be_disabled()
        page.locator('.brand').click()
        expect(page.locator('#destination')).to_be_hidden()
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        page.locator('#next').click()
        if i<2: expect(page.locator('#position')).to_have_text(f'Line {i+2} of 3')
    expect(page.locator('#result')).to_be_visible(timeout=5000)
    page.locator('#result').evaluate('(v)=>v.play()')
    page.wait_for_function('document.querySelector("#result").currentTime>1')
    page.locator('#result').evaluate('(v)=>v.pause()')
    page.screenshot(path=str(root/'desktop-result.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(root/'phone-result.png'),full_page=True)
    page.locator('#return').click()
    page.screenshot(path=str(root/'final-phone.png'),full_page=True)
    (root/'final-capture-results.json').write_text(json.dumps({'result':'PASS','checks':['All three lines recorded and accepted through actual UI','Capture blocks global navigation buttons and brand','Distinct result fixture played beyond one second, paused and captured','Desktop initial and phone saved-line captures'],'browser':browser.version,'date':'2026-10-27'},indent=2),encoding='utf8')
    browser.close()
print('PASS: final captures and capture-navigation checks')
