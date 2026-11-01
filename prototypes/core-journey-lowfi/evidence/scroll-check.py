"""Manual-style minimal scroll and pointer clicks; no locator auto-centering."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).parent
checks=[]
def scroll_to_button(page,selector):
    rect=page.locator(selector).bounding_box()
    delta=max(0,rect['y']+rect['height']-page.viewport_size['height']+8)
    page.mouse.wheel(0,delta)
    page.wait_for_timeout(150)

def click_visible(page,selector):
    rect=page.locator(selector).bounding_box()
    assert rect['y']>=0 and rect['y']+rect['height']<=page.viewport_size['height'],(selector,rect)
    page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)

def geometry(page):
    return page.evaluate('''() => ({scroll:scrollY,height:innerHeight,items:Object.fromEntries(['#scene','#dialogue','#capture-badge','#record'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return [s,{top:r.top,bottom:r.bottom,height:r.height}]}))})''')

def visible_context(page,capture=False):
    g=geometry(page)
    for selector in ['#scene','#dialogue']+(['#capture-badge'] if capture else []):
        assert g['items'][selector]['top']>=0 and g['items'][selector]['bottom']<=g['height'],(selector,g)
    return g

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width,height,long,motion in [(390,667,False,'no-preference'),(390,667,True,'no-preference'),(390,667,True,'reduce'),(390,844,False,'no-preference'),(1440,900,False,'no-preference')]:
        context=browser.new_context(viewport={'width':width,'height':height},reduced_motion=motion,device_scale_factor=1)
        page=context.new_page()
        page.goto('http://127.0.0.1:5178')
        page.wait_for_function('document.querySelector("#scene").readyState>=3')
        if long:
            page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click()
        scroll_to_button(page,'#record')
        click_visible(page,'#record')
        expect(page.locator('#capture-badge')).to_be_visible()
        initial=visible_context(page,True)
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        scroll_to_button(page,'#next')
        before=geometry(page)
        click_visible(page,'#next')
        expect(page.locator('#position')).to_have_text('Line 2 of 3')
        newline=visible_context(page)
        stem=f'v5-{width}x{height}-'+('long' if long else 'normal')+'-'+motion
        page.screenshot(path=str(root/f'{stem}-newline.png'))
        scroll_to_button(page,'#record')
        click_visible(page,'#record')
        expect(page.locator('#capture-badge')).to_be_visible()
        capture=visible_context(page,True)
        assert page.locator('#scene').evaluate('(v)=>!v.paused')
        page.screenshot(path=str(root/f'{stem}-capture.png'))
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        checks.append({'viewport':[width,height],'longDialogue':long,'reducedMotion':motion,'result':'PASS','firstCapture':initial,'beforeNext':before,'newLine':newline,'secondCapture':capture})
        context.close()
    (root/'scroll-check-results.json').write_text(json.dumps({'version':'core-journey-lowfi-v5','browser':browser.version,'date':'2026-10-27','method':'Wheel only enough for full button visibility +8px, coordinate click, no locator auto-scroll; assertions on viewport crops','checks':checks},indent=2),encoding='utf8')
    browser.close()
print('PASS: manual-style scroll / Next / Record with full scene, dialogue and recording badge; long dialogue and reduced motion')
