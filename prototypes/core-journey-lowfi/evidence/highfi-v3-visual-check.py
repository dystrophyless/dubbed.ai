import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).parent;result={}
def channel(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def lum(c):return sum(channel(v/255)*w for v,w in zip(c,[.2126,.7152,.0722]))
def contrast(a,b):lo,hi=sorted([lum(a),lum(b)]);return (hi+.05)/(lo+.05)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);ctx=b.new_context(viewport={'width':1882,'height':902},device_scale_factor=1);page=ctx.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
 page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').focus();page.mouse.move(941,850);page.keyboard.press('Enter');page.wait_for_timeout(350)
 css=page.locator('#feedback').evaluate('''e=>{let c=getComputedStyle(e),t=getComputedStyle(e.querySelector('.hf-notice-title')),p=getComputedStyle(e.querySelector('.hf-notice-copy')),i=getComputedStyle(e.querySelector('.hf-icon'));return{background:c.backgroundColor,radius:c.borderRadius,padding:c.padding,gap:c.gap,shadow:c.boxShadow,title:[t.fontSize,t.lineHeight,t.fontWeight,t.color],body:[p.fontSize,p.lineHeight,p.fontWeight,p.color],icon:[i.width,i.height,i.color],transition:c.transitionDuration}}''')
 assert css['background']=='rgb(32, 32, 32)' and css['radius']=='10px' and css['padding']=='14px 16px' and css['gap']=='12px'
 assert css['title'][:3]==['14px','20px','500'] and css['body'][:3]==['14px','20px','400'],css
 cdp=ctx.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable');doc=cdp.send('DOM.getDocument')['root']['nodeId'];fonts={}
 for sel,face in [('#feedback-title','MabryPro-Medium'),('#feedback-copy','MabryPro-Regular')]:
  n=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':sel})['nodeId'];fonts[sel]=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':n});assert fonts[sel]['fonts'][0]['postScriptName']==face,fonts
 for key,value in [('role','status'),('aria-live','polite'),('aria-atomic','true')]:assert page.locator('#notification-announcement').get_attribute(key)==value
 assert page.locator('#take-help').get_attribute('aria-live') is None and page.locator('#open-settings').get_attribute('aria-describedby')=='take-help'
 expect(page.locator('#feedback')).to_be_hidden(timeout=10000);expect(page.locator('#open-settings')).to_be_visible();expect(page.locator('#take-help')).to_contain_text('Microphone unavailable')
 result={'version':'core-journey-highfi-v3','date':'2026-10-27','result':'PASS','recipe':css,'actualFonts':fonts,'stationaryPointer':'PASS: popup appearing beneath the stationary keyboard-activation pointer still auto-hides','semantics':'Always-present polite atomic announcement; persistent associated workspace guidance; visual popup hidden from duplicate AT reading'}
 # Real tab visibility, not a synthetic visibilitychange event.
 page.evaluate('scrollTo(0,0)');page.locator('.lab summary').click();page.locator('#fail-mic').check();page.locator('.lab summary').click();page.locator('#record').click();page.mouse.move(0,0);page.wait_for_timeout(6300)
 other=ctx.new_page();other.goto('about:blank');other.bring_to_front()
 hidden=page.evaluate('document.hidden');result['backgroundVisibilityObserved']=hidden
 if hidden:
  page.wait_for_timeout(2400);expect(page.locator('#feedback')).to_be_visible();page.bring_to_front();expect(page.locator('#feedback')).to_be_hidden(timeout=3500);result['backgroundPause']='PASS actual hidden tab pauses lifetime beyond normal deadline, then resumes'
 else:result['backgroundPause']='NOT RUN: installed headless browser did not expose hidden-tab visibility'
 other.close();ctx.close();b.close()
source=Path('../../_docs/evidence/affect-ui-clean-light');old=json.loads((root/'calibration-v2-reference-check.json').read_text(encoding='utf8'));hashes={f:hashlib.sha256((source/f).read_bytes()).hexdigest() for f in old['selectedManifestHashes']};assert hashes==old['selectedManifestHashes']
palette={'titleOnCharcoal':contrast([252]*3,[32]*3),'bodyOnCharcoal':contrast([212]*3,[32]*3),'alertIconOnCharcoal':contrast([255,156,159],[32]*3),'popupOnWhiteApp':contrast([32]*3,[255]*3)}
assert all(v>=4.5 for v in palette.values())
(root/'highfi-v3-visual-results.json').write_text(json.dumps(result,indent=2),encoding='utf8')
(root/'calibration-v3-reference-check.json').write_text(json.dumps({'version':'core-journey-highfi-v3','result':'PASS','selectedManifestHashes':hashes,'sharedRecipeSha256':hashlib.sha256(Path('presentation.css').read_bytes()).hexdigest(),'toastLifecycleSha256':hashlib.sha256(Path('toast.js').read_bytes()).hexdigest(),'contrast':palette,'sourceAdaptation':'Owner directly requested contrasting popup, enter/exit and timeout. Opaque #202020 with white/coral derives Light primary inverse contrast; NOT10px/surface family retained;14/20 product type,20px outlined icon,14x16 padding/12gap. No Dark theme/source adopted.180ms enter/140ms exit8px adapts NOT460/300 entry and320/240 exit40px to bounded task feedback;8 visible foreground seconds with deliberate hover/tab-hidden pause; no action gating or embedded buttons.'},indent=2),encoding='utf8')
print('PASS: v3 compact inverse recipe, actual Mabry weights, contrast, live semantics and stationary-pointer timeout')
