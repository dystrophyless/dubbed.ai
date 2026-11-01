import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;checks=[]
def click_min(page,selector):
 r=page.locator(selector).bounding_box();h=page.viewport_size['height']
 if r['y']+r['height']>h-8:
  page.mouse.wheel(0,r['y']+r['height']-h+8);page.wait_for_timeout(250)
 r=page.locator(selector).bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
def save(page,name):
 d=page.locator('#scene,#capture-badge,#dialogue,#record,#next').evaluate_all('(es)=>({scroll:scrollY,items:es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON()}))})');checks.append({'state':name,'layout':d});page.screenshot(path=str(out/(name+'.png')));print(name,d,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':390,'height':667},device_scale_factor=1);page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 click_min(page,'#record');page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);save(page,'review-shortphone-minscroll-candidate');click_min(page,'#next');expect(page.locator('#position')).to_have_text('Line 2 of 3');save(page,'review-shortphone-minscroll-newline');click_min(page,'#record');save(page,'review-shortphone-minscroll-line2-capture');page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
 page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name='Save and leave',exact=True).click();expect(page.locator('#destination')).to_be_visible();checks.append({'state':'Save and leave accepts and goes to Settings boundary','body':page.locator('#destination').inner_text()});page.locator('#destination-close').click()
 page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();click_min(page,'#record');save(page,'review-shortphone-input-failure')
 (out/'minimal-scroll-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8');b.close()
