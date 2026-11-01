from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).parent;results=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for completed in [False,True]:
  seed={'index':2,'accepted':[{'id':1},{'id':2},{'id':3} if completed else None],'candidates':[None,None,None if completed else {'id':4}],'completed':completed,'view':'record','locale':'ru'}
  c=b.new_context(viewport={'width':1280,'height':600});c.add_init_script('localStorage.setItem("dubbed-lowfi-v1",'+json.dumps(json.dumps(seed))+')');page=c.new_page();page.goto('http://127.0.0.1:5178');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('.lab summary').click();page.mouse.move(600,450);page.mouse.wheel(0,80);page.wait_for_timeout(200);before=page.evaluate('({scrollY,height:document.documentElement.scrollHeight})');page.locator('#next').click();page.wait_for_function('!document.querySelector("#result-player").hidden');after=page.evaluate('''()=>{let r=s=>{let v=document.querySelector(s).getBoundingClientRect();return {top:v.top,bottom:v.bottom,left:v.left}};return {scrollY,exit:r('#exit'),heading:r('#heading'),player:r('#result-player'),footer:r('.result-bottom')}}''');results.append({'completedRevision':completed,'before':before,'after':after});page.screenshot(path=str(out/('panel-v7-review-result-scroll-'+str(completed)+'.png')));c.close()
 b.close()
(out/'panel-v7-result-scroll-probe.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
