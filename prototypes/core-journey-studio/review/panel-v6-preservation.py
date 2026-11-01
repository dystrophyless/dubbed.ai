from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[3];out=Path(__file__).parent;a=root/'prototypes/core-journey-lowfi';b=root/'prototypes/core-journey-studio';base=json.loads((a/'evidence/focused-exit-v6/baseline.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[];targets=[]
def check(n,ok,d=None):checks.append({'name':n,'pass':bool(ok),'detail':d})
for label,p in [('A',a),('B',b)]:
 raw=(p/'evidence/version.json').read_bytes();m=json.loads(raw);bad=[f for f,h in m['sha256'].items() if sha(p/f)!=h];check(label+' current fingerprints match',not bad,bad);targets.append({'variant':label,'version':m['version'],'manifestSha256':hashlib.sha256(raw).hexdigest(),'entries':len(m['sha256'])})
check('B manifest byte-for-byte unchanged',sha(b/'evidence/version.json')==base['BmanifestSha256'])
check('All340 B previous fingerprints unchanged',len(base['Bfingerprints'])==340 and all(sha(b/f)==h for f,h in base['Bfingerprints'].items()))
changes=[f for f,h in base['A']['sha256'].items() if sha(a/f)!=h];check('Only bounded existing A changes',set(changes)<={'src.js','index.html','BRIEF.md','README.md','panel-responsive.css','panel-result.css'},changes)
canonical=base['A']['canonicalDocsSha256'];check('All9 canonical hashes unchanged',len(canonical)==9 and all(sha(root/f)==h for f,h in canonical.items()))
def fn(s,n):
 start=re.search(r'^(?:async )?function '+re.escape(n)+r'\(',s,re.M);assert start,n
 first=s[start.start():].split('\n',1)[0]
 if first.endswith('}'):return first
 end=re.search(r'^}',s[start.start():],re.M);return s[start.start():start.start()+end.end()]
sa=(a/'src.js').read_text(encoding='utf-8');sb=(b/'src.js').read_text(encoding='utf-8')
for name in ['stop','pauseAudition','isSaveFailure','isMicFailure','atCompleteEnd','retryGuidance','seekStart','updateClock','startAudition','play','record','move','acceptAndMove','guard','showResult']:check('Protected behavior identical to B '+name,fn(sa,name)==fn(sb,name))
html=(a/'index.html').read_text(encoding='utf-8');check('No global shell markup',not re.search(r'<nav|class=["\x27](?:global|brand|account)|credit-balance',html));check('Exit sole destination hook',html.count('data-destination=')==1 and 'id="exit"' in html)
retired=[f.name for f in a.iterdir() if f.suffix in ['.js','.html','.css'] and re.search(r'reprocess|process[\s-]+again|повторн\w*.{0,30}обработ',f.read_text(encoding='utf-8'),re.I)];check('Retired preparation feature absent',not retired,retired)
report={'version':'core-journey-panel-highfi-v6','date':'2026-10-28','targets':targets,'checks':checks,'pass':sum(c['pass'] for c in checks),'total':len(checks)};(out/'panel-v6-preservation-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
