import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for port in [5179,5178]:
  page=b.new_page(viewport={'width':1280,'height':600},device_scale_factor=1);page.goto(f'http://127.0.0.1:{port}');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click();page.evaluate('scrollTo(0,0)');page.wait_for_timeout(250);d=page.locator('#scene').evaluate('(e)=>{let r=e.getBoundingClientRect(),k=Math.min(r.width/e.videoWidth,r.height/e.videoHeight);return {frame:r.toJSON(),source:[e.videoWidth,e.videoHeight],containedPicture:[e.videoWidth*k,e.videoHeight*k]}}');rows.append({'port':port,'geometry':d});page.screenshot(path=str(out/(f'studio-review-comparison-{port}-1280x600-long.png')));page.close()
 b.close()
(out/'scene-size-comparison.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print(json.dumps(rows,indent=2))
