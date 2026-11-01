from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page();page.goto('http://127.0.0.1:5178');print(page.locator('#scrub').evaluate('(e)=>e.parentElement.outerHTML.slice(0,800)'));b.close()
