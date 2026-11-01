import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for lang in ['en','ru']:
  c=b.new_context(viewport={'width':390,'height':667},device_scale_factor=1);page=c.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#locale').select_option(lang);page.locator('.lab summary').click();page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000);candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')
  def fail_settings():
   page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('[data-destination=Settings]').click();page.locator('#guard [value=save]').click();expect(page.locator('#feedback')).to_be_visible();page.wait_for_timeout(230)
  fail_settings();guide=page.locator('#take-help').inner_text();assert ('opens Settings' if lang=='en' else '\u043e\u0442\u043a\u0440\u043e\u0435\u0442 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438') in guide
  page.mouse.move(100,200);page.mouse.wheel(0,80);expect(page.locator('#feedback')).to_be_hidden(timeout=500);assert page.locator('#take-help').inner_text()==guide;assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
  fail_settings();page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');expect(page.locator('#feedback')).to_be_hidden(timeout=500);page.locator('#pause').click();page.locator('#pause').click();expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#take-help').inner_text()==guide
  page.reload();page.wait_for_function('document.querySelector("#scene").readyState>=3');expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#take-help').inner_text()==guide
  page.locator('#next').click();expect(page.locator('#next')).to_have_attribute('aria-busy','true');assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
  expect(page.locator('#settings-note')).to_be_visible();s=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))');assert s['accepted'][0]['id']==candidate and s['candidates'][0] is None and not s.get('failure');expect(page.locator('.utility')).to_be_hidden()
  checks.append({'locale':lang,'viewport':[390,667],'result':'PASS','retainedGuidance':guide,'scenarios':['Settings destination explicit before/after popup hides and reload','manual wheel and explicit listening exit without deleting recovery','same new failure can retrigger','busy retry retains candidate until success, then opens Settings boundary only after acceptance']});c.close()
 b.close()
Path('evidence/highfi-v3-destination-results.json').write_text(json.dumps({'version':'core-journey-highfi-v3','date':'2026-10-27','checks':checks},indent=2),encoding='utf8')
print('PASS: EN/RU retained Settings destination, task-priority exit and exact-candidate successful recovery')
