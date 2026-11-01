from pathlib import Path
import json,hashlib,re,subprocess,sys
root=Path.cwd();a=root/'prototypes/core-journey-lowfi';b=root/'prototypes/core-journey-studio';out=a/'evidence/video-center-v5';base=json.loads((out/'baseline.json').read_text(encoding='utf-8'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[]
def check(name,value,**details):checks.append(dict(name=name,passed=bool(value),**details))
check('B current manifest byte unchanged',sha(b/'evidence/version.json')==base['BmanifestSha256'])
for f,h in base['Bfingerprints'].items():check('B unchanged: '+f,sha(b/f)==h)
changed=[]
for f,h in base['A']['sha256'].items():
 if sha(a/f)!=h:changed.append(f)
check('Only bounded existing A files change',set(changed)<={'src.js','index.html','BRIEF.md','README.md'},changed=changed,previousFingerprintCount=len(base['A']['sha256']))
for f,h in base['A']['canonicalDocsSha256'].items():check('Canonical unchanged: '+f,sha(root/f)==h)
sa=(a/'src.js').read_text(encoding='utf-8');sb=(b/'src.js').read_text(encoding='utf-8')
def fn(s,n):
 m=re.search(r'^(?:async )?function '+re.escape(n)+r'\(',s,re.M);assert m,n;first=s[m.start():].split('\n',1)[0]
 if first.endswith('}'):return first
 end=re.search(r'^}',s[m.start():],re.M);return s[m.start():m.start()+end.end()]
for n in ['stop','pauseAudition','isSaveFailure','isMicFailure','atCompleteEnd','retryGuidance','seekStart','updateClock','startAudition','play','record','move','acceptAndMove','guard','showResult']:check('Protected common behavior unchanged: '+n,fn(sa,n)==fn(sb,n))
for p in a.iterdir():
 if p.suffix in ['.js','.html','.css']:check('No retired feature copy: '+p.name,not re.search(r'\breprocess(?:ing)?\b|process[\s-]+again|обработать\s+снова|повторн.{0,20}обработ',p.read_text(encoding='utf-8'),re.I))
check('No speaker/legend hooks',not re.search(r'Shaman|speaker\s*:|id=["\'](?:panel-)?speaker|class=["\']wave-key',(a/'index.html').read_text(encoding='utf-8')+sa))
r=subprocess.run(['git','diff','--check'],capture_output=True,text=True);check('git diff --check',r.returncode==0,output=r.stdout+r.stderr);check('No production frontend',not (root/'frontend').exists())
result={'version':'core-journey-panel-highfi-v5','date':'2026-10-28','result':'PASS' if all(c['passed'] for c in checks) else 'FAIL','checks':checks};(out/'preservation-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'result':result['result'],'checks':len(checks),'Bfingerprints':len(base['Bfingerprints']),'Achanged':changed,'failed':[c['name'] for c in checks if not c['passed']]}));sys.exit(0 if result['result']=='PASS' else 1)
