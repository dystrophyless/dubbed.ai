import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;results=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':390,'height':667},device_scale_factor=1,reduced_motion='reduce');page.goto('http://127.0.0.1:5178');page.locator('.lab summary').click();page.locator('#locale').select_option('ru');page.locator('#long-line').check();page.locator('.lab summary').click();page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();page.locator('#take').click();page.wait_for_timeout(350);page.locator('#pause').click();page.reload();page.wait_for_timeout(350)
 def grab(name):
  d=page.locator('#feedback,#replay,#record,#take,#open-settings').evaluate_all('(es)=>({scroll:scrollY,active:{id:document.activeElement.id,rect:document.activeElement.getBoundingClientRect().toJSON()},items:es.map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON()}))})');results.append({'state':name,'data':d});page.screenshot(path=str(out/(name+'.png')));print(name,d,flush=True)
 grab('hf2-review-reloaded-phone-focus')
 for i in range(9):page.keyboard.press('Tab');page.wait_for_timeout(120);grab('hf2-review-reloaded-phone-tab'+str(i))
 page.mouse.wheel(0,220);page.wait_for_timeout(200);grab('hf2-review-reloaded-phone-scrolled')
 (out/'hf2-reload-focus-review.json').write_text(json.dumps(results,indent=2),encoding='utf-8');b.close()


