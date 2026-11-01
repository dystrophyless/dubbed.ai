from pathlib import Path
import difflib,hashlib,json,re,subprocess,sys

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).parent
base=json.loads((OUT/'baseline.json').read_text(encoding='utf-8'))
before=json.loads(Path(base['temporaryDirtyDocPreimages']).read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
norm=lambda s:s.replace('\r\n','\n')
checks=[]
def check(name,passed,**details):checks.append(dict(name=name,passed=bool(passed),**details))
def section(s,h):
 s=norm(s);m=re.search('^'+re.escape(h)+'$',s,re.M);assert m,h;n=re.search(r'^#{1,'+str(len(h)-len(h.lstrip('#')))+r'} ',s[m.end():],re.M);return s[m.start():m.end()+n.start() if n else None].strip()

changed=[];patch=[]
for name,old in before.items():
 p=ROOT/name;new=p.read_text(encoding='utf-8')
 if norm(old)!=norm(new):
  changed.append(dict(path=name,before=base['docsBeforeSha256'][name],after=sha(p)))
  patch.extend(difflib.unified_diff(norm(old).splitlines(True),norm(new).splitlines(True),fromfile='pre-owner-v5/'+name,tofile='post-owner-v5/'+name))

record='_docs/frontend-flows/09-record.md'
for prefix in ['### 5.1 ','### 5.2 ','### 5.3 ','### 5.4 ','### 5.5 ','### 5.6 ','### 5.7 ','### 5.8 ','### 5.9 ','### 5.11 ','## 6.','## 10.']:
 h=next(x for x in norm(before[record]).splitlines() if x.startswith(prefix))
 check('Unchanged recording invariant: '+h,section(before[record],h)==section((ROOT/record).read_text(encoding='utf-8'),h))
shared='_docs/frontend-flows/00-shared-contract.md'
for h in ['## One recording tab per project','## Explicit navigation wins at first complete recording set','## Unaccepted-draft lifetime','## Account-deletion confirmation']:
 check('Unchanged shared invariant: '+h,section(before[shared],h)==section((ROOT/shared).read_text(encoding='utf-8'),h))

spec=(ROOT/'_docs/specifications/SPEC-001_dubbed_mvp.md').read_text(encoding='utf-8')
recordText=(ROOT/record).read_text(encoding='utf-8')
check('No required speaker field in turn record','No required speaker identity field' in spec and 'supplied speaker/text' not in recordText)
check('Absence cannot reject valid preparation','absence must not reject otherwise valid output' in spec)
check('Transcript/timing remain required','transcript words/sound captions,turn positions' in spec and "each turn's ID, supplied text/sound caption, source start/end and margins, timing revision" in recordText)

retired=re.compile(r'\breprocess(?:ing)?\b|process[\s-]+again|process-again|process-help|included.{0,30}retry|(?:free|paid).{0,30}(?:retry|rerun)|повторн(?:ая|ой|ую).{0,30}обработ|обработать\s+снова',re.I)
for folder,b in base['prototypeBefore'].items():
 root=ROOT/'prototypes'/folder
 allowed={'index.html','src.js','style.css','BRIEF.md'} if folder=='core-journey-lowfi' else {'index.html','src.js','studio.css','BRIEF.md','README.md'}
 differences=[]
 for name,expected in b['fingerprints'].items():
  if sha(root/name)!=expected:differences.append(name)
 check('Only bounded amendment files: '+folder,set(differences)<=allowed,changed=differences,previousFingerprintCount=len(b['fingerprints']))
 source=(root/'src.js').read_text(encoding='utf-8');html=(root/'index.html').read_text(encoding='utf-8')
 check('No fabricated speaker data/UI hooks: '+folder,not re.search(r"speaker\s*:|line\(\)\.speaker|Shaman|id=[\"'](?:panel-)?speaker",source+html))
 check('Current locale unchanged: '+folder,sha(root/'locale.js')==b['fingerprints']['locale.js'])
 for p in root.iterdir():
  if p.suffix in ['.js','.html','.css']:check('Removed function remains absent: '+folder+'/'+p.name,not retired.search(p.read_text(encoding='utf-8')))
studio=ROOT/'prototypes/core-journey-studio';html=(studio/'index.html').read_text(encoding='utf-8')
check('Visible legend nodes removed',not re.search(r'wave-key|take-key|original-key',html))
check('Wave source descriptions retained','id="wave-description"' in html and 'time wave-description' in (studio/'src.js').read_text(encoding='utf-8'))
oldAudit=json.loads((ROOT/'prototypes/core-journey-studio/evidence/owner-removal-v3/doc-check-results.json').read_text(encoding='utf-8'))
for row in oldAudit['changedCanonicalFiles']:
 if row['path'] not in before:check('Other removal contract unchanged: '+row['path'],sha(ROOT/row['path'])==row['after'])
git=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
check('git diff --check',git.returncode==0,output=git.stdout,stderr=git.stderr)
check('No production frontend recreated',not (ROOT/'frontend').exists())
(OUT/'scoped-doc-diff.patch').write_text(''.join(patch),encoding='utf-8',newline='\n')
report=dict(version='core-journey-studio-lowfi-v5',date='2026-10-27',scope='Scoped speaker capability correction and studio presentation; no pipeline/integration or remote mutations',changedCanonicalFiles=changed,checks=checks,passed=all(c['passed'] for c in checks),limits=['Static contract/source checks are separate from actual browser geometry/operation.','Historical snapshots/review/screenshots remain provenance.','External issue alignment and production media capabilities remain held/unproved.'])
(OUT/'preservation-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(passed=report['passed'],checks=len(checks),changedCanonicalFiles=len(changed),failures=[c['name'] for c in checks if not c['passed']])));sys.exit(0 if report['passed'] else 1)
