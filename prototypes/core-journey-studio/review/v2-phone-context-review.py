import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;checks=[]
def click_min(page,sel):
 r=page.locator(sel).bounding_box();delta=max(0,r['y']+r['height']-667+8)
 if delta:page.mouse.wheel(0,delta);page.wait_for_timeout(200)
 r=page.locator(sel).bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
def check(page,n):
 d=page.locator('#scene,#dialogue,#capture-badge').evaluate_all('(es)=>es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON()}))');assert all(e['rect']['top']>=0 and e['rect']['bottom']<=667 for e in d);checks.append({'state':n,'geometry':d});page.screenshot(path=str(out/(n+'.png')))
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':390,'height':667},device_scale_factor=1,reduced_motion='reduce');page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#locale').select_option('ru');page.locator('#long-line').check();page.locator('.lab summary').click();click_min(page,'#record');expect(page.locator('#capture-badge')).to_be_visible();check(page,'studio-v2-review-phone-first-capture');page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);click_min(page,'#next');expect(page.locator('#position')).to_contain_text('2');click_min(page,'#record');expect(page.locator('#capture-badge')).to_be_visible();check(page,'studio-v2-review-phone-next-capture');page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.locator('#exit').click();expect(page.locator('#guard')).to_be_visible();page.locator('#guard button').nth(0).click();expect(page.locator('#guard')).to_be_hidden();expect(page.locator('#position')).to_contain_text('2');checks.append({'state':'Phone candidate Exit Stay remains safe','pass':True});b.close()
(out/'v2-phone-context-review.json').write_text(json.dumps(checks,indent=2),encoding='utf-8');print(checks)
