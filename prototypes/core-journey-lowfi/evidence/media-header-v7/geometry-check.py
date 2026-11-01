from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;rows=[];errors=[]
sizes=[(1440,900),(1920,910),(1280,600),(1366,650),(1247,700),(1248,700),(1023,700),(1024,700),(390,667)]
def scenario(pg,id):
 pg.locator('.lab summary').click();pg.locator('#'+id).check();pg.locator('.lab summary').click()
def bounds(pg):return pg.evaluate('''()=>{let r=s=>{let b=document.querySelector(s).getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}};let d=r('#dialogue'),wave=r('.wave');return {scene:r('.scene'),panel:r('.performance'),timeline:r('.timeline'),script:r('.script'),header:r('.project-header')||null,exit:r('#exit'),title:r('#heading'),dots:r('#dots'),dialogue:d,wave,gap:wave.y-d.bottom,dotCount:document.querySelectorAll('#dots span').length,currentDot:[...document.querySelectorAll('#dots span')].findIndex(e=>e.getAttribute('aria-current')==='true'),interactiveDots:document.querySelectorAll('#dots button,#dots a,#dots [tabindex]').length,overflow:document.documentElement.scrollWidth>innerWidth}}''')
def validate(r,w,h):
 assert not r['overflow'] and abs(r['scene']['x']+r['scene']['w']/2-w/2)<=1,r
 assert abs(r['timeline']['x']-r['scene']['x'])<1 and abs(r['timeline']['w']-r['scene']['w'])<1,r
 assert abs(r['exit']['x']-r['scene']['x'])<1 and abs(r['header']['x']-r['scene']['x'])<1,r
 assert abs(r['title']['x']+r['title']['w']/2-w/2)<=1 and abs(r['dots']['x']+r['dots']['w']/2-w/2)<=1,r
 assert r['script']['y']>=r['scene']['bottom']-.1 and r['dotCount']==3 and not r['interactiveDots'],r
 assert r['dots']['y']>=r['title']['bottom'] and r['scene']['y']>r['dots']['bottom'],r
 if w>=1248:
  assert abs(r['panel']['x']-r['scene']['right']-24)<1 and r['panel']['right']<=w-31 and r['scene']['w']>=576,r
  assert r['timeline']['bottom']<=h+1 and r['panel']['bottom']<=h+1,r
 else:assert r['panel']['y']>=r['timeline']['bottom']-1,r
 if w<768:assert r['exit']['h']>=48 and r['exit']['bottom']<=r['title']['y'],r
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h in sizes:
  comparisons=[]
  for long in [False,True]:
   # Frozen B is only read/operated in an isolated browser context;no file mutations.
   pb=b.new_page(viewport={'width':w,'height':h});pb.goto('http://127.0.0.1:5179');pb.evaluate('document.fonts.ready')
   if long:scenario(pb,'long-line')
   bm=pb.evaluate('''()=>{let d=document.querySelector('#dialogue').getBoundingClientRect(),w=document.querySelector('.wave').getBoundingClientRect(),t=document.querySelector('#heading').getBoundingClientRect(),dots=document.querySelector('#dots').getBoundingClientRect();return {waveHeight:w.height,gap:w.y-d.bottom,titleY:t.y,dotsY:dots.y}}''');pb.close()
   pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference');pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:5178');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
   if long:scenario(pg,'long-line');pg.locator('.lab summary').click();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
   pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);r=bounds(pg);validate(r,w,h)
   assert abs(r['wave']['h']-bm['waveHeight'])<.1 and abs(r['gap']-bm['gap'])<.1,(w,h,long,r,bm)
   assert abs(r['title']['y']-bm['titleY'])<.1 and abs(r['dots']['y']-bm['dotsY'])<.1,(w,h,r,bm)
   comparisons.append({'longRU':long,'A':r,'B':bm,'matchedWaveHeightAndTrueTextToWaveGap':True})
   if not long:pg.close();continue
   pg.screenshot(path=str(out/f'A7-{w}x{h}-normal.png'));assert r['currentDot']==0
   pg.keyboard.press('Tab');pg.locator('#exit').focus();assert pg.locator('#exit').evaluate('(e)=>getComputedStyle(e).outlineStyle')!='none'
   pg.locator('#record').click();pg.wait_for_timeout(1000);assert pg.locator('#scrub').is_disabled() and pg.locator('#exit').is_disabled();pg.evaluate('scrollTo(0,0)');capture=bounds(pg);validate(capture,w,h);pg.screenshot(path=str(out/f'A7-{w}x{h}-capture.png'));pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);pg.wait_for_timeout(180);pg.evaluate('scrollTo(0,0)');candidate=bounds(pg);validate(candidate,w,h);pg.screenshot(path=str(out/f'A7-{w}x{h}-candidate.png'))
   pg.locator('#take').click();pg.wait_for_timeout(100);pg.locator('#pause').click();assert pg.locator('#scene').evaluate('(v)=>v.paused');pg.locator('#pause').click();assert pg.locator('#scene').evaluate('(v)=>!v.paused')
   scenario(pg,'fail-save');pg.locator('#next').click();pg.wait_for_function('document.querySelector("#next").textContent.includes("Повторить")');assert bounds(pg)['currentDot']==0;retained=pg.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0]');pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');assert bounds(pg)['currentDot']==1 and pg.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted[0]')==retained
   pg.locator('#previous').click();assert bounds(pg)['currentDot']==0
   fixture=Path.cwd()/'prototypes/core-journey-studio/evidence/result-player-v6/completed-fixture-state.json';state=json.loads(fixture.read_text(encoding='utf-8'));state.update(index=2,view='record',locale='ru');pg.evaluate('(s)=>localStorage.setItem("dubbed-lowfi-v1",JSON.stringify(s))',state);pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3');scenario(pg,'long-line');pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);complete=bounds(pg);validate(complete,w,h);assert complete['currentDot']==2;pg.screenshot(path=str(out/f'A7-{w}x{h}-completed.png'))
   pg.locator('#next').click();pg.wait_for_function('!document.querySelector("#result-player").hidden && !document.querySelector("#result-play").disabled');pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/f'A7-{w}x{h}-result.png'));assert pg.locator('#dots').is_hidden() and pg.locator('#exit').is_visible();assert pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0');pg.locator('#return').click();assert bounds(pg)['currentDot']==0;assert pg.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).accepted')==state['accepted'];pg.close()
  rows.append({'viewport':[w,h],'result':'PASS','comparison':comparisons,'capture':capture,'candidate':candidate,'completed':complete,'failedNextRetainsCurrentDotAndCandidate':True,'retryThenPreviousProgress':True,'resultReturnRetainsAccepted':True})
 assert not errors,errors
 (out/'browser-results.json').write_text(json.dumps({'version':'core-journey-panel-highfi-v7','date':'2026-10-28','browser':b.version,'result':'PASS','checks':rows,'pageErrors':errors,'method':'Actual Chrome/DPR1/100%,18 A/B matched viewport/content measurements;9 operated capture/audition/fail-save/progress/Result cohorts;completed layout fixture distinct from captured candidate.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS9 operated A7 cohorts and18 measured A/B header/wave/true-gap comparisons')
