from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path('prototypes/core-journey-lowfi/evidence/media-header-v7');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(390,667,True)]:
  pg=b.new_page(viewport={'width':w,'height':h});pg.goto('http://127.0.0.1:5178');pg.evaluate('document.fonts.ready');pg.wait_for_timeout(200)
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  pg.screenshot(path=str(out/f'first-A7-{w}x{h}.png'));rows.append(pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};return {size:[innerWidth,innerHeight],scene:r('.scene'),header:r('.project-header'),exit:r('#exit'),title:r('.project-heading'),dots:r('#dots'),script:r('.script'),dialogue:r('#dialogue'),wave:r('.wave'),timeline:r('.timeline'),panel:r('.performance')}}'''));pg.close()
 b.close()
(out/'first-results.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');print(json.dumps(rows,indent=2))
