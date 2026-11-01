from pathlib import Path
import hashlib,json,re,subprocess,sys
root=Path(__file__).resolve().parents[4];a=root/'prototypes/core-journey-lowfi';b=root/'prototypes/core-journey-studio';out=b/'evidence/ab-highfi-v1';checks=[];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check(name,value,**detail):checks.append(dict(name=name,passed=bool(value),**detail))
for folder in [a,b]:
 base=json.loads((folder/'evidence/ab-highfi-v1/baseline.json').read_text(encoding='utf-8'));allowed={'BRIEF.md','README.md','index.html','src.js','ui.js','locale.js','result-player.js'};changes=[]
 for f,h in base['fingerprints'].items():
  if sha(folder/f)!=h:changes.append(f)
 check('Only bounded prior files changed: '+folder.name,set(changes)<=allowed,changed=changes,unchangedPriorFingerprintCount=len(base['fingerprints'])-len(changes),priorFingerprintCount=len(base['fingerprints']))
 for f,h in base['canonicalDocsSha256'].items():
  if f=='_docs/HANDOFF.md':
   raw=(root/f).read_bytes();text=raw.decode('utf-8');restored=re.sub(r'\r?\n2026-10-27 owner approved[^\r\n]*\r?\n','',text,count=1);check('HANDOFF only bounded approval/hold paragraph',hashlib.sha256(restored.encode('utf-8')).hexdigest()==h)
  else:check('Canonical unchanged: '+f,sha(root/f)==h)
 for f in folder.iterdir():
  if f.suffix in ['.js','.html','.css']:
   text=f.read_text(encoding='utf-8');check('Retired function runtime copy absent: '+folder.name+'/'+f.name,not re.search(r'\breprocess(?:ing)?\b|process[\s-]+again|process-help|process-again|обработать\s+снова|повторн.{0,20}обработ',text,re.I))
 html=(folder/'index.html').read_text(encoding='utf-8');source=(folder/'src.js').read_text(encoding='utf-8');check('No legend/fabricated speaker hooks: '+folder.name,not re.search(r'Shaman|speaker\s*:|id=["\'](?:panel-)?speaker|class=["\']wave-key',html+source))
 check('Fixture source durations/windows retained: '+folder.name,all(x in source for x in ["start:0,end:5.1","start:5.1,end:8.5","start:8.5,end:13.4"]))
 check('Explicit dub download target: '+folder.name,'href="/media/example-dub.mp4"' in html and 'Download My dub' in source)
 check('Assembly Retry is distinct and outside message: '+folder.name,'id="retry-assembly"' in html and 'id="fail-assembly"' in html and "state.resultAssemblyFailed" in source)
for f in ['presentation.css','icons.js','ui.js','locale.js','toast.js','waveform-data.js','result-player.js','result-player.css','comparison-components.css','comparison-lab.css']:
 check('Common calibrated behavior/component '+('text (line endings retained)' if f=='presentation.css' else 'bytes')+': '+f,(a/f).read_text(encoding='utf-8')==(b/f).read_text(encoding='utf-8') if f=='presentation.css' else sha(a/f)==sha(b/f),sha256A=sha(a/f),sha256B=sha(b/f))
for f in ['scene.mp4','example-dub.mp4','take-0.wav','take-1.wav','take-2.wav']:
 check('Matched media fixture: '+f,sha(a/'public/media'/f)==sha(b/'public/media'/f),sha256=sha(a/'public/media'/f))
check('Original and dub actually differ',sha(a/'public/media/scene.mp4')!=sha(a/'public/media/example-dub.mp4'))
def function(text,name):
 m=re.search(r'^(?:async )?function '+re.escape(name)+r'\(',text,re.M);assert m,name
 first=text[m.start():].split('\n',1)[0]
 if first.endswith('}'):return first.strip()
 end=re.search(r'^}',text[m.start():],re.M);assert end,name;return text[m.start():m.start()+end.end()].strip()
sa=(a/'src.js').read_text(encoding='utf-8');sb=(b/'src.js').read_text(encoding='utf-8')
for name in ['stop','pauseAudition','isSaveFailure','isMicFailure','atCompleteEnd','retryGuidance','seekStart','updateClock','startAudition','play','record','move','acceptAndMove','guard','showResult']:
 check('Common protected behavior: '+name,function(sa,name)==function(sb,name))
manifest=json.loads((root/'_docs/evidence/affect-ui-clean-light/manifest.json').read_text(encoding='utf-8'));expected={x['snapshot_relative_path']:x['sha256'] for x in manifest['files']};cal=json.loads((out/'calibration-results.json').read_text(encoding='utf-8'))
for f,h in cal['references'].items():
 rel=f.split('_docs/evidence/affect-ui-clean-light/')[1];check('Pinned selected reference: '+rel,h==expected[rel] and sha(root/f)==h)
reply='Короче я согласен с этим прототипом, но я хочу обе версии до конца развить что бы потом через A/B тестинг выбрать лучший';m=json.loads((b/'evidence/version.json').read_text(encoding='utf-8'));c=m['ownerLowFiCheckpoint'];check('Exact studio-v6 checkpoint1 preserved',c['ownerReply']==reply and c['status']=='APPROVED' and c['version']=='core-journey-studio-lowfi-v6');check('Two candidates/no winner/local-only scope explicit','No winner is selected' in (b/'BRIEF.md').read_text(encoding='utf-8') and 'No winner is selected' in (a/'BRIEF.md').read_text(encoding='utf-8'));check('No production frontend recreated',not (root/'frontend').exists())
r=subprocess.run(['git','diff','--check'],cwd=root,capture_output=True,text=True);check('git diff --check',r.returncode==0,output=r.stdout+r.stderr);head=subprocess.run(['git','rev-parse','HEAD'],cwd=root,capture_output=True,text=True).stdout.strip()
report=dict(pairVersion='core-journey-ab-highfi-v1',date='2026-10-27',timezone='Asia/Qyzylorda',base=head,result='PASS' if all(c['passed'] for c in checks) else 'FAIL',checks=checks,limits='Static source/contract preservation checks are separate from actual browser operation,visual acceptance or real media/backend/experiment proof. Only HANDOFF approval/hold note is synchronized canonically.')
(out/'parity-preservation-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'result':report['result'],'checks':len(checks),'base':head,'failed':[c['name'] for c in checks if not c['passed']]}));sys.exit(0 if report['result']=='PASS' else 1)
