from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('prototypes/core-journey-studio/evidence/ab-highfi-v1');rows=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for port,variant in [(5178,'A'),(5179,'B')]:
  for w,h,ru in [(1440,900,False),(1280,600,True),(390,667,True)]:
   pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(f'http://127.0.0.1:{port}');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
   if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
   pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);pg.screenshot(path=str(out/f'first-{variant}-{w}x{h}.png'))
   r=pg.evaluate('''()=>{const r=s=>{let b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom}},wave=document.querySelector('.original-envelope');return {scene:r('.scene'),script:r('.script'),wave:r('.wave'),timeline:r('.timeline'),panel:r('.performance'),stroke:wave?getComputedStyle(wave).stroke:null,overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not r['overflow'] and r['stroke']=='rgb(126, 126, 126)',r;assert pg.locator('#replay').inner_text() in ['Original','Оригинал'];assert not pg.locator('.wave-key,#speaker,#panel-speaker').count()
   rows.append({'variant':variant,'viewport':[w,h],'longRU':ru,'geometry':r});pg.close()
 b.close()
assert not errors,errors
(out/'first-browser-results.json').write_text(json.dumps({'result':'PASS','checks':rows,'pageErrors':errors},indent=2)+'\n',encoding='utf-8');print('PASS A/B first source/layout checks')
