from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright,expect
variant=sys.argv[1];folder='core-journey-lowfi' if variant=='A' else 'core-journey-studio';port=5178 if variant=='A' else 5179;key='dubbed-lowfi-v1' if variant=='A' else 'dubbed-studio-lowfi-v1';root=Path(__file__).resolve().parents[4];out=root/'prototypes'/folder/'evidence/ab-highfi-v1';checks=[];errors=[]
def scenario(pg,id):pg.locator('.lab summary').click();pg.locator('#'+id).check();pg.locator('.lab summary').click()
def snap(pg,name,top=False):
 if top:pg.evaluate('scrollTo(0,0)')
 pg.wait_for_timeout(220);pg.screenshot(path=str(out/name))
def open_result(pg):pg.locator('#next' if pg.locator('#to-result').is_hidden() else '#to-result').click()
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1440,900,False),(1280,600,True),(390,667,True)]:
  ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference',has_touch=w<768);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(f'http://127.0.0.1:{port}');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  prefix=f'final-{variant}-{w}x{h}';snap(pg,prefix+'-normal.png',True)
  pg.locator('#record').click();pg.wait_for_timeout(1000);snap(pg,prefix+'-capture.png');pg.wait_for_function('!document.querySelector("#take").disabled',timeout=9000);pg.wait_for_timeout(240)
  if w>=768:assert pg.locator('.performance').bounding_box()['y']+pg.locator('.performance').bounding_box()['height']<=h+1,pg.locator('.performance').bounding_box()
  snap(pg,prefix+'-candidate.png',w>=768)
  if w<768:pg.locator('#next').scroll_into_view_if_needed();snap(pg,prefix+'-candidate-controls.png')
  pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');pg.locator('#previous').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("1 / 3")');snap(pg,prefix+'-accepted.png',w>=768)
  # Current presentation fixtures use an actually operated prior complete set;not operation proof or service data.
  state=json.loads((root/'prototypes/core-journey-studio/evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));state.update(index=2,view='record',locale='ru' if ru else 'en');pg.evaluate('(d)=>localStorage.setItem(d.key,JSON.stringify(d.state))',{'key':key,'state':state});pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3')
  if ru:scenario(pg,'long-line')
  snap(pg,prefix+'-completed.png',True);open_result(pg);pg.wait_for_timeout(250);snap(pg,prefix+'-assembly.png',True);pg.wait_for_function('!document.querySelector("#result-player").hidden');snap(pg,prefix+'-result-mydub.png',True)
  assert pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0');pg.locator('#result-play').click();pg.wait_for_timeout(650);position=pg.locator('#result').evaluate('(v)=>v.currentTime');pg.locator('#source-original').click();pg.wait_for_timeout(160);assert pg.locator('#result-original').evaluate('(v)=>!v.paused');pg.locator('#result-play').click();snap(pg,prefix+'-result-original.png',True)
  if w>=768:assert pg.locator('.result-bottom').bounding_box()['y']+pg.locator('.result-bottom').bounding_box()['height']<=h+1
  pg.locator('#return').click();scenario(pg,'fail-assembly');open_result(pg);pg.wait_for_function('!document.querySelector("#retry-assembly").hidden');snap(pg,prefix+'-assembly-error.png',True);pg.locator('#retry-assembly').click();pg.wait_for_function('!document.querySelector("#result-player").hidden');pg.locator('#return').click();pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")')
  pg.locator('#record').click();pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);pg.wait_for_timeout(200);pg.locator('#previous').click();snap(pg,prefix+'-guard.png');pg.locator('#guard [value=stay]').click();scenario(pg,'fail-save');pg.locator('#previous').click();pg.locator('#guard [value=save]').click();pg.wait_for_function('document.querySelector("#next").textContent.includes('+json.dumps('Повторить' if ru else 'Retry')+')');snap(pg,prefix+'-save-error.png');pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("1 / 3")');scenario(pg,'fail-mic');pg.locator('#record').click();pg.wait_for_timeout(100);snap(pg,prefix+'-mic-error.png')
  data=pg.evaluate('''()=>({dialogueFont:getComputedStyle(document.querySelector('#dialogue')).font,volumeHeight:document.querySelector('#volume').getBoundingClientRect().height,bodyFont:getComputedStyle(document.body).fontFamily,notice:getComputedStyle(document.querySelector('#feedback')).backgroundColor,mainBorder:getComputedStyle(document.querySelector('main')).borderTopWidth})''');assert 'Mabry' in data['dialogueFont'] and data['notice']=='rgb(32, 32, 32)';assert not pg.locator('#feedback button,#assembly button,.wave-key,#speaker,#panel-speaker').count()
  if w<768:assert data['volumeHeight']>=48
  checks.append({'variant':variant,'viewport':[w,h],'locale':'ru' if ru else 'en','result':'PASS','advancingSourceSwitchPosition':position,'styles':data,'frames':['normal','capture','candidate','accepted','completed','assembly','result-mydub','result-original','assembly-error','guard','save-error','mic-error']});ctx.close()
 assert not errors,errors
 (out/'final-visual-results.json').write_text(json.dumps({'variant':variant,'date':'2026-10-27','result':'PASS','checks':checks,'pageErrors':errors,'method':'Actual Chrome100% DPR1;complete fixed-window input simulation and explicit actions;settled states220ms;current complete-set fixture used only for presentation,not operation proof.','limits':'No real microphone/backend/render;actual full connected/candidate/reload safety proof is in journey-results.json.'},indent=2)+'\n',encoding='utf-8');b.close()
print('PASS',variant,'settled high-fi normal/capture/candidate/accepted/completed/Result/guard/recovery views')
