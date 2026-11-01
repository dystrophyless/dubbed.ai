from pathlib import Path
import json,hashlib,difflib,re
out=Path(__file__).parent;packet=out.parent;root=out.parents[3]
base=json.loads((packet/'baseline.json').read_text(encoding='utf-8'));manifest=json.loads((packet/'manifest.json').read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[];targets=[]
def check(n,ok,d=None):checks.append({'name':n,'pass':bool(ok),'detail':d})
check('Named packet v2',manifest['version']=='core-journey-ab-contract-sync-v2')
check('No current frontend to inherit',not (root/'frontend').exists())
bad=[f for f,h in manifest['canonicalSha256'].items() if sha(root/f)!=h];check('Nine canonical current hashes match frozen manifest',len(manifest['canonicalSha256'])==9 and not bad,bad)
bad=[f for f,h in manifest['artifactsSha256'].items() if sha(packet/f)!=h];check('All existing packet artifact hashes match',not bad,bad)
changed=[f for f,h in base['preserveDocs'].items() if sha(root/f)!=h];check('Exactly9 changed canonical paths',set(changed)==set(base['before']),changed)
unchanged=[f for f in base['preserveDocs'] if f not in base['before']];check('Other92 active/stub documents remain exact',len(unchanged)==92 and all(sha(root/f)==base['preserveDocs'][f] for f in unchanged))
recreated=[]
for f,h in base['before'].items():
 oldpath=packet/'sources-before'/f;check('Preimage matches dirty baseline '+f,sha(oldpath)==h)
 old=oldpath.read_text(encoding='utf-8');new=(root/f).read_text(encoding='utf-8');recreated.extend(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+f,tofile='b/'+f))
check('Scoped patch recreates exact current canonical diff',''.join(recreated)==(packet/'scoped-contract-diff.patch').read_text(encoding='utf-8'))
for folder,v in base['prototypes'].items():
 p=root/'prototypes'/folder;raw=(p/'evidence/version.json').read_bytes();m=json.loads(raw);bad=[f for f,h in v['manifest']['sha256'].items() if sha(p/f)!=h]
 check(folder+' manifest unchanged',hashlib.sha256(raw).hexdigest()==v['manifestSha256']==manifest['frozenPrototypeManifests'][folder]);check(folder+' every frozen source/evidence hash unchanged',not bad,bad)
 targets.append({'folder':folder,'version':m['version'],'manifestSha256':hashlib.sha256(raw).hexdigest(),'entries':len(v['manifest']['sha256'])})
def section(s,heading):
 s=s.replace('\r\n','\n');m=re.search('^'+re.escape(heading)+r'\n[\s\S]*?(?=^## |\Z)',s,re.M);return m.group(0).strip() if m else None
protected={
 '_docs/frontend-flows/00-shared-contract.md':['## Recording turn navigation','## Audition of unaccepted replacement','## Back with an unaccepted recording','## Resuming unfinished recording','## To result with an unaccepted candidate','## One recording tab per project','## Release recording before device switch','## Recording ownership recovery after disconnect','## Initial assembly after filling the final gap','## Background completion does not steal navigation','## Millisecond source-section precision','## Explicit navigation wins at first complete recording set'],
 '_docs/frontend-flows/09-record.md':['## 5. State model and transitions','## 6. Failure, interruption and recovery behavior'],
 '_docs/frontend-flows/10-result.md':['## 6. Generation, eligibility and owner-current invariants','## 8. Download contract','## 10. Logical service contract','## 11. Persistence, ownership and concurrency']}
for f,headings in protected.items():
 old=(packet/'sources-before'/f).read_text(encoding='utf-8');new=(root/f).read_text(encoding='utf-8')
 for h in headings:
  oldsection=section(old,h);newsection=section(new,h);check('Protected domain '+h,oldsection is not None and oldsection.replace('Download MP4','Download My dub')==newsection)
assets=json.loads((packet/'asset-prerequisites.json').read_text())['assets']
for asset in assets:
 paths=[root/'prototypes'/n/'public/media'/asset['asset'] for n in ['core-journey-lowfi','core-journey-studio']]
 check('Current permitted media bytes match prerequisite '+asset['asset'],all(p.stat().st_size==asset['bytes'] and sha(p)==asset['sha256'] for p in paths))
links=[]
for f in manifest['canonicalSha256']:
 old=(packet/'sources-before'/f).read_text(encoding='utf-8');new=(root/f).read_text(encoding='utf-8');previous=set(re.findall(r'\[[^\]]*\]\(([^)]+)\)',old));added=set(re.findall(r'\[[^\]]*\]\(([^)]+)\)',new))-previous
 for link in added:
  if '://' not in link and not link.startswith('#') and not ((root/f).parent/link.split('#')[0]).resolve().exists():links.append({'source':f,'link':link})
check('New local canonical links resolve',not links,links)
report={'version':'core-journey-ab-contract-sync-v2','date':'2026-10-28','scope':'Independent static preservation/diff/fixture prerequisite checks only;no app runtime exists','manifestSha256':sha(packet/'manifest.json'),'targets':targets,'checks':checks,'pass':sum(x['pass'] for x in checks),'total':len(checks),'limits':'No author script rerun or author evidence mutation;no frontend build/native capture/persistence/backend/live experiment proof.'}
(out/'independent-results-v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':report['pass'],'total':report['total'],'targets':targets,'manifestSha256':report['manifestSha256'],'failures':[c for c in checks if not c['pass']]},ensure_ascii=False,indent=2));assert report['pass']==report['total']
