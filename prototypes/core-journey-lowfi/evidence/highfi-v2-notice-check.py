import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).parent;checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1400,'height':1100});assert page.goto('http://127.0.0.1:5178/calibration.html').status==200;page.evaluate('document.fonts.ready')
 css=page.locator('#notice-sample').evaluate('''e=>{let c=getComputedStyle(e),t=getComputedStyle(e.querySelector('.hf-notice-title')),p=getComputedStyle(e.querySelector('.hf-notice-copy'));return{background:c.backgroundColor,radius:c.borderRadius,shadow:c.boxShadow,title:[t.fontSize,t.lineHeight,t.fontWeight],body:[p.fontSize,p.lineHeight,p.color]}}''')
 assert css['background']=='rgb(255, 255, 255)' and css['radius']=='10px' and css['title']==['15px','24px','500'] and css['body'][:2]==['14px','20px'];assert page.locator('#notice-sample button,#notice-sample a').count()==0
 checks.append({'scenario':'Actual current shared NOT derivative: white/radius10/source shadow/title15/24/500/body14/20/no nested actions','result':'PASS','computed':css});page.close()
 for lang in ['en','ru']:
  c=b.new_context(viewport={'width':390,'height':667},device_scale_factor=1,reduced_motion='reduce');page=c.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#locale').select_option(lang);page.locator('#long-line').set_checked(lang=='ru');page.locator('.lab summary').click();page.locator('#record').click();page.wait_for_function('!document.querySelector("#take").disabled',timeout=10000)
  candidate=page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id');page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-save').check();page.locator('.lab summary').click();page.locator('#next').click();expect(page.locator('#feedback')).to_be_visible();expect(page.locator('#feedback-copy')).to_have_text('Your take is kept in this browser.' if lang=='en' else '\u0412\u0430\u0448 \u0434\u0443\u0431\u043b\u044c \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.')
  assert page.evaluate('document.activeElement.id')=='next';page.screenshot(path=str(root/f'hf2-first-save-390x667-{lang}.png'))
  for key,val in [('role','status'),('aria-live','polite'),('aria-atomic','true')]:assert page.locator('#feedback').get_attribute(key)==val
  page.keyboard.press('Shift+Tab');page.keyboard.press('Tab');assert page.evaluate('document.activeElement.id')=='next'
  targets=page.locator('.global,main').evaluate_all('''roots=>roots.flatMap(root=>[...root.querySelectorAll('button,a,input')].filter(e=>e.getClientRects().length).map(e=>({id:e.id||e.className,h:e.getBoundingClientRect().height})))''');assert all(t['h']>=48 for t in targets),targets
  assert page.locator('#feedback button,#feedback a').count()==0
  page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();expect(page.locator('#open-settings')).to_be_visible();page.locator('#take').click();page.wait_for_function('!document.querySelector("#take-audio").paused');page.locator('#pause').click();expect(page.locator('#feedback')).to_be_visible();assert page.evaluate('JSON.parse(localStorage.getItem("dubbed-lowfi-v1")).candidates[0].id')==candidate
  g=page.evaluate('''()=>{let n=document.querySelector('#feedback').getBoundingClientRect();return Object.fromEntries(['.scene','#dialogue'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return[s,[r.top,r.bottom,n.top]]}))}''')
  for bounds in g.values():assert bounds[0]>=0 and bounds[1]<=bounds[2]-12,g
  page.screenshot(path=str(root/f'hf2-persistent-audition-390x667-{lang}.png'))
  checks.append({'scenario':lang+' first-save copy, focus/Tab/48px product targets, live semantics and useful scene/dialogue during audition with persistent mic notice','result':'PASS','auditionBounds':g,'targets':targets});c.close()
 b.close()
(root/'highfi-v2-notice-results.json').write_text(json.dumps({'version':'core-journey-highfi-v2','date':'2026-10-27','checks':checks,'limit':'live DOM/focus verified; actual screen-reader speech and real safe-area hardware untested'},indent=2),encoding='utf8')
print('PASS: current NOT recipe, first-save EN/RU copy, phone focus/targets/live semantics and persistent audition context')
