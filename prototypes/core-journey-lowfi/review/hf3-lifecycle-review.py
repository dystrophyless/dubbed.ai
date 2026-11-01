import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(__file__).parent;root=out.parent;m=json.loads((root/'evidence/version.json').read_text());assert m['version']=='core-journey-highfi-v3';checks=[]
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in m['sha256'].items()}
def note(n,d):checks.append({'check':n,'observed':d});(out/'hf3-lifecycle-review.json').write_text(json.dumps(checks,indent=2,ensure_ascii=False),encoding='utf-8');print(n,str(d)[:220],flush=True)
def snap(page,n):page.screenshot(path=str(out/(n+'.png')))
def state(page):return page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1"))')
def opt(page,id,v=True):
 page.locator('.lab summary').click()
 if id=='#locale':page.locator(id).select_option(v)
 else:page.locator(id).set_checked(v)
 page.locator('.lab summary').click()
def cap(page):page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();assert page.locator('#pause').is_hidden() and page.locator('#scrub').is_disabled();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
def pos(page,n):expect(page.locator('#position')).to_contain_text(str(n))
def snapshot(page):return page.evaluate('({scroll:scrollY,focus:document.activeElement.id,helper:document.querySelector("#take-help").innerText,phase:document.querySelector("#feedback").dataset.phase,hidden:document.querySelector("#feedback").hidden})')
def monitor(page):page.evaluate('''()=>{window.reviewFrames=[];window.reviewTrack=true;const tick=()=>{const e=document.querySelector('#feedback'),c=getComputedStyle(e);window.reviewFrames.push({t:performance.now(),hidden:e.hidden,phase:e.dataset.phase,o:+c.opacity,transform:c.transform});if(window.reviewTrack)requestAnimationFrame(tick)};requestAnimationFrame(tick)}''')
def lifecycle(page,label,button,baseline,reduced=False,hover=False,stationary=False):
 monitor(page)
 if stationary:
  page.locator(button).focus();page.mouse.move(page.viewport_size['width']/2,page.viewport_size['height']-45);page.keyboard.press('Enter')
 else:page.locator(button).click()
 expect(page.locator('#feedback')).to_be_visible();assert page.locator('#feedback button,#feedback a').count()==0 and page.locator('#feedback').get_attribute('aria-hidden')=='true';page.wait_for_timeout(35);snap(page,label+'-enter');page.wait_for_function('+getComputedStyle(document.querySelector("#feedback")).opacity>.99');during=snapshot(page);before_data=state(page);notice=page.locator('#feedback').bounding_box();action='#open-settings' if button=='#record' else '#next';ar=page.locator(action).bounding_box();assert ar['y']>=0 and ar['y']+ar['height']<=notice['y']-6,(label,notice,ar);scene=page.locator('.scene').bounding_box();assert abs(scene['width']-baseline['width'])<1 and abs(scene['height']-baseline['height'])<1;note(label+' during',{'state':during,'notice':notice,'action':ar,'scene':scene,'stationaryHover':page.locator('#feedback').evaluate('(e)=>e.matches(":hover")') if stationary else False,'liveRegions':page.locator('[aria-live]').evaluate_all('(es)=>es.map(e=>({id:e.id,role:e.getAttribute("role"),live:e.getAttribute("aria-live"),atomic:e.getAttribute("aria-atomic"),text:e.innerText}))')});snap(page,label+'-during');hover_span=0
 if hover:
  page.mouse.move(notice['x']+notice['width']/2,notice['y']+notice['height']/2);start=page.evaluate('performance.now()');page.wait_for_timeout(8500);assert page.locator('#feedback').is_visible();hover_span=page.evaluate('performance.now()')-start;page.mouse.move(8,8);note(label+' deliberate hover pauses beyond eight seconds',hover_span)
 page.wait_for_function('document.querySelector("#feedback").hidden',timeout=11500);after=snapshot(page);page.evaluate('window.reviewTrack=false');frames=page.evaluate('window.reviewFrames');visible=[f for f in frames if not f['hidden']];first=visible[0]['t'];hidden=next(f['t'] for f in frames if f['hidden'] and f['t']>first);elapsed=hidden-first;partials=[f for f in visible if .001<f['o']<.999];entry=[f for f in partials if f['phase']=='open'];exitf=[f for f in partials if f['phase']=='exit'];assert after['scroll']==during['scroll'] and after['focus']==during['focus'];assert state(page)==before_data;assert after['helper'];assert 7800<elapsed-hover_span<8700
 if reduced:assert not partials
 else:assert len(entry)>0 and len(exitf)>0
 (out/(label+'-frames.json')).write_text(json.dumps(frames),encoding='utf-8');note(label+' real elapsed lifecycle',{'elapsedMs':elapsed,'hoverMs':hover_span,'entryPartialFrames':len(entry),'exitPartialFrames':len(exitf),'entrySample':entry[:2],'exitSample':exitf[:2],'after':after,'stateUnchanged':True});snap(page,label+'-after')
assert all(hashes().values())
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True);note('environment',{'version':m['version'],'browser':browser.version,'os':'Windows','date':'2026-10-27','DPR':1,'zoom':'100%','clock':'actual performance.now/rAF; no fake timers'})
 for w,h,lang,reduced in [(1882,902,'en',False),(1280,600,'ru',False),(390,667,'ru',True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');opt(page,'#locale',lang)
  if lang=='ru':opt(page,'#long-line')
  baseline=page.locator('.scene').bounding_box();prefix=f'hf3-review-{w}x{h}-{lang}';opt(page,'#fail-mic');lifecycle(page,prefix+'-microphone','#record',baseline,reduced,hover=w==1882);assert page.locator('#open-settings').is_visible();assert 'Settings' in page.locator('#take-help').inner_text() or 'настрой' in page.locator('#take-help').inner_text().lower()
  opt(page,'#fail-mic');page.locator('#record').click();expect(page.locator('#feedback')).to_be_visible();page.locator('#replay').click();page.wait_for_timeout(220);expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#open-settings').is_visible();note(prefix+' explicit new mic failure retriggers; listening exits popup only',True);page.locator('#pause').click();page.reload();expect(page.locator('#feedback')).to_be_hidden();expect(page.locator('#open-settings')).to_be_visible();note(prefix+' reload restores durable mic recovery without replay',True)
  if lang=='ru':opt(page,'#long-line')
  cap(page);expect(page.locator('#open-settings')).to_be_hidden()
  if w==390:
   page.locator('#next').click();pos(page,2);cap(page);page.locator('#next').click();pos(page,3);page.locator('#previous').click();pos(page,2);old=state(page)['accepted'][1]['id'];cap(page);candidate=state(page)['candidates'][1]['id'];opt(page,'#fail-save');page.locator('#previous').click();expect(page.locator('#guard')).to_be_visible();lifecycle(page,prefix+'-save','#guard button:last-child',baseline,reduced)
  else:
   candidate=state(page)['candidates'][0]['id'];opt(page,'#fail-save');lifecycle(page,prefix+'-save','#next',baseline,reduced,stationary=w==1882)
  if w==390:assert state(page)['accepted'][1]['id']==old and state(page)['candidates'][1]['id']==candidate;assert 'предыдущ' in page.locator('#take-help').inner_text().lower();note('Previous destination is now named in persistent helper',page.locator('#take-help').inner_text())
  opt(page,'#fail-save');page.locator('#next').click();expect(page.locator('#feedback')).to_be_visible();page.mouse.wheel(0,50);page.wait_for_timeout(220);expect(page.locator('#feedback')).to_be_hidden();assert page.locator('#next').is_visible();page.reload();expect(page.locator('#feedback')).to_be_hidden();note(prefix+' new save failure retriggers; manual scroll and reload do not replay it',snapshot(page));page.locator('#next').click();pos(page,1 if w==390 else 2)
  if w==390:assert state(page)['accepted'][1]['id']==candidate
  note(prefix+' exact save retry resolves after timeout/reload',True);note(prefix+' page errors',errors);assert not errors;ctx.close()
 note('Stable target fingerprints',hashes());assert all(hashes().values());browser.close()
