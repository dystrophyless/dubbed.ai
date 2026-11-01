from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path.cwd();a=root/'prototypes/core-journey-lowfi';out=a/'evidence/focused-exit-v6';rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(1247,700,True),(1248,700,True),(1023,700,True),(1024,700,True),(390,667,True)]:
  pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference');pg.goto('http://127.0.0.1:5178');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(180);pg.screenshot(path=str(out/f'final-A6-{w}x{h}-normal.png'));r=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};return {scene:r('.scene'),panel:r('.performance'),timeline:r('.timeline'),exit:r('#exit'),header:r('.project-header'),overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not r['overflow'] and abs(r['scene']['x']+r['scene']['w']/2-w/2)<1
  if w>=1248:assert abs(r['panel']['x']-r['scene']['right']-24)<1 and r['panel']['right']<=w-32 and r['exit']['right']<r['header']['x'] and r['panel']['bottom']<=h and r['timeline']['bottom']<=h
  else:assert r['exit']['bottom']<=r['header']['y'] and r['exit']['h']>=48
  state=json.loads((root/'prototypes/core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));state.update(view='result',locale='ru' if ru else 'en');pg.evaluate('(s)=>localStorage.setItem("dubbed-lowfi-v1",JSON.stringify(s))',state);pg.reload();pg.wait_for_function('!document.querySelector("#result-play").disabled');pg.evaluate('document.fonts.ready');pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(120);rr=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom,right:a.right}};return {picture:r('.result-picture'),exit:r('#exit'),header:r('.project-header'),footer:r('.result-bottom'),overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not rr['overflow']
  if w>=1248:assert rr['footer']['bottom']<=h and rr['exit']['right']<rr['header']['x']
  else:assert rr['exit']['bottom']<=rr['header']['y']
  if (w,h) in [(1440,900),(1280,600),(390,667),(1024,700)]:pg.screenshot(path=str(out/f'final-A6-{w}x{h}-result.png'))
  rows.append({'viewport':[w,h],'longRU':ru,'result':'PASS','record':r,'resultView':rr});pg.close()
 b.close()
(out/'final-layout-results.json').write_text(json.dumps({'version':'core-journey-panel-highfi-v6','date':'2026-10-28','result':'PASS','checks':rows,'method':'Actual Chrome/100% DPR1;Exit/header nonoverlap,viewport-centered video/rightpanel,complete normal desktop timeline/panel/Result footer,phone48px/normalflow. Result complete-set fixture used only for layout.'},indent=2)+'\n',encoding='utf-8');print('PASS9 final A6 focused Record/Result layout and Exit-clearance cohorts')
