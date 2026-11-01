from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page();page.goto('http://127.0.0.1:5178');page.locator('#process-again').click();print(page.locator('main').inner_text());b.close()
