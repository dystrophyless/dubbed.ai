from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page();page.goto('http://127.0.0.1:5178/calibration.html');print('INVALID',page.locator('#invalid-sample').evaluate('(e)=>({border:getComputedStyle(e).border,color:getComputedStyle(e).color})'));print('SPINNER',page.locator('#loading-sample .hf-spinner').evaluate('(e)=>({tag:e.tagName,animation:getComputedStyle(e).animationName,duration:getComputedStyle(e).animationDuration})'));b.close()
