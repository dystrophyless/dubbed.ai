import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

OUT=Path(__file__).parent
checks=[]
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True)
    for w,h,lang in [(1440,900,'en'),(1280,600,'ru'),(390,667,'ru')]:
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
        page.locator('.lab summary').click();page.locator('#locale').select_option(lang);page.locator('.lab summary').click()
        assert page.locator('#process-again,#process-help,.utility').count()==0
        assert 'Process again' not in page.locator('#product').inner_text()
        page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'original-amended-{w}x{h}-{lang}.png'))
        page.locator('#replay').click();page.wait_for_timeout(400);page.locator('#pause').click();position=page.locator('#scene').evaluate('(e)=>e.currentTime');page.wait_for_timeout(200);assert abs(page.locator('#scene').evaluate('(e)=>e.currentTime')-position)<.1
        page.locator('#pause').click();page.wait_for_timeout(150);assert page.locator('#scene').evaluate('(e)=>e.currentTime')>position
        page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=9000)
        old=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id');page.locator('#take').click();page.wait_for_timeout(150);assert page.locator('#scene').evaluate('(e)=>e.muted')
        page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click();expect(page.locator('#feedback')).to_be_visible()
        assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==old
        page.locator('#next').click();page.wait_for_function('document.querySelector("#position").textContent.includes("2")');assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0].id')==old
        assert page.locator('#process-again,#process-help,.utility').count()==0;assert not errors,errors
        checks.append({'viewport':[w,h],'locale':lang,'result':'PASS','checked':'Removed control/copy/empty utility; real Original Pause/Resume; fixed-window simulated Record/Your take; failed save exact candidate; retry/Next; no return of feature after acceptance','pageErrors':errors});ctx.close()
    b.close()
(OUT/'original-browser-results.json').write_text(json.dumps({'version':'original-highfi-v3-owner-removal-amendment','date':'2026-10-27','checks':checks,'limits':'Original comparison remains illustrative, with synthetic capture/sample and mock save. This owner-authorized feature removal is not a new high-fi redesign.'},indent=2)+'\n',encoding='utf-8')
print('PASS original amended comparison: three viewports, removed feature and adjacent transport/save behavior')
