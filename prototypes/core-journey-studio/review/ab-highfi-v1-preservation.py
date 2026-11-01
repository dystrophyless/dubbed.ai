from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[3];out=Path(__file__).parent;a=root/'prototypes/core-journey-lowfi';b=root/'prototypes/core-journey-studio';checks=[];targets=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check(n,ok,d=None):checks.append({'name':n,'pass':bool(ok),'detail':d})
for label,p in [('A',a),('B',b)]:
 baseline=json.loads((p/'evidence/ab-highfi-v1/baseline.json').read_text());manifest_bytes=(p/'evidence/version.json').read_bytes();manifest=json.loads(manifest_bytes)
 bad=[f for f,h in manifest['sha256'].items() if sha(p/f)!=h];check(label+' current manifest match',not bad,bad)
 changes=[f for f,h in baseline['fingerprints'].items() if sha(p/f)!=h]
 check(label+' bounded prior source changes',set(changes)<={'BRIEF.md','README.md','index.html','src.js','ui.js','locale.js','result-player.js'},changes)
 canonical=[]
 for f,h in baseline['canonicalDocsSha256'].items():
  if f=='_docs/HANDOFF.md':
   text=(root/f).read_bytes().decode('utf-8');restored=re.sub(r'\r?\n2026-10-27 owner approved[^\r\n]*\r?\n','',text,count=1);actual=hashlib.sha256(restored.encode('utf-8')).hexdigest()
  else:actual=sha(root/f)
  if actual!=h:canonical.append(f)
 check(label+' canonical preservation except exact checkpoint note',not canonical,canonical)
 runtime=[f for f in p.iterdir() if f.suffix in ['.js','.html','.css']]
 retired=[f.name for f in runtime if re.search(r'reprocess|process[\s-]+again|повторн\w*.{0,30}обработ',f.read_text(encoding='utf-8'),re.I)]
 check(label+' removed preparation feature absent',not retired,retired)
 source=(p/'src.js').read_text(encoding='utf-8');html=(p/'index.html').read_text(encoding='utf-8')
 check(label+' no fake speaker or legend hooks',not re.search(r'Shaman|speaker\s*:|id=["\x27](?:panel-)?speaker|wave-key',source+html))
 check(label+' fixed source dialogue/timing and mock delays',all(s in source for s in ['start:0,end:5.1','start:5.1,end:8.5','start:8.5,end:13.4','setTimeout(r,500)','},1800)']))
 targets.append({'variant':label,'version':manifest['version'],'manifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'entries':len(manifest['sha256']),'priorFingerprintCount':len(baseline['fingerprints']),'priorChanged':changes,'priorPreserved':len(baseline['fingerprints'])-len(changes)})
for f in ['icons.js','ui.js','locale.js','toast.js','waveform-data.js','result-player.js','result-player.css','comparison-components.css','comparison-lab.css']:
 check('Shared byte-identical '+f,sha(a/f)==sha(b/f))
check('Shared presentation recipe with retained line endings',(a/'presentation.css').read_text(encoding='utf-8')==(b/'presentation.css').read_text(encoding='utf-8'))
for f in ['scene.mp4','example-dub.mp4','take-0.wav','take-1.wav','take-2.wav']:check('Identical paired media '+f,sha(a/'public/media'/f)==sha(b/'public/media'/f))
for name in ['acceptAndMove','showResult']:
 def extract(p):
  s=(p/'src.js').read_text(encoding='utf-8');m=re.search(r'^(?:async )?function '+name+r'\(.*?^}',s,re.M|re.S);assert m;return m.group(0)
 check('Protected workflow equivalent '+name,extract(a)==extract(b))
references=json.loads((b/'evidence/ab-highfi-v1/calibration-results.json').read_text())['references'];portable=json.loads((root/'_docs/evidence/affect-ui-clean-light/manifest.json').read_text());expected={x['snapshot_relative_path']:x['sha256'] for x in portable['files']}
check('Eight selected Clean/Light references pinned to portable source',len(references)==8 and all(sha(root/f)==h==expected[f.split('_docs/evidence/affect-ui-clean-light/')[1]] for f,h in references.items()))
report={'pairVersion':'core-journey-ab-highfi-v1','date':'2026-10-28','targets':targets,'checks':checks,'pass':sum(x['pass'] for x in checks),'total':len(checks)};(out/'ab-highfi-v1-preservation-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
