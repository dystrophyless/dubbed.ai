from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('prototypes/core-journey-lowfi/evidence/ab-highfi-v1');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1280,600,True),(390,667,True)]:
  pg=b.new_page(viewport={'width':w,'height':h},reduced_motion='reduce' if w<768 else 'no-preference');pg.goto('http://127.0.0.1:5178');pg.wait_for_function('document.querySelector("#scene").readyState>=3')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  pg.locator('#record').click();pg.wait_for_timeout(1000);assert pg.locator('.brand').get_attribute('aria-disabled')=='true' and pg.locator('.brand').get_attribute('tabindex')=='-1';pg.locator('.brand').dispatch_event('click');assert pg.locator('#destination').is_hidden() and not pg.locator('#capture-badge').is_hidden();pg.wait_for_timeout(220);pg.screenshot(path=str(out/f'final-A-{w}x{h}-capture.png'));pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);assert pg.locator('.brand').get_attribute('aria-disabled')=='false' and pg.locator('.brand').get_attribute('tabindex')=='0';rows.append({'viewport':[w,h],'result':'PASS','captureNavigationBlockedAndAnnounced':True,'restoredAfterAutostop':True});pg.close()
 b.close()
(out/'capture-nav-results.json').write_text(json.dumps({'variant':'A','result':'PASS','checks':rows},indent=2)+'\n',encoding='utf-8');print('PASS3 A explicit capture/save navigation affordance states')
