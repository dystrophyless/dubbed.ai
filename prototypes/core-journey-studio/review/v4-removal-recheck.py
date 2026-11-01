import hashlib,json,re
from pathlib import Path

root=Path(__file__).resolve().parents[3]
out=Path(__file__).parent
audit=root/'prototypes/core-journey-studio/evidence/owner-removal-v4'
baseline=json.loads((audit/'baseline.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
pair="'Reprocessing replaces the prepared scene and unsaved takes only after confirmation. That neighboring workflow is outside this prototype.':'Повторная обработка заменяет подготовленную сцену и несохранённые дубли только после подтверждения. Этот соседний сценарий не входит в прототип.',".encode('utf-8')
forbidden=re.compile(r'reprocess|process[\s-]+again|included.{0,30}retry|(?:free|paid).{0,30}(?:retry|rerun)|повторн\w*.{0,30}обработ|обработать\s+снова|снова.{0,20}обработ',re.I)
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
targets=[]
for name,before in baseline['targets'].items():
    target=root/'prototypes'/name
    raw=(target/'locale.js').read_bytes()
    check(name+' exact after locale hash',sha(raw)==before['exactExpectedLocaleAfterSha256'])
    check(name+' exact deleted-pair hash',sha(pair)==before['removedPairSha256'])
    marker=b"\n 'Position within this line'"
    reconstructed=raw.replace(marker,pair+marker,1)
    check(name+' inverse insertion reproduces reviewed v3 locale bytes',sha(reconstructed)==before['localeBeforeSha256'])
    entries=re.findall(r"'((?:\\.|[^'\\])*)'\s*:\s*'((?:\\.|[^'\\])*)'",raw.decode('utf-8'))
    entries+=re.findall(r'"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"',raw.decode('utf-8'))
    check(name+' 74 remaining dictionary pairs',len(entries)==74,len(entries))
    hits=[{'key':k,'value':v} for k,v in entries if forbidden.search(k) or forbidden.search(v)]
    check(name+' no removed key/value copy',not hits,hits)
    check(name+' ordinary recovery/record translations preserved',all(k in dict(entries) for k in ['Record','My projects','Couldn’t save your take']))
    files=sorted(p for p in target.iterdir() if p.suffix in ['.js','.html','.css'])
    runtime_hits=[p.name for p in files if forbidden.search(p.read_text(encoding='utf-8'))]
    check(name+' current root runtime absence',not runtime_hits,runtime_hits)
    preserved={f:d for f,d in before['previousFingerprints'].items() if f not in ['locale.js','BRIEF.md']}
    unexpected=[f for f,d in preserved.items() if sha((target/f).read_bytes())!=d]
    check(name+' other reviewed fingerprints unchanged',not unexpected,{'count':len(preserved),'unexpected':unexpected})
    current_bytes=(target/'evidence/version.json').read_bytes();current=json.loads(current_bytes)
    mismatches=[f for f,d in current['sha256'].items() if sha((target/f).read_bytes())!=d]
    check(name+' all current manifest entries match',not mismatches,mismatches)
    targets.append({'target':name,'version':current['version'],'localeSha256':sha(raw),'manifestSha256':sha(current_bytes),'manifestEntries':len(current['sha256']),'preservedPreviousFingerprints':len(preserved),'rootRuntimeFilesScanned':[p.name for p in files]})
v3=root/'prototypes/core-journey-studio/evidence/owner-removal-v3'
doc_before=json.loads((v3/'baseline.json').read_text())['beforeSha256']
doc_after={x['path']:x['after'] for x in json.loads((v3/'doc-check-results.json').read_text())['changedCanonicalFiles']}
doc_mismatch=[f for f,h in doc_before.items() if sha((root/f).read_bytes())!=doc_after.get(f,h)]
check('All 88 reviewed documentation paths preserved since v3',not doc_mismatch,doc_mismatch)
check('English/Russian detector examples are covered',bool(forbidden.search('Reprocessing replaces the prepared scene')) and bool(forbidden.search('Повторная обработка заменяет подготовленную сцену')))
check('Ordinary save/record/assembly recovery stays permitted',not forbidden.search('Record again; retry save; Result assembly retry'))
result={'version':'core-journey-studio-lowfi-v4','date':'2026-10-27','scope':'REMOVE-01 static deletion and preservation only; no new browser claims','targets':targets,'checks':checks,'pass':sum(c['pass'] for c in checks),'total':len(checks)}
(out/'v4-removal-recheck-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
assert result['pass']==result['total']
