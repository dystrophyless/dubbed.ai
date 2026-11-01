from pathlib import Path
import json,re,hashlib
from playwright.sync_api import sync_playwright
r=Path.cwd();a=r/'prototypes/core-journey-lowfi';b=r/'prototypes/core-journey-studio';out=a/'evidence/exit-log-out-amendment';bo=b/'evidence/exit-log-out-amendment';bo.mkdir(exist_ok=True);rows=[];errors=[]
asset=(a/'node_modules/lucide-static/icons/log-out.svg').read_text(encoding='utf-8');paths=re.findall(r'<path d="([^"]+)"',asset)
with sync_playwright() as p:
 br=p.chromium.launch(channel='chrome',headless=True)
 for v,folder,port,key in [('A',a,5178,'dubbed-lowfi-v1'),('B',b,5179,'dubbed-studio-lowfi-v1')]:
  for w,h in [(1440,900),(390,667)]:
   for locale in ['en','ru']:
    for view in ['record','result']:
     pg=br.new_page(viewport={'width':w,'height':h});pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(f'http://127.0.0.1:{port}');st=json.loads((b/'evidence/result-player-v6/completed-fixture-state.json').read_text(encoding='utf-8'));st.update(view=view,locale=locale);pg.evaluate('([k,s])=>localStorage.setItem(k,JSON.stringify(s))',[key,st]);pg.reload();pg.evaluate('document.fonts.ready')
     if view=='result':pg.wait_for_function('!document.querySelector("#result-player").hidden && !document.querySelector("#result-play").disabled')
     name='Exit' if locale=='en' else 'Выйти';exit=pg.get_by_role('button',name=name,exact=True);assert exit.get_attribute('id')=='exit';assert exit.locator('svg.lucide-log-out').count()==1
     data=exit.evaluate('''e=>{let s=e.querySelector('svg'),c=getComputedStyle(s),r=e.getBoundingClientRect();return {name:e.innerText,viewBox:s.getAttribute('viewBox'),fill:s.getAttribute('fill'),stroke:s.getAttribute('stroke'),strokeWidth:c.strokeWidth,caps:c.strokeLinecap,joins:c.strokeLinejoin,ariaHidden:s.getAttribute('aria-hidden'),paths:[...s.querySelectorAll('path')].map(p=>p.getAttribute('d')),buttonSize:[r.width,r.height],color:c.color}}''')
     assert data['paths']==paths and data['viewBox']=='0 0 24 24' and data['fill']=='none' and data['stroke']=='currentColor' and data['strokeWidth']=='1.1px' and data['caps']=='round' and data['joins']=='round' and data['ariaHidden']=='true',data
     if w<768:assert data['buttonSize'][1]>=48
     if view=='record':assert pg.locator('#previous svg.lucide-chevron-left').count()==1
     else:assert pg.locator('#return svg.lucide-undo-2').count()==1
     namefile=f'{v}-{w}x{h}-{locale}-{view}-exit.png';exit.screenshot(path=str((out if v=='A' else bo)/namefile));rows.append({'variant':v,'viewport':[w,h],'locale':locale,'view':view,'result':'PASS','computed':data,'capture':namefile});pg.close()
 assert not errors,errors
 report={'amendment':'exit-log-out-2026-10-28','date':'2026-10-28','browser':br.version,'result':'PASS','checks':rows,'pageErrors':errors,'method':'Actual Chrome;2variants×2viewports×2locales×Record/Result;accessible role/name and actualLogOutassetgeometry/computedstroke verified;Previous/Return icons unchanged. Completed fixture used to enter Result;no journey revalidation claimed.'}
 for folder in [out,bo]:(folder/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 br.close()
print('PASS16 browser Exit icon/name/state/viewport cohorts')
