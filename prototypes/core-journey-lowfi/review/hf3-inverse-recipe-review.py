import json,hashlib,math
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;r=out.parent;refs=json.loads((r/'evidence/calibration-v3-reference-check.json').read_text());selected=refs.get('selectedManifestHashes',{});refroot=r.parent.parent/'_docs/evidence/affect-ui-clean-light';data={'references':{f:hashlib.sha256((refroot/f).read_bytes()).hexdigest()==h for f,h in selected.items()}};assert len(selected)==9 and all(data['references'].values())
def lum(c):
 v=[x/255 for x in c];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(x*y for x,y in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1400,'height':1100},device_scale_factor=1);page.goto('http://127.0.0.1:5178/calibration.html');page.evaluate('document.fonts.ready');data['notice']=page.locator('.hf-notice').first.evaluate('(e)=>{let c=getComputedStyle(e),t=getComputedStyle(e.querySelector(".hf-notice-title")),p=getComputedStyle(e.querySelector(".hf-notice-copy")),i=getComputedStyle(e.querySelector(".hf-icon"));return {background:c.backgroundColor,radius:c.borderRadius,padding:c.padding,gap:c.gap,shadow:c.boxShadow,title:{font:t.font,color:t.color},body:{font:p.font,color:p.color},icon:{color:i.color,width:i.width},buttons:e.querySelectorAll("button,a").length}}');page.screenshot(path=str(out/'hf3-review-calibration.png'),full_page=True);assert data['notice']['background']=='rgb(32, 32, 32)' and data['notice']['radius']=='10px' and data['notice']['buttons']==0;cdp=page.context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable');doc=cdp.send('DOM.getDocument');data['fonts']={}
 for sel in ['.hf-notice-title','.hf-notice-copy']:
  node=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':sel});data['fonts'][sel]=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']})
 b.close()
data['contrast']={'title':contrast([252,252,252],[32,32,32]),'body':contrast([212,212,212],[32,32,32]),'icon':contrast([255,156,159],[32,32,32])};assert min(data['contrast'].values())>4.5;(out/'hf3-inverse-recipe-review.json').write_text(json.dumps(data,indent=2),encoding='utf-8');print(json.dumps(data,indent=2)[-3000:])
