import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1882,'height':902},device_scale_factor=1);page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');page.wait_for_timeout(300);page.screenshot(path=str(out/'v5-review-normal-initial.png'));print(page.locator('main').inner_text());print(page.locator('main').evaluate('(e)=>e.outerHTML.slice(0,2600)'))
 for w,h,long in [(1440,900,False),(1280,600,True),(1366,650,True),(390,844,False)]:
  page.set_viewport_size({'width':w,'height':h});page.locator('.lab summary').click();page.locator('#long-line').set_checked(long);page.locator('.lab summary').click();page.evaluate('scrollTo(0,0)');page.wait_for_timeout(300);page.screenshot(path=str(out/f'v5-review-initial-{w}x{h}.png'))
 b.close()
