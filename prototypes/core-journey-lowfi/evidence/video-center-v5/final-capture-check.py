from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(390,667,True)]:
  pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);pg.goto('http://127.0.0.1:5178');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  for state in ['normal','capture','candidate','completed']:
   if state=='capture':pg.locator('#record').click();pg.wait_for_timeout(1000)
   if state=='candidate':pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000)
   if state=='completed':
    st=json.loads((Path(__file__).resolve().parents[3]/'core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));st.update(index=2,view='record',locale='ru' if ru else 'en');pg.evaluate('(s)=>localStorage.setItem("dubbed-lowfi-v1",JSON.stringify(s))',st);pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3')
    if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('.lab summary').click()
   pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(220);pg.screenshot(path=str(out/f'final-A5-{w}x{h}-{state}.png'))
   if w>=1248:
    r=pg.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),v=r('.scene'),p=r('.performance'),l=r('.lab'),t=r('.timeline'),h=r('.project-header');return{center:v.x+v.width/2,gap:p.x-v.right,panelRight:p.right,panelBottom:p.bottom,timelineBottom:t.bottom,labRight:l.right,mediaLeft:v.x,headerLeft:h.x}}''');assert abs(r['center']-w/2)<=1 and abs(r['gap']-24)<1 and r['panelRight']<=w-32 and r['panelBottom']<=h+1 and r['timelineBottom']<=h+1 and r['labRight']<=r['mediaLeft'],r
    rows.append({'viewport':[w,h],'state':state,'result':'PASS','bounds':r})
  pg.close()
 b.close()
(out/'final-capture-results.json').write_text(json.dumps({'version':'core-journey-panel-highfi-v5','date':'2026-10-28','result':'PASS','checks':rows,'phone':'390x667 actual normal/capture/candidate/completed captures,ordinary scroll','testChrome':'Collapsed lab moved to empty lower-left space at centered desktop,so it cannot mask panel navigation.'},indent=2)+'\n',encoding='utf-8');print('PASS final A5 four desktop+phone states and measured lab/panel clearance')
