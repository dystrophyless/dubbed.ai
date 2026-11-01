from pathlib import Path
import json
from playwright.sync_api import sync_playwright
r=Path.cwd();a=r/'prototypes/core-journey-lowfi';o=a/'evidence/media-header-v7';rows=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h in [(1440,900),(1920,910),(1280,600),(1366,650),(1247,700),(1248,700),(1023,700),(1024,700),(390,667)]:
  pg=b.new_page(viewport={'width':w,'height':h},reduced_motion='reduce' if w<768 else 'no-preference');pg.on('pageerror',lambda e:errors.append(str(e)));st=json.loads((r/'prototypes/core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));st.update(index=0,view='record',locale='ru');pg.goto('http://127.0.0.1:5178');pg.evaluate('(s)=>localStorage.setItem("dubbed-lowfi-v1",JSON.stringify(s))',st);pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready');pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('.lab summary').click();pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(120)
  assert pg.locator('#to-result .hf-label').evaluate('(e)=>e.getBoundingClientRect().height<=parseFloat(getComputedStyle(e).lineHeight)+1')
  g=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom,right:a.right}};return {scene:r('.scene'),header:r('.project-header'),exit:r('#exit'),title:r('#heading'),next:r('#to-result'),dots:r('#dots'),timeline:r('.timeline'),panel:r('.performance'),overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not g['overflow'] and abs(g['scene']['x']+g['scene']['w']/2-w/2)<1
  if w>=768:assert g['exit']['right']<=g['title']['x'] and g['title']['right']<=g['next']['x'] and g['scene']['y']>g['next']['bottom'],g
  else:assert g['exit']['right']<=g['next']['x'] and g['next']['bottom']<=g['title']['y'],g
  if w>=1248:assert g['timeline']['bottom']<=h and g['panel']['bottom']<=h
  pg.screenshot(path=str(o/f'A7-{w}x{h}-saved-header.png'));pg.locator('#to-result').click();pg.wait_for_function('!document.querySelector("#result-player").hidden && !document.querySelector("#result-play").disabled');pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(120)
  rr=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom,right:a.right}};return{exit:r('#exit'),header:r('.project-header'),title:r('#heading'),picture:r('.result-picture'),footer:r('.result-bottom'),overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not rr['overflow'] and rr['exit']['x']==rr['header']['x'] and abs(rr['title']['x']+rr['title']['w']/2-w/2)<1 and rr['header']['bottom']<=rr['picture']['y'],(w,h,rr);assert pg.locator('#dots').is_hidden()
  if w>=1248:assert rr['footer']['bottom']<=h,rr
  pg.screenshot(path=str(o/f'A7-{w}x{h}-result-ready.png'));rows.append({'viewport':[w,h],'result':'PASS','savedHeader':g,'resultReady':rr});pg.close()
 assert not errors,errors
 (o/'header-result-results.json').write_text(json.dumps({'version':'core-journey-panel-highfi-v7','date':'2026-10-28','result':'PASS','checks':rows,'pageErrors':errors,'method':'Actual Chrome,allaccepted fixture only to inspect earlier-line header Toresult+longRU andResultready composition;actual completion separately operated.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS9 A7 saved earlier-line header/action clearance andResult focused grouping/desktopfit')
