from pathlib import Path
import json,hashlib,re,sys,subprocess
out=Path(__file__).parent;root=out.parents[3];studio=root/'prototypes/core-journey-studio';base=json.loads((out/'baseline.json').read_text(encoding='utf-8'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[]
def check(name,value,**detail):checks.append(dict(name=name,passed=bool(value),**detail))
original=root/'prototypes/core-journey-lowfi';old=base['prototypes']['core-journey-lowfi'];check('Original manifest byte unchanged',sha(original/'evidence/version.json')==old['manifestSha256'])
for f,h in old['fingerprints'].items():check('Original unchanged: '+f,sha(original/f)==h)
allowed={'index.html','src.js','BRIEF.md','README.md'};changed=[]
for f,h in base['prototypes']['core-journey-studio']['fingerprints'].items():
 if sha(studio/f)!=h:changed.append(f)
check('Only bounded prior studio files changed',set(changed)<=allowed,changed=changed)
for f,h in base['canonicalDocsSha256'].items():check('Scoped canonical remains unchanged: '+f,sha(root/f)==h)
for f in studio.iterdir():
 if f.suffix in ['.js','.html','.css']:check('Retired function absent: '+f.name,not re.search(r'process[\s-]+again|\breprocess(?:ing)?\b|обработать\s+снова|повторн.{0,20}обработ',f.read_text(encoding='utf-8'),re.I))
html=(studio/'index.html').read_text(encoding='utf-8');source=(studio/'src.js').read_text(encoding='utf-8')
check('No speaker identity or visible color legend',not re.search(r'Shaman|speaker\s*:|id=["\'](?:panel-)?speaker|class=["\']wave-key',html+source))
check('Custom source controls use actual distinct unchanged fixtures', '/media/example-dub.mp4' in html and '/media/scene.mp4' in html and 'id="result-original"' in html)
check('Download remains explicitly dub fixture','href="/media/example-dub.mp4"' in html and 'Download My dub' in source)
check('No production frontend recreated',not (root/'frontend').exists())
r=subprocess.run(['git','diff','--check'],cwd=root,capture_output=True,text=True);check('git diff --check',r.returncode==0,output=r.stdout+r.stderr)
d=dict(version='core-journey-studio-lowfi-v6',date='2026-10-27',result='PASS' if all(c['passed'] for c in checks) else 'FAIL',checks=checks,limits='Source/preservation assertions are separate from actual browser operation and design acceptance. No remote mutation/integration is performed.')
(out/'preservation-results.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'result':d['result'],'checks':len(checks),'changedPriorStudioFiles':changed,'failed':[c['name'] for c in checks if not c['passed']]}));sys.exit(0 if d['result']=='PASS' else 1)
