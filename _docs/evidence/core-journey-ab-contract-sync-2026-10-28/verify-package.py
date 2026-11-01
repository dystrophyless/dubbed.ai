from pathlib import Path
import json,hashlib,re,difflib,subprocess,sys
root=Path.cwd();out=root/'_docs/evidence/core-journey-ab-contract-sync-2026-10-28';base=json.loads((out/'baseline.json').read_text(encoding='utf-8'));checks=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check(name,value,**details):checks.append({'name':name,'passed':bool(value),**details})
def text(rel):return (root/rel).read_text(encoding='utf-8')
allowed=set(base['before']);changed=[];diff=[]
for rel,h in base['preserveDocs'].items():
 current=sha(root/rel)
 if current!=h:changed.append(rel)
 check('Unrelated active/stub unchanged: '+rel,rel in allowed or current==h)
check('Exactly nine bounded canonical files changed',set(changed)==allowed,changed=changed)
check('No product frontend created',not (root/'frontend').exists())
for folder,data in base['prototypes'].items():
 p=root/'prototypes'/folder
 check(folder+' manifest unchanged',sha(p/'evidence/version.json')==data['manifestSha256'])
 for rel,h in data['manifest']['sha256'].items():check(folder+' frozen: '+rel,sha(p/rel)==h)
for rel,h in base['before'].items():
 before=(out/'sources-before'/rel).read_text(encoding='utf-8');after=text(rel)
 diff.extend(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))
(out/'scoped-contract-diff.patch').write_text(''.join(diff),encoding='utf-8',newline='\n')
def section(s,heading):
 m=re.search('^'+re.escape(heading)+r'\n[\s\S]*?(?=^## |\Z)',s,re.M);return m.group(0).strip() if m else None
protected={
 '_docs/frontend-flows/00-shared-contract.md':['## Recording turn navigation','## Audition of unaccepted replacement','## Back with an unaccepted recording','## Resuming unfinished recording','## To result with an unaccepted candidate','## One recording tab per project','## Release recording before device switch','## Recording ownership recovery after disconnect','## Initial assembly after filling the final gap','## Background completion does not steal navigation','## Millisecond source-section precision','## Explicit navigation wins at first complete recording set'],
 '_docs/frontend-flows/09-record.md':['## 5. State model and transitions','## 6. Failure, interruption and recovery behavior'],
 '_docs/frontend-flows/10-result.md':['## 6. Generation, eligibility and owner-current invariants','## 8. Download contract','## 10. Logical service contract','## 11. Persistence, ownership and concurrency']}
for rel,headings in protected.items():
 before=(out/'sources-before'/rel).read_text(encoding='utf-8');after=text(rel)
 for heading in headings:
  old=section(before,heading);new=section(after,heading)
  check('Protected domain section: '+heading,old is not None and new is not None and old.replace('Download MP4','Download My dub')==new)
shared=text('_docs/frontend-flows/00-shared-contract.md');record=text('_docs/frontend-flows/09-record.md');result=text('_docs/frontend-flows/10-result.md');impl=text('_docs/frontend-implementation-contract.md');tokens=text('_docs/frontend-flows/design-tokens.md');packet=(out/'package-review.md').read_text(encoding='utf-8')
for name,ok in {
 'Both current named targets andLogOut amendment':all(x in shared for x in ['panel-highfi-v7','studio-highfi-v1','exit-log-out-2026-10-28']),
 'Direct continuation quoted;not fabricated checkpoint':'Окей. Ну тогда продолжи разработку' in shared and 'not recorded as a separate unseen paired high-fi approval' in shared,
 'Navbar removal andexternalcaption':'omit global navigation' in record and 'Dialogue is below' in record and 'EVERY height' in record,
 'Dots actual count,no jumping':'exactly supplied-turn-count dots' in record and 'never focusable jumps' in record,
 'Explicit restart andlisteningResume':'paused/inactive switch resets and stays paused' not in record and 'Resume alone continues' in record,
 'Wave envelope/overlay/truegap':'continuous filled original envelope' in record and 'take envelope grows' in record and 'remains for Your take' in record and 'TRUE text-bottom' in tokens,
 'A media center,rightpanel andstack':'viewport center±1px' in tokens and 'panel24px' in tokens and '1248px' in tokens,
 'Result source versusgeneration separate':'comparisonSource' in result and 'presentedGeneration' in result and 'Source comparison does not change' in result,
 'Download original preview pinned dub':'even while Original is playing' in result and 'activation-time generation' in result,
 'Original not fakefinishedasset':'Original cannot masquerade' in result,
 'Custom result AC synchronized':'AC-10-24' in result and 'AC-10-25' in result,
 'Focus andscroll currentP3 covered':all(x in impl for x in ['FOCUS-A6-01','SCROLL-A7-01','not the Retry/Next button']),
 'Real capture,actualbytes,nofakeproduction':'MediaRecorder' in impl and 'actual current candidate/accepted microphone bytes' in impl and 'assembledFromAcceptedTakes:false' in impl,
 'Unknown reconcile/candidate/grant fences':all(x in impl for x in ['Unknown outcomes reconcile','local exclusive capture','atomic accepted associations','stale/deleted/account-changed']),
 'Shared controllers,noduplicatebusinesslogic':'ONE controller/domain model' in impl and 'not a second business implementation' in impl,
 'FutureAB50/50 gated,noliveevents':'50/50' in impl and 'persistent per user' in impl and 'No real events/provider/network collection' in impl and 'Primary denominator unit' in impl,
 'No live experimentprivacydefaults':'retention' in impl and 'not shipping analytics' in impl and 'no audio,transcript,title,email' in impl,
 'AllFour Luna phases andfinalindependentproof':'gpt-6-luna / max' in packet and '4. **Connected proof' in packet and 'fresh Sol High independent review' in packet,
 'Remotehold/noacceptance explicit':'Publication is BLOCKED by owner hold' in packet and 'Never mark a whole issue complete' in packet,
 'No current retiredfunctionpositiveUI':all(x not in shared+record+result for x in ['Short desktop moves the same dialogue','no source/take or audio-track selector','Compact global top navigation:']),
}.items():check(name,ok)
# New links only;old removed-frontend anchors remain historical/planned contracts.
for rel in sorted(allowed):
 before=(out/'sources-before'/rel).read_text(encoding='utf-8');after=text(rel)
 old=set(re.findall(r'\[[^\]]*\]\(([^)]+)\)',before));new=set(re.findall(r'\[[^\]]*\]\(([^)]+)\)',after))
 for target in new-old:
  if '://' in target or target.startswith('#'):continue
  check('New canonical link exists: '+target,((root/rel).parent/target.split('#')[0]).resolve().exists())
for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',packet):
 if '://' not in target and not target.startswith('#'):check('Packet link exists: '+target,(out/target.split('#')[0]).resolve().exists())
issues=json.loads((out/'issue-readback.json').read_text(encoding='utf-8-sig'))['issues'];check('17 live issue readbacks;allcomments checked',len(issues)==17 and all(i['state']=='open' and i['commentCount']==0 for i in issues))
check('Real adapter remains blocked',next(i for i in issues if i['number']==76)['workflow'].startswith('blocked'))
assets=json.loads((out/'asset-prerequisites.json').read_text(encoding='utf-8'));check('Current distinct equal-duration fixture assets',assets['result']=='PASS' and len({a['sha256'] for a in assets['assets']})==2 and len({a['actualChromeMetadata']['duration'] for a in assets['assets']})==1)
git=subprocess.run(['git','diff','--check'],capture_output=True,text=True);check('git diff --check',git.returncode==0)
report={'version':'core-journey-ab-contract-sync-v2','date':'2026-10-28','timezone':'Asia/Qyzylorda','scope':'Static documentation/preservation/source-contract checks andcurrentasset prerequisites;not newapp/runtime/productacceptance','result':'PASS' if all(x['passed'] for x in checks) else 'FAIL','assertions':len(checks),'changedFiles':[{'path':f,'before':base['before'][f],'after':sha(root/f)} for f in sorted(changed)],'preservedPrototypeFingerprints':sum(len(v['manifest']['sha256']) for v in base['prototypes'].values()),'checks':checks,'gitWarnings':git.stderr,'limits':'No frontend exists;no newapp build,microphone,backend,mixing,persistence orliveAB verification. Liveissue17 read-only;GitHub/gitdeliveryheld.'}
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'result':report['result'],'assertions':len(checks),'changed':len(changed),'prototypeFingerprints':report['preservedPrototypeFingerprints'],'failed':[c['name'] for c in checks if not c['passed']]},indent=2));sys.exit(0 if report['result']=='PASS' else 1)
