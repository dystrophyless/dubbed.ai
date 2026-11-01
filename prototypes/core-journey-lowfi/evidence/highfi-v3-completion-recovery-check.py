import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1280,'height':600});page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 for index in [0,1,2]:
  page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
  if index<2:page.locator('#next').click();page.wait_for_function('(i)=>JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===i',arg=index+1)
 page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();expect(page.locator('#feedback')).to_contain_text('Microphone unavailable')
 page.locator('#previous').click();page.locator('#guard [value=save]').click();page.wait_for_function('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).index===1');data=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))');assert data['completed'] and all(data['accepted']) and data['failure'].startswith('Microphone')
 expect(page.locator('#feedback')).to_contain_text('Microphone unavailable');expect(page.locator('#open-settings')).to_be_visible();expect(page.locator('#to-result')).to_be_visible()
 page.locator('#to-result').click();expect(page.locator('#assembly')).to_be_visible();expect(page.locator('#feedback')).to_be_hidden();expect(page.locator('#result')).to_be_visible(timeout=5000);page.locator('#return').click();expect(page.locator('#feedback')).to_be_hidden();expect(page.locator('#take-help')).to_contain_text('Microphone unavailable');expect(page.locator('#open-settings')).to_be_visible()
 page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();expect(page.locator('#feedback')).to_be_hidden()
 Path('evidence/highfi-v3-completion-recovery-results.json').write_text(json.dumps({'version':'core-journey-highfi-v3','date':'2026-10-27','result':'PASS','scenario':'Initial completion through Save and go does not replace unresolved microphone feedback with success; Result hides irrelevant notice and Return restores durable guidance without replaying the popup; new successful simulated capture resolves it','viewport':[1280,600]},indent=2),encoding='utf8');b.close()
print('PASS: unresolved microphone issue survives automatic completion message and Result/Return navigation')
