from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900});page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');print(page.locator('main').inner_text());print(page.locator('button,input').evaluate_all('(es)=>es.map(e=>({id:e.id,tag:e.tagName,type:e.type,text:e.innerText,aria:e.getAttribute("aria-label"),class:e.className}))'));print(page.locator('#scene').evaluate('(e)=>e.parentElement.outerHTML.slice(0,1800)'));page.screenshot(path=str(Path(__file__).parent/'v3-review-desktop-initial.png'),full_page=True);b.close()
