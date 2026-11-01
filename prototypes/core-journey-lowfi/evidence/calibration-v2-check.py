import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
ref=Path(__file__).parents[3]/'_docs/evidence/affect-ui-clean-light/source/components'
references={}
for component in ['button','profile-menu','notification-stack','thinking-loader']:
    folder=ref/component/'Clean'
    for p in list(folder.glob('*.md.txt'))+[folder/'Light/01-initial.png']:
        references[str(p.relative_to(ref))]=hashlib.sha256(p.read_bytes()).hexdigest()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1400,'height':1100},device_scale_factor=1)
    page.goto('http://127.0.0.1:5178/calibration.html');page.evaluate('document.fonts.ready')
    page.locator('#hover-sample').hover();page.wait_for_timeout(180)
    page.locator('#hover-sample').focus();page.keyboard.press('Tab')
    page.screenshot(path=str(root/'calibration-v2-desktop.png'),full_page=True)
    press=page.locator('#danger-sample').bounding_box();page.mouse.move(press['x']+press['width']/2,press['y']+press['height']/2);page.mouse.down();page.wait_for_timeout(180)
    assert page.locator('#danger-sample').evaluate('(e)=>getComputedStyle(e).transform').startswith('matrix(0.97')
    page.locator('#task-row').screenshot(path=str(root/'calibration-v2-pressed.png'))
    page.mouse.up();page.wait_for_timeout(180)
    assert page.locator('#danger-sample').evaluate('(e)=>getComputedStyle(e).transform')=='none'
    page.locator('#hover-sample').hover();page.wait_for_timeout(180);page.locator('#hover-sample').focus();page.keyboard.press('Tab')
    states=page.evaluate('''()=>Object.fromEntries(['#normal-sample','#hover-sample','#focus-sample','#danger-sample','#loading-sample','#surface-sample','#invalid-sample','#notice-sample','#dialog-sample'].map(s=>{let e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[s,{width:r.width,height:r.height,font:c.fontFamily,weight:c.fontWeight,fontSize:c.fontSize,lineHeight:c.lineHeight,radius:c.borderRadius,shadow:c.boxShadow,outline:c.outline,color:c.color,background:c.backgroundColor,transition:c.transition}]}))''')
    assert states['#normal-sample']['height']==40
    assert states['#normal-sample']['radius']=='6px'
    assert states['#surface-sample']['radius']=='10px'
    assert states['#invalid-sample']['height']==32
    assert states['#focus-sample']['outline'].startswith('rgb(0, 96, 226) solid 2px')
    assert page.locator('svg').evaluate_all('(icons)=>icons.every(i=>i.getAttribute("stroke-width")==="1.1" && i.getAttribute("fill")==="none")')
    metrics=page.evaluate('''()=>{let c=document.createElement('canvas').getContext('2d');return Object.fromEntries(['Save changes','Record again','Сохранить и перейти'].map(t=>{c.font='500 14px "Inter comparison"';let inter=c.measureText(t).width;c.font='500 14px "Mabry Pro"';return[t,{inter,mabry:c.measureText(t).width}]}))}''')
    cdp=page.context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable');doc=cdp.send('DOM.getDocument')['root']['nodeId']
    fonts={}
    for selector in ['#normal-sample','.intro','.source-density .hf-button']:
        node=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':selector})['nodeId'];fonts[selector]=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(root/'calibration-v2-phone.png'),full_page=True)
    assert page.locator('#normal-sample').bounding_box()['height']>=48
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.emulate_media(reduced_motion='reduce')
    reduced=page.locator('.hf-spinner').first.evaluate('(e)=>getComputedStyle(e).animationName')
    assert reduced=='none'
    result={'stage':'internal component calibration before app presentation','browser':browser.version,'date':'2026-10-27','viewport':[1400,1100],'DPR':1,'zoom':'100%','references':references,'states':states,'fontWidthComparisonAt14px500':metrics,'platformFonts':fonts,'reducedMotionSpinner':reduced,'result':'PASS'}
    (root/'calibration-v2-check-results.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    browser.close()
print('PASS: internal calibration recipes/states, actual Mabry/Inter metrics, icon strokes, phone targets and reduced motion')
