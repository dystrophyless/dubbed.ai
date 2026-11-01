import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 for candidate in [False,True]:
  if candidate:page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
  page.locator('#take' if candidate else '#replay').click();page.wait_for_timeout(250);r=page.locator('#scrub').bounding_box();v=page.locator('#scrub').evaluate('(e)=>+e.value/1000');page.mouse.move(r['x']+8+(r['width']-16)*v,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+r['width']*.43,r['y']+r['height']/2,steps=6);t=page.locator('#scene').evaluate('(e)=>e.currentTime');page.wait_for_timeout(350);assert page.locator('#scene').evaluate('(e)=>e.paused') and page.locator('#take-audio').evaluate('(e)=>e.paused');assert abs(page.locator('#scene').evaluate('(e)=>e.currentTime')-t)<.03;page.mouse.up();page.wait_for_timeout(180);d=page.locator('#scene,#take-audio').evaluate_all('(es)=>es.map(e=>({id:e.id,muted:e.muted,paused:e.paused,t:e.currentTime}))');assert not d[0]['paused']
  if candidate:assert d[0]['muted'] and not d[1]['paused'] and abs(d[0]['t']-d[1]['t'])<.15
  else:assert not d[0]['muted'] and d[1]['paused']
  checks.append({'source':'candidate' if candidate else 'original','heldPaused':True,'release':d})
 b.close()
(out/'studio-transport-review.json').write_text(json.dumps(checks,indent=2),encoding='utf-8');print(json.dumps(checks,indent=2))
