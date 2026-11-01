import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1882,'height':902},device_scale_factor=1);page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();page.wait_for_timeout(250);print('TEXT',page.locator('body').inner_text());print('LIVE',page.locator('[role=status],[role=alert],[aria-live]').evaluate_all('(es)=>es.map(e=>({html:e.outerHTML}))'));print('BUTTONS',page.locator('main button').evaluate_all('(es)=>es.filter(e=>e.getBoundingClientRect().height).map(e=>({id:e.id,text:e.innerText,cls:e.className}))'));page.screenshot(path=str(out/'hf2-review-initial-mic-desktop.png'));page.goto('http://127.0.0.1:5178/calibration.html');page.evaluate('document.fonts.ready');page.screenshot(path=str(out/'hf2-review-calibration.png'),full_page=True);print('CAL',page.locator('body').inner_text());b.close()
