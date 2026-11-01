const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const issues=read(path.join(root,'live-issues-before.json')).issues;
const dir=path.join(root,'issue-61/issue-lifecycle-payloads');
const receipt=read(path.join(dir,'before-after-receipt.json'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const results=[],errors=[],globalIds=[];
for(const original of issues){
 const n=original.issue_number,p=read(path.join(dir,`issue-${n}.json`));
 const expectedKeys=['body','issue_number','repository_full_name','state','state_reason'];
 if(JSON.stringify(Object.keys(p).sort())!==JSON.stringify(expectedKeys))errors.push(`keys:${n}`);
 if(p.repository_full_name!=='dystrophyless/dubbed.ai'||p.issue_number!==n||p.state!=='open'||p.state_reason!=='reopened')errors.push(`identity/state:${n}`);
 const historical=p.body.split('## 2026-10-25 proactive visual QA correction increment')[0];
 let position=0,preserved=0;
 for(const line of original.body.replace(/\r/g,'').split('\n').filter(s=>s.trim()&&!/^#{1,6} /.test(s))){
  const found=historical.indexOf(line,position);
  if(found<0){errors.push(`missing original line:${n}:${line.slice(0,90)}`);break;}
  position=found+line.length;preserved++;
 }
 const review=fs.readFileSync(path.join(root,'../proactive-visual-qa-2026-10-25',`issue-${n}/review.md`),'utf8');
 const expected=[...review.matchAll(/^#{2,4}[^\n]*?\b(QA-\d+-\d+)/gm)].map(m=>m[1]).filter(id=>id.startsWith(`QA-${n}-`)).sort();
 const actual=[...p.body.matchAll(/^- \[ \] \*\*(QA-\d+-\d+)/gm)].map(m=>m[1]).sort();
 if(JSON.stringify(expected)!==JSON.stringify(actual))errors.push(`QA IDs:${n}:${JSON.stringify({expected,actual})}`);
 globalIds.push(...actual);
 if(!/## Workflow status\s+in_progress/.test(p.body))errors.push(`workflow:${n}`);
 const rec=receipt.issues.find(x=>x.issue_number===n);
 if(hash(original.body)!==rec.before_body_sha256||hash(p.body)!==rec.planned_body_sha256)errors.push(`hash:${n}`);
 results.push({issue:n,before:hash(original.body),planned:hash(p.body),preservedNonheadingLines:preserved,qaIds:actual});
}
if(results.length!==21||globalIds.length!==87||new Set(globalIds).size!==87||fs.existsSync(path.join(dir,'issue-76.json')))errors.push('scope/count');
const readbackPath=path.join(root,'root-open-issues-readback.json');
if(fs.existsSync(readbackPath)){
 const current=read(readbackPath).issues;
 for(const original of issues){
  const n=original.issue_number,p=read(path.join(dir,`issue-${n}.json`)),live=current.find(x=>x.issue_number===n);
  if(!live||live.body!==p.body||live.state!=='open'||live.state_reason!=='reopened')errors.push(`live body/state:${n}`);
  for(const k of ['title','labels','assignees','milestone','comments'])if(JSON.stringify(live?.[k])!==JSON.stringify(original[k]))errors.push(`live metadata:${n}:${k}`);
 }
 const future=current.find(x=>x.issue_number===76);
 if(!future||future.state!=='open'||!/## Workflow status\s+blocked/.test(future.body)||!/defers.*real.adapter.*future follow-up/i.test(future.body))errors.push('future76 disposition');
}
const result={date:'2026-10-25',reviewer:'Root',issues:results.length,qaIds:globalIds.length,uniqueQaIds:new Set(globalIds).size,errors,results,pass:errors.length===0};
fs.writeFileSync(path.join(root,'root-payload-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,issues:result.issues,qaIds:result.qaIds,errors},null,2));
if(errors.length)process.exitCode=1;
