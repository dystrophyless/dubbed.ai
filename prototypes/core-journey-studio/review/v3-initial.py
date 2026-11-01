import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('prototypes/core-journey-studio/review')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1280,'height':600},device_scale_factor=1);page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#locale').select_option('ru');page.locator('#long-line').check();page.locator('.lab summary').click();page.wait_for_timeout(200);page.screenshot(path=str(out/'studio-v3-review-short-long-before.png'));print(page.locator('main').inner_text());print(page.locator('#dialogue').evaluate('(e)=>({parent:e.parentElement.className,sceneSibling:e.parentElement.parentElement.className})'));page.locator('#record').click();page.wait_for_timeout(1500);page.screenshot(path=str(out/'studio-v3-review-short-long-during.png'));page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);page.wait_for_timeout(180);page.screenshot(path=str(out/'studio-v3-review-short-long-after.png'));b.close()
