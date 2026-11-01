import json,hashlib,re
from pathlib import Path
root=Path('.');audit=root/'prototypes/core-journey-studio/evidence/owner-removal-v3';baseline=json.loads((audit/'baseline.json').read_text());author=json.loads((audit/'doc-check-results.json').read_text());changed={x['path']:x for x in author['changedCanonicalFiles']};result={'baselineFiles':len(baseline['beforeSha256']),'changedFiles':len(changed),'unexpectedChanges':[],'changedCurrentHashMismatches':[],'originalChanged':[],'originalCurrentMismatches':[],'removedCopyHits':[]}
for f,h in baseline['beforeSha256'].items():
 actual=hashlib.sha256((root/f).read_bytes()).hexdigest()
 if f in changed:
  if actual!=changed[f]['after']:result['changedCurrentHashMismatches'].append(f)
 elif actual!=h:result['unexpectedChanges'].append(f)
old=root/'prototypes/core-journey-lowfi';om=json.loads((old/'evidence/version.json').read_text())
for f,h in baseline['originalBeforeSha256'].items():
 if hashlib.sha256((old/f).read_bytes()).hexdigest()!=h:result['originalChanged'].append(f)
for f,h in om['sha256'].items():
 if hashlib.sha256((old/f).read_bytes()).hexdigest()!=h:result['originalCurrentMismatches'].append(f)
for name in ['core-journey-studio','core-journey-lowfi']:
 for f in ['index.html','src.js','ui.js','locale.js','studio.css' if name.endswith('studio') else 'highfi.css']:
  for i,line in enumerate((root/'prototypes'/name/f).read_text(encoding='utf-8').splitlines(),1):
   for term in ['Reprocessing replaces','Process again','One included retry','oneIncludedRetry','reprocess-warning']:
    if term in line:result['removedCopyHits'].append({'file':f'prototypes/{name}/{f}','line':i,'term':term})
result['changedDocPaths']=list(changed);result['unchangedBaselineFiles']=len(baseline['beforeSha256'])-len(changed);result['historicalOriginalFilesUnchanged']=len(baseline['originalBeforeSha256'])-len(result['originalChanged']);result['authorCheckCount']=len(author['checks']);result['issueReadbackNumbers']=[x['number'] for x in json.loads((audit/'issue-readback.json').read_text())['matches']];(root/'prototypes/core-journey-studio/review/v3-removal-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
