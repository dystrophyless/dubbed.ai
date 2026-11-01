from pathlib import Path
import difflib,hashlib,json,re,subprocess,sys

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).parent
base=json.loads((OUT/'baseline.json').read_text(encoding='utf-8'))
before=json.loads(Path(base['temporaryDirtyPreimages']).read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
norm=lambda s:s.replace('\r\n','\n')
checks=[]
def check(name,passed,**extra):checks.append(dict(name=name,passed=bool(passed),**extra))
def section(s,heading):
 s=norm(s);m=re.search('^'+re.escape(heading)+'$',s,re.M);assert m,heading;level=len(heading)-len(heading.lstrip('#'));n=re.search(r'^#{1,'+str(level)+r'} ',s[m.end():],re.M);return s[m.start():m.end()+n.start() if n else None].strip()

changed=[];patch=[]
for name,old in before.items():
 p=ROOT/name;new=p.read_text(encoding='utf-8')
 if norm(old)!=norm(new):
  changed.append(dict(path=name,before=base['beforeSha256'][name],after=sha(p)))
  patch.extend(difflib.unified_diff(norm(old).splitlines(True),norm(new).splitlines(True),fromfile='pre-owner-amendment/'+name,tofile='post-owner-amendment/'+name))
 else:check('Unrelated baseline doc unchanged: '+name,sha(p)==base['beforeSha256'][name])

for name,prefixes in {
 '_docs/frontend-flows/09-record.md':['### 5.1 ','### 5.2 ','### 5.3 ','### 5.4 ','### 5.5 ','### 5.7 ','### 5.8 ','### 5.9 ','### 5.11 ','### 6.1 ','### 6.2 ','### 6.3 ','### 6.4 ','### 6.5 ','### 6.6 ','### 6.7 '],
 '_docs/frontend-flows/10-result.md':['## 7.','## 8.','## 9.','## 11.'],
 '_docs/frontend-flows/00-shared-contract.md':['## One recording tab per project','## Explicit navigation wins at first complete recording set','## Unaccepted-draft lifetime','## Recording ownership recovery after disconnect','## Account-deletion confirmation'],
}.items():
 for prefix in prefixes:
  heading=next(l for l in norm(before[name]).splitlines() if l.startswith(prefix))
  old=section(before[name],heading)
  # These two sections retain every other word; only the explicitly removed feature clause changes.
  if heading=='### 5.5 Candidate review':old=old.replace(' or creates the permanent reprocessing lock','')
  if heading=='## 11. Persistence, ownership and concurrency':old=old.replace('Whole-project AI processing remains permanently locked after the first accepted take.','No delivered-preparation rerun is available before or after recording.')
  check('Preserved invariant after feature-only deletion: '+name+' '+heading,old==section((ROOT/name).read_text(encoding='utf-8'),heading))

active=[ROOT/n for n in before if n.startswith(('_docs/frontend-flows/','_docs/business-requirements/','_docs/specifications/','_docs/task-drafts/')) and 'review' not in Path(n).name]
pattern=re.compile(r'\breprocess|process again|included.{0,30}retry|free.?retry|paid.?retry|AI.repeat|AI.retry|one.retry[ /]project|initial/included/additional',re.I)
remaining=[]
for p in active:
 for number,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
  if pattern.search(line):
   allowed='WITHDRAWN-09-REPROCESS' in line or 'no user-requested AI repeat' in line or 'Historical provenance only:' in line
   remaining.append(dict(path=str(p.relative_to(ROOT)),line=number,text=line,classification='explicit withdrawal or historical provenance' if allowed else 'UNEXPECTED'))
check('No live removed feature/entitlement clauses',all(x['classification']=='explicit withdrawal or historical provenance' for x in remaining),remaining=remaining)

for folder in ['core-journey-lowfi','core-journey-studio']:
 runtime=ROOT/'prototypes'/folder
 hits=[]
 for name in ['index.html','src.js','ui.js','locale.js','style.css','highfi.css','studio.css','presentation.css']:
  p=runtime/name
  if not p.exists():continue
  for i,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
   if re.search(r'process-again|process-help|Process again|One included retry|Available only before your first saved line',line):hits.append(dict(file=name,line=i))
 check('No feature runtime/copy hooks: '+folder,not hits,hits=hits)

original=ROOT/'prototypes/core-journey-lowfi'
amended=[]
for name,expected in base['originalBeforeSha256'].items():
 if sha(original/name)!=expected:amended.append(name)
check('Only explicit original amendment sources changed',set(amended)==set(['BRIEF.md','index.html','src.js','style.css','highfi.css','presentation.css','ui.js','locale.js']),changed=amended,unchanged=54-len(amended))
manifest=json.loads((original/'evidence/version.json').read_text(encoding='utf-8'))
check('Original current manifest accurate',all(sha(original/n)==h for n,h in manifest['sha256'].items()))
check('Original owner approval retained historically',manifest['ownerHighFiCheckpoint']['ownerReply']=='ok, I approve this' and bool(manifest['ownerAmendment']))

git=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
check('git diff --check',git.returncode==0,output=git.stdout,stderr=git.stderr)
check('Production frontend remains absent',not (ROOT/'frontend').exists())
(OUT/'scoped-doc-diff.patch').write_text(''.join(patch),encoding='utf-8',newline='\n')
report=dict(version='core-journey-studio-lowfi-v3',date='2026-10-27',baseline='Pre-amendment dirty worktree; owner edits preserved',command='python prototypes/core-journey-studio/evidence/owner-removal-v3/doc-check.py',changedCanonicalFiles=changed,checks=checks,passed=all(c['passed'] for c in checks),limits=['Static source/requirement checks are not backend accounting or production proof.','Historical Flow08,evidence,source snapshots,CHANGELOG and old review/screenshot bodies were preserved; old brainstorm decisions explicitly superseded.','Published issues remain unchanged; exact alignment deltas in AUDIT.md.','Temporary preimages are required to regenerate this dirty-baseline diff.'])
(OUT/'doc-check-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':report['passed'],'checks':len(checks),'changedCanonicalFiles':len(changed),'failures':[c['name'] for c in checks if not c['passed']]}))
sys.exit(0 if report['passed'] else 1)
