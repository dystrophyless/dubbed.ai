import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;results=[]
def obs(page,name):
 d=page.locator('#scene,#capture-badge,#dialogue,#record,#next').evaluate_all('(es)=>({scroll:scrollY,items:es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON(),text:e.innerText}))})');results.append({'name':name,'data':d});print(name,d,flush=True);page.screenshot(path=str(out/(name+'.png')))
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for h,long in [(844,False),(667,False),(667,True)]:
  page=b.new_page(viewport={'width':390,'height':h},device_scale_factor=1);page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
  if long:page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click()
  prefix=f'review-phone-{h}-'+('long' if long else 'normal')
  page.locator('#record').click();obs(page,prefix+'-capture');page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);obs(page,prefix+'-candidate');page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');obs(page,prefix+'-next-line');page.close()
 (out/'phone-task-observations.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8');b.close()
