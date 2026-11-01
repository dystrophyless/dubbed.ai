from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900});page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');print('RESULT',page.locator('#result').evaluate('(e)=>e.parentElement.parentElement.outerHTML.slice(0,3500)'));print('UTILITY',page.locator('#process-again').evaluate('(e)=>e.parentElement.outerHTML'));print('HEADING',page.locator('main').evaluate('(e)=>e.outerHTML.slice(0,1000)'));b.close()
