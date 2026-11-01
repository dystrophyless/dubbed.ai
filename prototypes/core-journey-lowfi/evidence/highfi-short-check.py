import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).parent
checks=[]
def expose(page,selector):
    r=page.locator(selector).bounding_box();page.mouse.wheel(0,max(0,r['y']+r['height']-page.viewport_size['height']+8));page.wait_for_timeout(150)
def click(page,selector):
    r=page.locator(selector).bounding_box();assert r['y']>=0 and r['y']+r['height']<=page.viewport_size['height'];page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
def context_view(page,capture=False):
    g=page.evaluate('''()=>({scroll:scrollY,height:innerHeight,items:Object.fromEntries(['#scene','#dialogue','#capture-badge'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,[r.top,r.bottom]]}))})''')
    for s in ['#scene','#dialogue']+(['#capture-badge'] if capture else []):assert g['items'][s][0]>=0 and g['items'][s][1]<=g['height'],(s,g)
    return g
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for w,h,lang,long,motion in [(390,667,'en',False,'no-preference'),(390,667,'ru',True,'no-preference'),(390,667,'ru',True,'reduce'),(390,844,'ru',False,'no-preference'),(1440,900,'en',False,'no-preference')]:
        ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion=motion,device_scale_factor=1);page=ctx.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
        page.locator('.lab summary').click();page.locator('#locale').select_option(lang);page.locator('#long-line').set_checked(long);page.locator('.lab summary').click()
        expose(page,'#record');click(page,'#record');expect(page.locator('#capture-badge')).to_be_visible();first=context_view(page,True);page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
        expose(page,'#next');click(page,'#next');expect(page.locator('#position')).to_have_text('Реплика 2 из 3' if lang=='ru' else 'Line 2 of 3');new_line=context_view(page)
        name=f'hf-short-{w}x{h}-{lang}-{motion}';page.screenshot(path=str(root/f'{name}-newline.png'));expose(page,'#record');click(page,'#record');expect(page.locator('#capture-badge')).to_be_visible();capture=context_view(page,True);page.screenshot(path=str(root/f'{name}-capture.png'))
        checks.append({'scenario':name,'result':'PASS','firstCapture':first,'newLine':new_line,'secondCapture':capture});ctx.close()
    ctx=browser.new_context(viewport={'width':767,'height':700});page=ctx.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
    for width in [767,768]:
        page.set_viewport_size({'width':width,'height':700});page.locator('.lab summary').click();page.locator('#locale').select_option('ru');page.locator('.lab summary').click();page.evaluate('scrollTo(0,0)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(root/f'hf-boundary-{width}-ru.png'))
        checks.append({'scenario':f'RU {width}px responsive boundary without horizontal overflow','result':'PASS'})
    ctx.close();(root/'highfi-short-check-results.json').write_text(json.dumps({'version':'core-journey-highfi-v1','browser':browser.version,'date':'2026-10-27','method':'Minimal wheel to full button +8px, coordinate clicks; actual viewport crops; no locator auto-centering','checks':checks},indent=2),encoding='utf8');browser.close()
print('PASS: EN/RU manual-style short-phone turn/capture context, reduced motion and 767/768 boundary')
