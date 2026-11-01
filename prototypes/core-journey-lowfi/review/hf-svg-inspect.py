from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page();page.goto('http://127.0.0.1:5178');print(page.locator('svg').evaluate_all('(es)=>es.filter(e=>getComputedStyle(e).strokeWidth!="1.1px"||getComputedStyle(e).fill!="none"||getComputedStyle(e).strokeLinecap!="round"||getComputedStyle(e).strokeLinejoin!="round"||e.getAttribute("viewBox")!="0 0 24 24").map(e=>({html:e.outerHTML.slice(0,500),rect:e.getBoundingClientRect().toJSON()}))'));b.close()
