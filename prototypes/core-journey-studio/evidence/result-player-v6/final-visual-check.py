from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;saved=(out/'completed-fixture-state.json').read_text(encoding='utf-8');checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1920,910,False),(1440,900,False),(1280,600,True),(390,667,True),(720,450,False)]:
  ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=w<768,reduced_motion='reduce' if ru else 'no-preference');ctx.add_init_script('localStorage.setItem("dubbed-studio-lowfi-v1",'+json.dumps(saved)+')');pg=ctx.new_page();pg.goto('http://127.0.0.1:5179');pg.wait_for_function('!document.querySelector("#result-play").disabled');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);pg.screenshot(path=str(out/f'studio-v6-final-mydub-{w}x{h}.png'))
  assert pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0')
  pg.locator('#result-play').click();pg.wait_for_timeout(800);position=pg.locator('#result').evaluate('(v)=>v.currentTime');pg.locator('#source-original').click();pg.wait_for_timeout(180);assert pg.locator('#result-original').evaluate('(v)=>!v.paused');assert abs(pg.locator('#result-original').evaluate('(v)=>v.currentTime')-position)<.5
  pg.locator('#result-play').click();pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/f'studio-v6-final-original-{w}x{h}.png'))
  info=pg.evaluate('''()=>{const p=document.querySelector('#result-player').getBoundingClientRect(),f=document.querySelector('.result-bottom').getBoundingClientRect();return {player:[p.x,p.y,p.width,p.height],footerBottom:f.bottom,overflow:document.documentElement.scrollWidth>innerWidth,sourceMotion:getComputedStyle(document.querySelector('#source-original')).transitionDuration,icon:getComputedStyle(document.querySelector('#result-play .hf-icon')).color,font:getComputedStyle(document.querySelector('#source-original')).fontFamily,source:[...document.querySelectorAll('#result-player video')].map(v=>({src:v.currentSrc,duration:v.duration}))}}''')
  assert not info['overflow'] and info['icon']=='rgb(252, 252, 252)' and 'Mabry Pro' in info['font']
  if ru:assert info['sourceMotion']=='0s'
  if w>=768:assert info['footerBottom']<=h,info
  if w<768:
   r=pg.locator('#result-seek').bounding_box();pg.locator('#result-seek').tap(position={'x':r['width']*.4,'y':r['height']/2});pg.wait_for_timeout(250);assert pg.locator('#result-original').evaluate('(v)=>!v.paused && v.currentTime>4 && v.currentTime<7');pg.locator('#result-play').tap()
  if w==1440:
   pg.locator('#result-fullscreen').click();pg.wait_for_function('!!document.fullscreenElement');pg.screenshot(path=str(out/'studio-v6-final-fullscreen.png'));pg.locator('#result-fullscreen').click();pg.wait_for_function('!document.fullscreenElement')
  checks.append({'viewport':[w,h],'locale':'ru' if ru else 'en','result':'PASS','sourceSwitchPosition':position,'geometry':info,'touchRangeTap':w<768,'zoomLimit':'720x450 is CSS reflow equivalent,not browser UI zoom' if w==720 else '100% DPR1'});ctx.close()
 (out/'final-visual-results.json').write_text(json.dumps({'version':'core-journey-studio-lowfi-v6','result':'PASS','checks':checks,'method':'Actual Chrome operation,cropped viewport screenshots; paused Mydub entry,advancing Original switch,paused capture,phone touch range,fullscreen and computed contrast/motion/font checks.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS final visual/source-selected/phone-touch/reduced-motion/fullscreen/reflow matrix')
