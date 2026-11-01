from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready');page.screenshot(path=str(out/'studio-review-desktop-initial.png'));print(page.locator('body').inner_text());print(page.locator('main').evaluate('(e)=>e.outerHTML.slice(0,3800)'))
 for w,h,long in [(1280,600,False),(1280,600,True),(390,667,True),(390,844,False)]:
  page.set_viewport_size({'width':w,'height':h});page.locator('.lab summary').click();page.locator('#long-line').set_checked(long);page.locator('.lab summary').click();page.evaluate('scrollTo(0,0)');page.wait_for_timeout(200);page.screenshot(path=str(out/(f'studio-review-{w}x{h}-'+('long' if long else 'normal')+'.png')))
 b.close()
