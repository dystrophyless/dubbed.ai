from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('prototypes/core-journey-studio/evidence');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1280,'height':600},device_scale_factor=1)
 page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
 page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('#locale').select_option('ru');page.locator('.lab summary').click()
 for w,h in [(1920,910),(1440,900),(1366,650),(1280,600),(1280,699),(1280,700),(1280,701),(767,700),(768,700),(390,667)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(250)
  r=page.evaluate('''()=>{const r=s=>{let b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}},scene=r('.scene'),script=r('.script'),wave=r('.wave'),timeline=r('.timeline'),controls=r('.studio-controls'),main=r('main'),title=r('.studio-title');const buttons=[...document.querySelectorAll('.studio-controls button')].filter(x=>!x.hidden).map(x=>({text:x.innerText,x:x.getBoundingClientRect().x,right:x.getBoundingClientRect().right}));return {scene,script,wave,timeline,controls,main,title,buttons,overflow:document.documentElement.scrollWidth>innerWidth,gap:controls.y-timeline.bottom,border:getComputedStyle(document.querySelector('main')).borderTopWidth}}''')
  assert r['script']['y']>=r['scene']['bottom']-.1 and abs(r['wave']['x']-r['scene']['x'])<1 and abs(r['wave']['width']-r['scene']['width'])<1,r
  assert r['gap']>=24 and not r['overflow'] and r['border']=='0px',r
  if w>=768:
   assert r['scene']['width']>=576 and r['controls']['bottom']<=h and abs(r['title']['x']+r['title']['width']/2-w/2)<1,r
   assert min(x['x'] for x in r['buttons'])>=r['wave']['x']-1 and max(x['right'] for x in r['buttons'])<=r['wave']['right']+1,r
  rows.append({'viewport':[w,h],'longRU':True,'result':'PASS','geometry':r})
 b.close()
(out/'responsive-v5-results.json').write_text(json.dumps({'version':'core-journey-studio-lowfi-v5','result':'PASS','checks':rows,'method':'Actual Chrome continuous resize / DPR1 / CSS viewport100%; phone ordinary scroll.'},indent=2)+'\n',encoding='utf-8')
print('PASS10 responsive transitions with external dialogue,24pxgap,aligned fullwidth wave,contained buttons and desktop fit')
