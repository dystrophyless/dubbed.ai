import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path('evidence');checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900});page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 def state():return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
 def record():page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
 record();first=state()['candidates'][0]['id'];page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');record();second=state()['candidates'][1]['id']
 page.locator('#previous').click();page.locator('#guard [value=stay]').click();expect(page.locator('#guard')).to_be_hidden();assert state()['candidates'][1]['id']==second and state()['index']==1
 page.locator('#previous').click();page.locator('#guard [value=discard]').click();expect(page.locator('#position')).to_have_text('Line 1 of 3');assert state()['candidates'][1] is None and state()['accepted'][0]['id']==first
 checks.append({'scenario':'Previous Stay retains candidate; explicit Go without saving discards only that candidate and preserves accepted line','result':'PASS'})
 record();replacement=state()['candidates'][0]['id'];page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click();expect(page.locator('#feedback')).to_contain_text('Couldn’t save');page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');assert state()['accepted'][0]['id']==first and state()['candidates'][0]['id']==replacement;expect(page.locator('.utility')).to_be_hidden();expect(page.locator('#take')).to_be_enabled();expect(page.locator('#next')).to_be_enabled()
 checks.append({'scenario':'Reload after failed replacement retains exact candidate and old accepted take, audition/save enabled, Process again hidden','result':'PASS'})
 page.get_by_role('button',name='My projects',exact=True).click();page.locator('#guard [value=stay]').click();expect(page.locator('#guard')).to_be_hidden();assert state()['candidates'][0]['id']==replacement
 page.get_by_role('button',name='My projects',exact=True).click();page.locator('#guard [value=save]').click();expect(page.locator('#destination')).to_be_visible();assert state()['accepted'][0]['id']==replacement and state()['candidates'][0] is None;page.locator('#destination-close').click();expect(page.locator('#destination')).to_be_hidden()
 checks.append({'scenario':'Workspace leave Stay protects candidate; explicit Save and leave accepts exact candidate before opening neighboring boundary','result':'PASS'})
 (root/'highfi-v3-retention-results.json').write_text(json.dumps({'version':'core-journey-highfi-v3','date':'2026-10-27','browser':b.version,'checks':checks,'limit':'browser-local draft only, no server durability'},indent=2),encoding='utf8');b.close()
print('PASS: explicit discard/Stay, failed-replacement reload retention, guarded Save and leave')
