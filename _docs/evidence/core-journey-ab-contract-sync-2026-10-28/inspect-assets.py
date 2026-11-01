from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
r=Path.cwd();o=r/'_docs/evidence/core-journey-ab-contract-sync-2026-10-28';a=r/'prototypes/core-journey-lowfi';b=r/'prototypes/core-journey-studio';rows=[]
with sync_playwright() as p:
 br=p.chromium.launch(channel='chrome',headless=True);pg=br.new_page();pg.goto('http://127.0.0.1:5178')
 for name in ['scene.mp4','example-dub.mp4']:
  data=pg.evaluate('''name=>new Promise((resolve,reject)=>{let v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>resolve({duration:v.duration,width:v.videoWidth,height:v.videoHeight});v.onerror=()=>reject(Error('metadata failed'));v.src='/media/'+name;})''',name);f=a/'public/media'/name;other=b/'public/media'/name;h=hashlib.sha256(f.read_bytes()).hexdigest();assert h==hashlib.sha256(other.read_bytes()).hexdigest();rows.append({'asset':name,'bytes':f.stat().st_size,'sha256':h,'sameBothVariants':True,'actualChromeMetadata':data})
 br.close()
report={'date':'2026-10-28','scope':'Current permitted prototype fixture prerequisite inspection only;no app journey,microphone,backend ornewruntime check','result':'PASS','assets':rows,'logicalFixtureWindowsSeconds':[[0,5.1],[5.1,8.5],[8.5,13.4]],'limits':'Decoded assets13.416667seconds versuslogicalwindowend13.4are separately annotated,not proof ofexact backendtrim/render. Synthetic takes not defaultcapture. Source attribution inprototype index:Sintel/BlenderFoundation,CCBY3.0;local font faces only,no bundledwebfont portability/licenseclaim.'};(o/'asset-prerequisites.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2))
