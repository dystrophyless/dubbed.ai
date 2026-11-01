import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 page.goto('http://127.0.0.1:5178')
 page.wait_for_function('document.querySelector("#scene").readyState>=3')
 page.screenshot(path=str(out/'review-desktop-initial.png'),full_page=True)
 print(page.locator('body').inner_text())
 print(page.locator('button').evaluate_all('(els)=>els.map(e=>({id:e.id,text:e.innerText,disabled:e.disabled}))'))
 print(b.version)
 b.close()
