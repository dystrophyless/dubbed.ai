from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('prototypes/core-journey-lowfi/evidence/media-header-v7');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h in [(1440,900),(1920,910),(1280,600),(1366,650),(390,667)]:
  for long in [False,True]:
   pg=b.new_page(viewport={'width':w,'height':h});pg.goto('http://127.0.0.1:5179');pg.evaluate('document.fonts.ready');pg.wait_for_timeout(200)
   if long:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('.lab summary').click()
   row=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom}};let d=r('#dialogue'),wave=r('.wave');return {scene:r('.scene'),script:r('.script'),dialogue:d,wave,timeline:r('.timeline'),gap:wave.y-d.bottom,padding:getComputedStyle(document.querySelector('.script')).padding,dots:r('#dots'),title:r('.studio-title'),header:r('.studio-header')}}''');rows.append({'viewport':[w,h],'longRU':long,**row});pg.close()
 b.close()
(out/'B-measured-baseline.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');print(json.dumps([{'size':x['viewport'],'long':x['longRU'],'wave':x['wave']['h'],'gap':x['gap'],'script':x['script']['h'],'title':x['title']} for x in rows],indent=2))
