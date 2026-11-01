import json,re,math
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;checks=[]
def note(n,d):checks.append({'check':n,'observed':d});print(n,str(d)[:400],flush=True)
def rgba(s):
 vals=[float(x) for x in re.findall(r'[\d.]+',s)];return vals[:3]+[vals[3] if len(vals)>3 else 1]
def blend(f,b):return [f[i]*f[3]+b[i]*(1-f[3]) for i in range(3)]+[1]
def lum(c):
 q=[x/255 for x in c[:3]];q=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in q];return .2126*q[0]+.7152*q[1]+.0722*q[2]
def ratio(a,b):a,b=sorted([lum(a),lum(b)]);return (b+.05)/(a+.05)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3')
 for sel in ['#record','#replay','#take-help','#position','#scrub','#volume']:
  d=page.locator(sel).evaluate('(e)=>({color:getComputedStyle(e).color,backgrounds:[...function*(n){while(n){yield n;n=n.parentElement}}(e)].reverse().map(n=>getComputedStyle(n).backgroundColor),rect:e.getBoundingClientRect().toJSON()})');bg=[255,255,255,1]
  for x in d['backgrounds']:bg=blend(rgba(x),bg)
  fg=blend(rgba(d['color']),bg);d['effectiveTextContrast']=ratio(fg,bg);note('Actual '+sel,d)
  if sel in ['#record','#replay','#take-help','#position']:assert d['effectiveTextContrast']>=4.5
 page.locator('#replay').click();page.wait_for_timeout(150)
 for _ in range(3):page.keyboard.press('Shift+Tab')
 focus=page.evaluate('({id:document.activeElement.id,visible:document.activeElement.matches(":focus-visible"),outline:getComputedStyle(document.activeElement).outline,offset:getComputedStyle(document.activeElement).outlineOffset})');note('Actual media keyboard focus',focus);assert focus['id']=='pause' and focus['visible'];page.screenshot(path=str(out/'hf-review-media-focus.png'))
 icon=page.locator('svg.lucide').evaluate_all('(es)=>es.map(e=>({class:e.className.baseVal,stroke:getComputedStyle(e).strokeWidth,fill:getComputedStyle(e).fill,cap:getComputedStyle(e).strokeLinecap,join:getComputedStyle(e).strokeLinejoin,viewBox:e.getAttribute("viewBox")}))');note('Actual SVG icon properties',icon);assert all(e['stroke']=='1.1px' and e['fill']=='none' and e['cap']=='round' and e['join']=='round' and e['viewBox']=='0 0 24 24' for e in icon)
 before=page.evaluate('({w:innerWidth,dpr:devicePixelRatio,scale:visualViewport.scale})')
 for _ in range(4):page.keyboard.press('Control++')
 page.wait_for_timeout(150);after=page.evaluate('({w:innerWidth,dpr:devicePixelRatio,scale:visualViewport.scale})');note('Browser zoom accelerator probe',{'before':before,'after':after,'actualZoomEstablished':before!=after});page.keyboard.press('Control+0');b.close()
(out/'hf-rendered-style-review.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')

