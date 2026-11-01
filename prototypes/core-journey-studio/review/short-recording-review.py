from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1280,'height':600},device_scale_factor=1);page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click();page.locator('#record').click();page.wait_for_timeout(1800);page.screenshot(path=str(out/'studio-review-short-long-recording.png'));page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.wait_for_timeout(220);page.screenshot(path=str(out/'studio-review-short-long-take-ready.png'));b.close()
