from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
out=Path('prototypes/core-journey-studio/evidence/result-player-v6');errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 for i in range(3):
  page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=9000);page.locator('#next').click()
  if i<2:page.wait_for_function('(n)=>document.querySelector("#position").textContent.includes(n+" / 3")',arg=str(i+2))
 page.wait_for_function('!document.querySelector("#result-player").hidden && !document.querySelector("#result-play").disabled')
 page.wait_for_timeout(300);page.screenshot(path=str(out/'studio-v6-result-1440x900-mydub.png'))
 print('entry',page.locator('#result').evaluate('(v)=>({time:v.currentTime,duration:v.duration,paused:v.paused,src:v.currentSrc})'))
 print('original',page.locator('#result-original').evaluate('(v)=>({duration:v.duration,src:v.currentSrc})'))
 assert page.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0 && !v.controls')
 saved=page.evaluate('localStorage.getItem("dubbed-studio-lowfi-v1")');(out/'completed-fixture-state.json').write_text(saved,encoding='utf-8')
 page.locator('#result-play').click();page.wait_for_timeout(1200);before=page.locator('#result').evaluate('(v)=>v.currentTime');page.locator('#source-original').click();page.wait_for_timeout(250)
 switched=page.locator('#result-original').evaluate('(v)=>({time:v.currentTime,paused:v.paused})');assert not switched['paused'] and abs(switched['time']-before)<.6,switched
 page.locator('#result-play').click();paused=page.locator('#result-original').evaluate('(v)=>v.currentTime');page.locator('#source-dub').click();page.wait_for_timeout(200);assert page.locator('#result').evaluate('(v)=>v.paused');assert abs(page.locator('#result').evaluate('(v)=>v.currentTime')-paused)<.1
 checks.append({'scenario':'real connected three captures to Result; distinct-source playing/paused switch','result':'PASS','originalSwitch':switched})
 for w,h,ru in [(1280,600,False),(1366,650,True),(390,844,False),(390,667,True),(767,700,True),(768,700,False)]:
  context=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if ru else 'no-preference');context.add_init_script('localStorage.setItem("dubbed-studio-lowfi-v1",'+json.dumps(saved)+')');pg=context.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:5179');pg.wait_for_function('!document.querySelector("#result-play").disabled')
  if ru:pg.locator('.lab summary').click();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(150);pg.screenshot(path=str(out/(f'studio-v6-result-{w}x{h}-'+('ru' if ru else 'en')+'.png')))
  bounds=pg.evaluate('''()=>{let p=document.querySelector('#result-player').getBoundingClientRect(),r=document.querySelector('.result-picture').getBoundingClientRect(),b=document.querySelector('.result-bottom').getBoundingClientRect();return {player:{x:p.x,width:p.width,bottom:p.bottom},pictureRatio:r.width/r.height,footerBottom:b.bottom,overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('#result-player button,#result-player input')].map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))}}''')
  assert not bounds['overflow'] and abs(bounds['pictureRatio']-16/9)<.01,bounds
  if w<768:assert all(x['h']>=48 and x['w']>=48 for x in bounds['targets']),bounds
  checks.append({'viewport':[w,h],'ru':ru,'result':'PASS','geometry':bounds});context.close()
 assert not errors,errors
 (out/'initial-browser-results.json').write_text(json.dumps({'version':'core-journey-studio-lowfi-v6','checks':checks,'pageErrors':errors},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS connected journey and first Result browser matrix')
