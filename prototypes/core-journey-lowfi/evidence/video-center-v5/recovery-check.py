from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright,expect
variant=sys.argv[1];port=5178 if variant=='A' else 5179;folder='core-journey-lowfi' if variant=='A' else 'core-journey-studio';key='dubbed-lowfi-v1' if variant=='A' else 'dubbed-studio-lowfi-v1';version='core-journey-panel-highfi-v5' if variant=='A' else 'core-journey-studio-highfi-v1';root=Path(__file__).resolve().parents[4];out=root/'prototypes'/folder/'evidence/video-center-v5';checks=[];errors=[]
read=lambda pg:pg.evaluate('JSON.parse(localStorage.getItem('+json.dumps(key)+'))')
def scenario(pg,id):
 pg.locator('.lab summary').click();pg.locator('#'+id).check();pg.locator('.lab summary').click()
def leave(pg):pg.locator('#exit' if variant=='B' else '[data-destination="My projects"]').click()
def open_result(pg):pg.locator('#next' if pg.locator('#to-result').is_hidden() else '#to-result').click()
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 for w,h,ru in [(1280,600,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if w<768 else 'no-preference',has_touch=w<768);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(f'http://127.0.0.1:{port}');pg.wait_for_function('document.querySelector("#scene").readyState>=3');pg.evaluate('document.fonts.ready')
  if ru:pg.locator('.lab summary').click();pg.locator('#long-line').check();pg.locator('#locale').select_option('ru');pg.locator('.lab summary').click()
  prefix=f'ab-{variant}-{w}x{h}';pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/(prefix+'-normal.png')))
  geo=pg.evaluate('''()=>{const r=s=>{let a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,bottom:a.bottom}},s=r('.scene'),w=r('.wave'),m=getComputedStyle(document.querySelector('main'));return{scene:s,wave:w,timeline:r('.timeline'),panel:r('.performance'),script:r('.script'),overflow:document.documentElement.scrollWidth>innerWidth,mainBorder:m.borderTopWidth,mainShadow:m.boxShadow,mainBackground:m.backgroundColor,scriptParent:document.querySelector('.script').parentElement.id||document.querySelector('.script').parentElement.className}}''')
  assert not geo['overflow'] and abs(geo['scene']['w']/geo['scene']['h']-16/9)<.01 and abs(geo['scene']['w']-geo['wave']['w'])<1,geo
  assert not pg.locator('.wave-key,#speaker,#panel-speaker').count()
  if w>=768:assert geo['scene']['w']>=576 and geo['timeline']['bottom']<=h+1 and geo['panel']['bottom']<=h+1,geo
  if variant=='B':assert geo['mainBorder']=='0px' and geo['mainShadow']=='none' and geo['mainBackground']=='rgba(0, 0, 0, 0)' and geo['script']['y']>=geo['scene']['bottom'],geo
  if variant=='A' and w>=768 and h<760:assert geo['scriptParent']=='compact-script-slot',geo
  # Listen/pause/resume and held keyboard seek,then immediate fixed-window captures.
  pg.locator('#replay').click();pg.wait_for_timeout(180);pg.locator('#pause').click();paused=pg.locator('#scene').evaluate('(v)=>v.currentTime');pg.wait_for_timeout(100);assert pg.locator('#scene').evaluate('(v)=>v.paused');pg.locator('#pause').click();pg.wait_for_timeout(120);assert pg.locator('#scene').evaluate('(v)=>!v.paused && v.currentTime>'+str(paused))
  pg.locator('#scrub').focus();pg.keyboard.down('ArrowRight');assert pg.locator('#scene').evaluate('(v)=>v.paused');pg.keyboard.up('ArrowRight');pg.wait_for_timeout(150);assert pg.locator('#scene').evaluate('(v)=>!v.paused')
  accepted=[]
  for i in range(3):
   pg.locator('#record').click();expect(pg.locator('#capture-badge')).to_be_visible();assert pg.locator('#scrub').is_disabled() and pg.locator('#pause').is_hidden();start=pg.locator('#scene').evaluate('(v)=>v.currentTime');pg.locator('#scrub').dispatch_event('keydown',{'key':'End'});pg.locator('#scrub').dispatch_event('input');assert pg.locator('#scene').evaluate('(v)=>v.currentTime')<start+.4
   if i==0:
    pg.wait_for_timeout(1100);ratio=float(pg.locator('.wave').get_attribute('data-overlay-progress'));assert .1<ratio<.8;pg.screenshot(path=str(out/(prefix+'-capture.png')))
   pg.wait_for_function('!document.querySelector("#take").disabled',timeout=9000);assert float(pg.locator('.wave').get_attribute('data-overlay-progress'))==1;pg.wait_for_timeout(200);candidate=read(pg)['candidates'][i];assert candidate
   if i==0:
    pg.screenshot(path=str(out/(prefix+'-candidate.png')));pg.locator('#take').click();pg.wait_for_timeout(200);assert pg.locator('#scene').evaluate('(v)=>!v.paused && v.muted') and not pg.locator('#take-audio').evaluate('(a)=>a.paused');assert read(pg)['candidates'][i]==candidate;pg.locator('#replay').click();pg.wait_for_timeout(100);assert pg.locator('#scene').evaluate('(v)=>!v.paused && !v.muted')
   if i==2 and w<768:
    scenario(pg,'fail-save');leave(pg);expect(pg.locator('#guard')).to_be_visible();pg.locator('#guard [value=save]').click();pg.wait_for_function('document.querySelector("#next").textContent.includes("Повторить")');st=read(pg);assert st['failureDestination']=='My projects' and st['candidates'][2]==candidate and st['accepted'][2] is None;pg.locator('#next').click();expect(pg.locator('#destination')).to_be_visible();st=read(pg);assert st['completed'] and st['view']=='record' and st['accepted'][2]==candidate;pg.locator('#destination-close').click();pg.screenshot(path=str(out/(prefix+'-completed-record.png')));open_result(pg)
   else:
    pg.locator('#next').click()
    if i<2:pg.wait_for_function('(n)=>document.querySelector("#position").textContent.includes(n+" / 3")',arg=str(i+2));assert read(pg)['accepted'][i]==candidate
  pg.wait_for_function('!document.querySelector("#result-player").hidden && !document.querySelector("#result-play").disabled');st=read(pg);assert all(st['accepted']) and st['completed'];allAccepted=st['accepted'];assert pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0');pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/(prefix+'-result.png')))
  # Rerecord accepted line2;blocked capture and guarded saves cannot lose either take.
  pg.locator('#return').click();pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("2 / 3")');old=read(pg)['accepted'][1];pg.locator('#record').click();pg.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);replacement=read(pg)['candidates'][1];assert replacement!=old
  scenario(pg,'fail-mic');pg.locator('#record').click();pg.wait_for_timeout(250);assert read(pg)['candidates'][1]==replacement and read(pg)['accepted'][1]==old and pg.locator('#capture-badge').is_hidden();pg.screenshot(path=str(out/(prefix+'-microphone.png')));pg.locator('#open-settings').click();expect(pg.locator('#guard')).to_be_visible();pg.locator('#guard [value=stay]').click();assert read(pg)['candidates'][1]==replacement
  pg.locator('#previous').click();pg.locator('#guard [value=stay]').click();assert read(pg)['index']==1 and read(pg)['candidates'][1]==replacement
  scenario(pg,'fail-save');pg.locator('#previous').click();pg.locator('#guard [value=save]').click();pg.wait_for_function('document.querySelector("#next").textContent.includes('+json.dumps('Повторить' if ru else 'Retry')+')');assert pg.locator('#next').evaluate('(e)=>document.activeElement===e');pg.wait_for_timeout(300);pg.screenshot(path=str(out/(prefix+'-save-failure.png')));focus=pg.evaluate('document.activeElement.id');scroll=pg.evaluate('scrollY');before=read(pg);pg.wait_for_timeout(8400);assert pg.locator('#feedback').is_hidden();after=read(pg);assert after['candidates']==before['candidates'] and after['accepted']==before['accepted'] and after['failureDestination']=='previous';assert pg.evaluate('document.activeElement.id')==focus and abs(pg.evaluate('scrollY')-scroll)<1;pg.screenshot(path=str(out/(prefix+'-save-expired.png')))
  pg.reload();pg.wait_for_function('document.querySelector("#scene").readyState>=3');assert pg.locator('#feedback').is_hidden() and read(pg)['candidates'][1]==replacement;pg.locator('#next').click();pg.wait_for_function('document.querySelector("#position").textContent.includes("1 / 3")');assert read(pg)['accepted'][1]==replacement and read(pg)['candidates'][1] is None
  # Assembly failure/reload/retry is explicit technical recovery,not repeat preparation.
  protected=read(pg)['accepted'];scenario(pg,'fail-assembly');open_result(pg);pg.wait_for_function('document.querySelector("#retry-assembly").hidden===false');assert pg.locator('#result-player').is_hidden() and pg.locator('#download').is_hidden() and read(pg)['accepted']==protected;assert pg.locator('#assembly button').count()==0;pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/(prefix+'-assembly-failure.png')))
  pg.reload();pg.wait_for_function('document.querySelector("#retry-assembly").hidden===false');assert read(pg)['accepted']==protected;pg.locator('#retry-assembly').click();pg.wait_for_function('!document.querySelector("#result-player").hidden');assert read(pg)['accepted']==protected and pg.locator('#result').evaluate('(v)=>v.paused && v.currentTime==0');pg.locator('#return').click();assert read(pg)['accepted']==protected
  # A/B same completed and retained-record affordance,after actual recovery.
  pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/(prefix+'-accepted.png')))
  checks.append({'variant':variant,'viewport':[w,h],'locale':'ru' if ru else 'en','longRU':ru,'result':'PASS','layout':geo,'overlayMidCapture':ratio,'initialFinalGapExplicitLeave':w<768,'replacementOld':old,'replacementRetried':replacement,'failedSaveDestination':'previous','focusAfterFailure':focus,'timedExpiryStableFocusScroll':True,'acceptedRetainedAcrossAssemblyFailureAndReload':True});ctx.close()
 assert not errors,errors
 report={'version':version,'variant':variant,'date':'2026-10-27','browser':browser.version,'result':'PASS','checks':checks,'pageErrors':errors,'limits':'Full-window fixture playback/capture envelope,synthetic takes and simulated saves/assembly. No microphone/backend/immutable-generation/concurrency/device proof.'};(out/'journey-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');browser.close()
print('PASS',variant,'connected3takes,layout/overlay,Record transport/capture lock,guarded candidate safety,8s expiry,reload retry,explicit completion leave and assembly recovery')
