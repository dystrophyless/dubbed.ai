import json,hashlib,re
from pathlib import Path
root=Path(__file__).resolve().parents[3];out=Path(__file__).parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
audit=root/'prototypes/core-journey-studio/evidence/owner-studio-v5'
baseline=json.loads((audit/'baseline.json').read_text());author=json.loads((audit/'preservation-results.json').read_text())
checks=[];targets=[]
def check(n,ok,detail=None):checks.append({'name':n,'pass':bool(ok),'detail':detail})
changed_docs={x['path']:x['after'] for x in author['changedCanonicalFiles']}
check('Nine current document after-hashes match',len(changed_docs)==9 and all(sha(root/f)==h for f,h in changed_docs.items()))
v3=root/'prototypes/core-journey-studio/evidence/owner-removal-v3'
prior_doc=json.loads((v3/'baseline.json').read_text())['beforeSha256']
prior_doc.update({x['path']:x['after'] for x in json.loads((v3/'doc-check-results.json').read_text())['changedCanonicalFiles']})
unexpected=[f for f,h in prior_doc.items() if f not in changed_docs and sha(root/f)!=h]
check('Other79 previously reviewed document paths unchanged',not unexpected,unexpected)
preimages=json.loads(Path(baseline['temporaryDirtyDocPreimages']).read_text(encoding='utf-8'))
def section(text,heading):
 text=text.replace('\r\n','\n');start=re.search('^'+re.escape(heading)+'$',text,re.M);assert start
 level=len(heading)-len(heading.lstrip('#'));end=re.search(r'^#{1,'+str(level)+r'} ',text[start.end():],re.M)
 return text[start.start():start.end()+end.start() if end else None].strip()
record='_docs/frontend-flows/09-record.md'
for prefix in ['### 5.1 ','### 5.2 ','### 5.3 ','### 5.4 ','### 5.5 ','### 5.6 ','### 5.7 ','### 5.8 ','### 5.9 ','### 5.11 ','## 6.','## 10.']:
 heading=next(s for s in preimages[record].splitlines() if s.startswith(prefix))
 check('Preserved Record '+heading,section(preimages[record],heading)==section((root/record).read_text(encoding='utf-8'),heading))
shared='_docs/frontend-flows/00-shared-contract.md'
for heading in ['## One recording tab per project','## Explicit navigation wins at first complete recording set','## Unaccepted-draft lifetime','## Account-deletion confirmation']:
 check('Preserved shared '+heading,section(preimages[shared],heading)==section((root/shared).read_text(encoding='utf-8'),heading))
for n,v in baseline['prototypeBefore'].items():
 p=root/'prototypes'/n;old=v['fingerprints'];changed=[f for f,h in old.items() if sha(p/f)!=h]
 raw=(p/'evidence/version.json').read_bytes();m=json.loads(raw);bad=[f for f,h in m['sha256'].items() if sha(p/f)!=h]
 check(n+' current manifest fully matches',not bad,bad)
 runtime=list(p.glob('*.js'))+list(p.glob('*.html'))+list(p.glob('*.css'))
 retired=[f.name for f in runtime if re.search(r'reprocess|process[\s-]+again|повторн\w*.{0,30}обработ',f.read_text(encoding='utf-8'),re.I)]
 check(n+' removed preparation feature still absent',not retired,retired)
 false_speaker=[f.name for f in runtime if re.search(r'\bspeaker\s*:|\bspeaker[\s"\x27]*:|Shaman|id=["\x27]speaker|data-speaker',f.read_text(encoding='utf-8'),re.I)]
 check(n+' no current fake speaker data/hooks',not false_speaker,false_speaker)
 check(n+' locale hash preserved',sha(p/'locale.js')=='9534363f028e3cd70274c0377863eac891589b215101c77769d08b5f69f0906a')
 targets.append({'target':n,'version':m['version'],'manifestEntries':len(m['sha256']),'manifestSha256':hashlib.sha256(raw).hexdigest(),'priorEntries':len(old),'priorChanged':changed,'priorPreserved':len(old)-len(changed)})
 if n=='core-journey-lowfi':check('Original only narrow four-file speaker amendment',set(changed)=={'BRIEF.md','index.html','src.js','style.css'},changed)
 else:check('Studio changed only bounded presentation sources/brief/readme',set(changed)=={'BRIEF.md','index.html','README.md','src.js','studio.css'},changed)
result={'version':'core-journey-studio-lowfi-v5','date':'2026-10-27','targets':targets,'checks':checks,'pass':sum(c['pass'] for c in checks),'total':len(checks)}
(out/'v5-preservation-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
