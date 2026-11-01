from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1280,600,False),(390,667,True)]:
  ctx=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce' if ru else 'no-preference');pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:5179');pg.wait_for_function('document.querySelector("#scene").readyState>=3')
  if ru:pg.locator('.lab summary').click();pg.locator('#locale').select_option('ru');pg.locator('#long-line').check();pg.locator('.lab summary').click()
  geometry=pg.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),s=r('.scene'),d=r('.script'),w=r('.wave'),t=r('.timeline'),c=r('.studio-controls'),m=getComputedStyle(document.querySelector('main'));return {sceneWidth:s.width,scriptTop:d.top,sceneBottom:s.bottom,waveWidth:w.width,gap:c.top-t.bottom,border:m.borderTopWidth,background:m.backgroundColor}}''');assert geometry['gap']>=24 and geometry['scriptTop']>=geometry['sceneBottom'] and abs(geometry['sceneWidth']-geometry['waveWidth'])<1 and geometry['border']=='0px',geometry
  assert not pg.locator('.wave-key,#speaker,#panel-speaker').count()
  pg.locator('#replay').click();pg.wait_for_timeout(200);pg.locator('#pause').click();pos=pg.locator('#scene').evaluate('(v)=>v.currentTime');pg.wait_for_timeout(100);assert pg.locator('#scene').evaluate('(v)=>v.paused');pg.locator('#pause').click();pg.wait_for_timeout(120);assert pg.locator('#scene').evaluate('(v)=>!v.paused && v.currentTime>'+str(pos))
  pg.locator('#record').click();assert pg.locator('#scrub').is_disabled();position=pg.locator('#scene').evaluate('(v)=>v.currentTime');pg.locator('#scrub').dispatch_event('input');assert pg.locator('#scene').evaluate('(v)=>v.currentTime')<position+.3
  pg.wait_for_function('!document.querySelector("#take").disabled',timeout=9000);pg.locator('#take').click();pg.wait_for_timeout(150);assert not pg.locator('#take-audio').evaluate('(a)=>a.paused');pg.locator('#next').click();pg.wait_for_function('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).index===1');pg.locator('#previous').click();pg.wait_for_function('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).index===0')
  old=pg.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).accepted[0]');pg.locator('#record').click();pg.wait_for_function('!document.querySelector("#take").disabled',timeout=9000);candidate=pg.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).candidates[0]');assert candidate,pg.evaluate('localStorage.getItem("dubbed-studio-lowfi-v1")')
  pg.locator('.lab summary').click();pg.locator('#fail-save').check();pg.locator('.lab summary').click();pg.locator('#exit').click();pg.locator('#guard [value=save]').click();pg.wait_for_function('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1")).failureDestination==="My projects"');pg.wait_for_timeout(8600)
  st=pg.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1"))');assert st['accepted'][0]==old and st['candidates'][0]==candidate and st['failureDestination']=='My projects';assert pg.locator('#feedback').is_hidden();expect(pg.locator('#next')).to_be_enabled();pg.screenshot(path=str(out/f'studio-v6-record-recovery-{w}x{h}.png'))
  pg.locator('#next').click();expect(pg.locator('#destination')).to_be_visible();st=pg.evaluate('JSON.parse(localStorage.getItem("dubbed-studio-lowfi-v1"))');assert st['accepted'][0]==candidate and st['candidates'][0] is None and st['index']==0
  checks.append({'viewport':[w,h],'locale':'ru' if ru else 'en','result':'PASS','geometry':geometry,'retainedOldAccepted':old,'exactRetriedCandidate':candidate,'intent':'My projects'});ctx.close()
 assert not errors,errors
 (out/'record-regression-results.json').write_text(json.dumps({'version':'core-journey-studio-lowfi-v6','result':'PASS','checks':checks,'pageErrors':errors,'scope':'Bounded Record v5 presentation/listening/capture-seek-lock/acceptance/rerecord/8s-failed-save-retained-intent regression'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS bounded desktop/short-RU-phone Record transport,layout and retained-save recovery')
