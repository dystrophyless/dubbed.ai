from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect

OUT=Path(__file__).parent
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for w,h,long in [(1280,600,False),(1280,600,True),(1366,650,True),(1440,900,False),(390,667,True)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.goto('http://127.0.0.1:5179');page.wait_for_function('document.querySelector("#scene").readyState>=3');page.evaluate('document.fonts.ready')
        if long:
            page.locator('.lab summary').click();page.locator('#long-line').check();page.locator('#locale').select_option('ru');page.locator('.lab summary').click()
        assert 'Studio v3' in page.locator('.lab summary').inner_text()
        name=f'studio-v3-final-{w}x{h}'+('-long-ru' if long else '-en')
        page.evaluate('scrollTo(0,0)');page.wait_for_timeout(200);page.screenshot(path=str(OUT/(name+'-before.png')))
        page.locator('#replay').click();page.wait_for_timeout(500);page.locator('#pause').click();page.wait_for_timeout(200)
        if w>=768 and h<=700:
            geometry=page.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),a=r('#pause'),d=r('.script'),s=r('.scene');return{pause:[a.top,a.bottom],dialogue:[d.top,d.bottom],scene:[s.top,s.width,s.height],pictureBottom:s.top+s.width*408/960}}''')
            assert geometry['pause'][1]<geometry['dialogue'][0] and geometry['scene'][0]+geometry['scene'][2]<=geometry['dialogue'][0],geometry
        page.locator('#record').click();expect(page.locator('#capture-badge')).to_be_visible();page.wait_for_timeout(1500)
        ratio=float(page.locator('.wave').get_attribute('data-overlay-progress'));assert .1<ratio<.8
        page.screenshot(path=str(OUT/(name+'-during.png')))
        page.wait_for_function('!document.querySelector("#take").disabled',timeout=8000);page.wait_for_timeout(220);page.screenshot(path=str(OUT/(name+'-after.png')))
        assert float(page.locator('.wave').get_attribute('data-overlay-progress'))==1
        checks.append({'viewport':[w,h],'longRU':long,'result':'PASS','midCaptureReveal':ratio,'pauseClearsCaption':True if w>=768 and h<=700 else 'ordinary scene control','screenshots':name+'-{before,during,after}.png'})
        page.close()
    browser.close()
(OUT/'capture-v3-results.json').write_text(json.dumps({'version':'core-journey-studio-lowfi-v3','result':'PASS','checks':checks,'method':'Real Chrome listening pause then complete fixed-window capture, timed envelope snapshots; no timeline fast-forward. Final v3 external dialogue, unified edges and removed function after bilingual restoration.'},indent=2)+'\n',encoding='utf-8')
print('PASS final v3 normal/short/long/phone capture and clear listening control')
