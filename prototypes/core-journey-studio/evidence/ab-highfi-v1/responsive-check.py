from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
variant=sys.argv[1];folder='core-journey-lowfi' if variant=='A' else 'core-journey-studio';port=5178 if variant=='A' else 5179;key='dubbed-lowfi-v1' if variant=='A' else 'dubbed-studio-lowfi-v1';root=Path(__file__).resolve().parents[4];out=root/'prototypes'/folder/'evidence/ab-highfi-v1';rows=[];errors=[]
viewports=[(1920,910),(1440,900),(1366,650),(1280,600),(1280,699),(1280,700),(1280,701),(1440,759),(1440,760),(1440,761),(1023,700),(1024,700),(767,700),(768,700),(390,844),(390,667),(720,450)]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);ctx=b.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,reduced_motion='reduce');pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(f'http://127.0.0.1:{port}');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready');pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
 for w,h in viewports:
  pg.set_viewport_size({'width':w,'height':h});pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(150)
  r=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};return{scene:r('.scene'),wave:r('.wave'),script:r('.script'),timeline:r('.timeline'),panel:r('.performance'),sourceFit:getComputedStyle(document.querySelector('#scene')).objectFit,volume:r('#volume'),overflow:document.documentElement.scrollWidth>innerWidth,scriptParent:document.querySelector('.script').parentElement.id||document.querySelector('.script').parentElement.className,actionGap:document.querySelector('.studio-controls')?r('.studio-controls').y-r('.timeline').bottom:null}}''')
  assert not r['overflow'] and r['sourceFit']=='contain' and abs(r['scene']['w']/r['scene']['h']-16/9)<.01 and abs(r['scene']['x']-r['wave']['x'])<1 and abs(r['scene']['w']-r['wave']['w'])<1,r
  assert r['script']['x']>=r['scene']['right']-1 or r['script']['y']>=r['scene']['bottom']-1,r
  if w>=1280:assert r['scene']['w']>=576 and max(r['timeline']['bottom'],r['panel']['bottom'])<=h+1,r
  if variant=='A' and 768<=w<1024:assert r['scene']['w']>=w-64 and r['scriptParent']=='rehearsal',r
  if variant=='B':assert r['actionGap']>=24 and (w<768 or r['scene']['w']>=576),r
  if w<768:
   assert r['volume']['h']>=48,r
   if variant=='A':assert pg.locator('[data-destination="My projects"]').is_visible();assert pg.get_by_role('button',name='Настройки',exact=True).count()==1
  if (w,h) in [(1920,910),(1366,650),(768,700),(1024,700),(390,667),(720,450)]:pg.screenshot(path=str(out/f'ab-{variant}-layout-{w}x{h}-ru.png'))
  rows.append({'variant':variant,'view':'record','viewport':[w,h],'locale':'ru-long','result':'PASS','geometry':r})
 # Result resize starts from an actually operated prior completed fixture;accepted source assets unchanged.
 state=json.loads((root/'prototypes/core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));state['locale']='ru';state['view']='result';pg.evaluate('(data)=>localStorage.setItem(data.key,JSON.stringify(data.state))',{'key':key,'state':state});pg.reload();pg.wait_for_function('!document.querySelector("#result-play").disabled');pg.evaluate('document.fonts.ready')
 for w,h in [(1920,910),(1440,900),(1366,650),(1280,600),(1023,700),(1024,700),(767,700),(768,700),(390,667),(720,450)]:
  pg.set_viewport_size({'width':w,'height':h});pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(150);r=pg.evaluate('''()=>{let r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom}};return{picture:r('.result-picture'),player:r('#result-player'),footer:r('.result-bottom'),overflow:document.documentElement.scrollWidth>innerWidth,sourcePaused:document.querySelector('#result').paused}}''');assert not r['overflow'] and r['sourcePaused'] and abs(r['picture']['w']/r['picture']['h']-16/9)<.01,r
  if w>=1280:assert r['footer']['bottom']<=h+1,r
  if (w,h) in [(1440,900),(1280,600),(390,667),(768,700)]:pg.screenshot(path=str(out/f'ab-{variant}-result-layout-{w}x{h}-ru.png'))
  rows.append({'variant':variant,'view':'result','viewport':[w,h],'locale':'ru','result':'PASS','geometry':r})
 assert not errors,errors
 (out/'responsive-results.json').write_text(json.dumps({'variant':variant,'result':'PASS','checks':rows,'pageErrors':errors,'method':'Actual Chrome continuous resize at100% DPR1;RU long dialogue;720x450 is CSS reflow equivalent,not browser UI zoom. Narrow phone/tablet may scroll.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS',variant,'27 actual Record/Result responsive transitions')
