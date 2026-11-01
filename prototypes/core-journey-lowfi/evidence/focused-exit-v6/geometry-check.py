from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;rows=[];errors=[]
def bounds(pg):return pg.evaluate('''()=>{let r=s=>{let b=document.querySelector(s).getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}};return {scene:r('.scene'),panel:r('.performance'),timeline:r('.timeline'),script:r('.script'),header:r('.project-header'),overflow:document.documentElement.scrollWidth>innerWidth}}''')
def validate(r,w,h):
 assert not r['overflow'] and abs(r['scene']['x']+r['scene']['w']/2-w/2)<=1,r
 assert abs(r['timeline']['x']-r['scene']['x'])<1 and abs(r['timeline']['w']-r['scene']['w'])<1,r
 if w>=1248:
  assert abs(r['panel']['x']-r['scene']['right']-24)<1 and r['panel']['right']<=w-31 and r['scene']['w']>=576,r
  assert r['timeline']['bottom']<=h+1 and r['panel']['bottom']<=h+1,r
  assert abs(r['header']['x']-r['scene']['x'])<1 and abs(r['header']['w']-r['scene']['w'])<1,r
 else:assert r['panel']['y']>=r['timeline']['bottom']-1,r
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1920,910,False),(1280,600,True),(1366,650,True),(1247,700,True),(1248,700,True),(1023,700,True),(1024,700,True),(390,667,True)]:
  pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference');pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:5178');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  assert not pg.locator('.global,.brand,#credit-balance,#product nav').count();assert pg.locator('#exit').is_visible();
  pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(180);r=bounds(pg);validate(r,w,h);pg.screenshot(path=str(out/f'focused-v6-{w}x{h}-normal.png'))
  pg.locator('#record').click();pg.wait_for_timeout(1000);assert pg.locator('#scrub').is_disabled();pg.evaluate('scrollTo(0,0)');r2=bounds(pg);validate(r2,w,h);pg.screenshot(path=str(out/f'focused-v6-{w}x{h}-capture.png'));pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);pg.wait_for_timeout(220);pg.evaluate('scrollTo(0,0)');r3=bounds(pg);validate(r3,w,h);pg.screenshot(path=str(out/f'focused-v6-{w}x{h}-candidate.png'))
  pg.locator('#take').click();pg.wait_for_timeout(120);assert pg.locator('#scene').evaluate('(v)=>!v.paused && v.muted');pg.locator('#pause').click();assert pg.locator('#scene').evaluate('(v)=>v.paused');pg.locator('#pause').click();pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');assert pg.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0]')
  state=json.loads((Path(__file__).resolve().parents[3]/'core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));state.update(index=2,view='record',locale='ru' if ru else 'en');pg.evaluate('(s)=>localStorage.setItem("dubbed-lowfi-v1",JSON.stringify(s))',state);pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('.lab summary').click()
  pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(180);r4=bounds(pg);validate(r4,w,h);pg.screenshot(path=str(out/f'focused-v6-{w}x{h}-completed.png'));assert pg.locator('#next').inner_text()==('К результату' if ru else 'To result');pg.locator('#next').click();pg.wait_for_function('!document.querySelector("#result-player").hidden');assert pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0');pg.locator('#return').click();assert pg.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted')==state['accepted']
  rows.append({'viewport':[w,h],'longRU':ru,'result':'PASS','normal':r,'capture':r2,'candidate':r3,'completed':r4});pg.close()
 assert not errors,errors
 (out/'browser-results.json').write_text(json.dumps({'version':'core-journey-panel-highfi-v6','date':'2026-10-28','result':'PASS','checks':rows,'pageErrors':errors,'method':'Actual Chrome/DPR1/100%;fixed-window capture,audition/pause/resume/Next andexplicit completed Result/Return. Completed presentation fixture distinct from operated candidate.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS9 A centered-media viewport cohorts/normal capture candidate completed/nearby transport Result')
