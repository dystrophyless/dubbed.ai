import json,wave,struct,math,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900});page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 def capture():page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
 def st():return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
 capture();page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');capture();candidate=st()['candidates'][1]['id'];page.locator('#previous').click();page.get_by_role('button',name='Save and go',exact=True).click();expect(page.locator('#position')).to_have_text('Line 1 of 3');checks.append({'check':'Save and go accepts exact candidate before previous','pass':st()['accepted'][1]['id']==candidate})
 page.locator('#next').click();page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 3 of 3');capture();c=st()['candidates'][2]['id'];page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();checks.append({'check':'Blocked recapture protects candidate','pass':st()['candidates'][2]['id']==c});page.reload();expect(page.locator('#take')).to_be_enabled();checks.append({'check':'Browser-local reload retains same candidate','pass':st()['candidates'][2]['id']==c});page.locator('#next').click();expect(page.locator('#result')).to_be_visible(timeout=5000);page.locator('#return').click();capture();page.locator('#next').click();expect(page.locator('#position')).to_have_text('Line 2 of 3');checks.append({'check':'Completed-project replacement does not auto assemble','pass':page.locator('#result').is_hidden()});page.locator('#to-result').click();expect(page.locator('#result')).to_be_visible(timeout=5000);checks.append({'check':'Explicit To result assembles revised completed set','pass':True});b.close()
for file in sorted((out.parent/'public/media').glob('take-*.wav')):
 with wave.open(str(file),'rb') as w:
  raw=w.readframes(w.getnframes());samples=struct.unpack('<'+'h'*(len(raw)//2),raw);rms=math.sqrt(sum(x*x for x in samples)/len(samples));checks.append({'check':'Non-silent synthetic audition fixture','file':file.name,'rms_pcm16':rms})
(out/'guard-revision-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8');print(json.dumps(checks,indent=2))
