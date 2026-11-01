from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page();page.goto('http://127.0.0.1:5178');page.locator('.lab summary').click();print(page.locator('.lab').inner_text());print(page.locator('.lab input').evaluate_all('(es)=>es.map(e=>({id:e.id,type:e.type}))'));b.close()
