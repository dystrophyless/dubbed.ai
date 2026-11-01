import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).parent.parent;out=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':390,'height':667});page.goto('http://127.0.0.1:5178');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();message=page.locator('#feedback').inner_text();page.wait_for_timeout(6500);assert page.locator('#feedback').is_visible() and page.locator('#feedback').inner_text()==message;result={'afterMs':6500,'messageUnchanged':True,'buttons':page.locator('#feedback button').count(),'visible':True};b.close()
m=json.loads((r/'evidence/version.json').read_text());bad=[f for f,h in m['sha256'].items() if hashlib.sha256((r/f).read_bytes()).hexdigest()!=h];assert not bad;result['target']={'version':m['version'],'count':len(m['sha256']),'mismatches':bad};(out/'hf2-final-persistence-check.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(result)
