from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
root=Path.cwd();broot=root/'prototypes/core-journey-studio';out=broot/'evidence/ab-highfi-v1';checks=[]
refs=[]
for family,clean in [('button','button-clean'),('profile-menu','profile-menu-clean'),('notification-stack','notification-stack-clean'),('segmented-control','segmented-control-clean')]:
 for f in [f'_docs/evidence/affect-ui-clean-light/source/components/{family}/Clean/{clean}.md.txt',f'_docs/evidence/affect-ui-clean-light/source/components/{family}/Clean/Light/01-initial.png']:refs.append(f)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 for port,variant in [(5179,'B'),(5178,'A')]:
  for w,h in [(1440,1000),(390,844)]:
   pg=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1);pg.goto(f'http://127.0.0.1:{port}/ab-calibration.html');pg.evaluate('document.fonts.ready')
   normal=pg.locator('#normal-sample').evaluate('(e)=>{let s=getComputedStyle(e);return{h:e.getBoundingClientRect().height,font:s.font,radius:s.borderRadius,bg:s.backgroundColor,color:s.color,transition:s.transitionDuration}}')
   assert normal['h']==(48 if w<768 else 40) and normal['radius']=='6px' and 'Mabry' in normal['font'],normal
   default=pg.locator('#hover-sample').evaluate('(e)=>getComputedStyle(e).boxShadow');pg.locator('#hover-sample').hover();pg.wait_for_timeout(180);hover=pg.locator('#hover-sample').evaluate('(e)=>getComputedStyle(e).boxShadow');assert default!=hover
   pg.mouse.move(1,1);pg.locator('#focus-sample').focus();pg.keyboard.press('Tab');pg.keyboard.press('Shift+Tab');assert pg.locator('#focus-sample').evaluate('(e)=>getComputedStyle(e).outlineStyle')=='solid'
   assert pg.locator('#task-row button:disabled').count()==1;assert pg.locator('#invalid-sample').get_attribute('aria-invalid')=='true';assert pg.locator('#loading-sample').get_attribute('aria-busy')=='true'
   point=pg.locator('#normal-sample').bounding_box();pg.mouse.move(point['x']+10,point['y']+10);pg.mouse.down();pg.wait_for_timeout(190);pressed=pg.locator('#normal-sample').evaluate('(e)=>getComputedStyle(e).transform');pg.mouse.up();pg.mouse.move(1,1);pg.wait_for_timeout(200);assert pressed!='none' and pg.locator('#normal-sample').evaluate('(e)=>getComputedStyle(e).transform')=='none'
   pg.locator('#source-original').click();assert pg.locator('#source-original').get_attribute('aria-pressed')=='true'
   widths=pg.evaluate('''async()=>{await document.fonts.load('500 14px "Inter comparison"');let c=document.createElement('canvas').getContext('2d');c.font='500 14px "Inter comparison"';let i=c.measureText('Save changes').width;c.font='500 14px "Mabry Pro"';return{Inter:i,Mabry:c.measureText('Save changes').width}}''')
   pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(out/f'calibration-{variant}-{w}x{h}.png'));pg.locator('#notice-sample').scroll_into_view_if_needed();pg.screenshot(path=str(out/f'calibration-{variant}-{w}x{h}-derivatives.png'))
   checks.append({'variant':variant,'viewport':[w,h],'result':'PASS','normal':normal,'hoverShadow':hover,'pressedTransform':pressed,'normalized14pxMediumTextWidth':widths});pg.close()
 browser.close()
(out/'calibration-results.json').write_text(json.dumps({'stage':'Before whole-page styling','date':'2026-10-27','browser':'installed Chrome156','DPR':1,'zoom':'100% CSS','result':'PASS','references':{r:hashlib.sha256((root/r).read_bytes()).hexdigest() for r in refs},'checks':checks,'limits':'Internal component calibration;actual page/context/safety states follow. No production shadcn adapter or portable Mabry license/assets are supplied.'},indent=2)+'\n',encoding='utf-8')
print('PASS pre-page component calibration A/B desktop+phone')
