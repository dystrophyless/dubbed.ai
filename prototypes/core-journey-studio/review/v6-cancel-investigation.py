from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent
seed={'index':2,'candidates':[None]*3,'accepted':[{'id':91},{'id':92},{'id':93}],'completed':True,'view':'result'}
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h in [(1280,600),(390,667)]:
  c=b.new_context(viewport={'width':w,'height':h},has_touch=True);c.add_init_script('localStorage.setItem("dubbed-studio-lowfi-v1",'+json.dumps(json.dumps(seed))+')');page=c.new_page();page.goto('http://127.0.0.1:5179');page.wait_for_function('!document.querySelector("#result-play").disabled')
  page.evaluate('''()=>{window.events=[];let e=document.querySelector('#result-seek');for(let type of ['pointerdown','pointermove','pointerup','pointercancel','input','change','touchcancel'])e.addEventListener(type,event=>window.events.push({type,trusted:event.isTrusted,value:e.value,paused:document.querySelector('#result').paused}),true)}''')
  box=page.locator('#result-seek').bounding_box();cdp=c.new_cdp_session(page)
  for typ,fraction in [('touchStart',.25),('touchMove',.5)]:
   cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[{'x':box['x']+box['width']*fraction,'y':box['y']+box['height']/2}]});page.wait_for_timeout(100)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(350)
  results.append({'viewport':[w,h],'pausedAfterNativeTouchCancel':page.locator('#result').evaluate('v=>v.paused'),'events':page.evaluate('events')});c.close()
 b.close()
(out/'v6-cancel-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
