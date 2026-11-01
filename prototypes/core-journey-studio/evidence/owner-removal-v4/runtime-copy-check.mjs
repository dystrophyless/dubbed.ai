import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../..');
const baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// Scan untranslated keys and translated values, even if no UI ever requests them.
const forbidden=/\breprocess(?:ing)?\b|process[\s-]+again|process-again|process-help|included.{0,30}retry|(?:free|paid).{0,30}(?:retry|rerun)|повторн(?:ая|ой|ую).{0,30}обработ|обработать\s+снова|снова.{0,20}обработ/iu;
assert(forbidden.test('Reprocessing replaces the prepared scene'));
assert(forbidden.test('Повторная обработка заменяет подготовленную сцену'));
assert(!forbidden.test('Record again; retry saving this candidate; Result assembly retry'));
const checks=[];
for(const [folder,before] of Object.entries(baseline.targets)){
  const target=path.join(root,'prototypes',folder);
  assert.equal(sha(path.join(target,'locale.js')),before.exactExpectedLocaleAfterSha256,'Only the exact obsolete pair may change');
  const untouched=[];
  for(const [name,digest] of Object.entries(before.previousFingerprints)){
    if(name==='locale.js'||name==='BRIEF.md')continue;
    assert.equal(sha(path.join(target,name)),digest,`${folder}/${name}`);
    untouched.push(name);
  }
  const source=fs.readFileSync(path.join(target,'locale.js'),'utf8');
  const context={};vm.createContext(context);
  vm.runInContext(source.slice(0,source.indexOf('export '))+'\nglobalThis.dictionary=ru;',context);
  const entries=Object.entries(context.dictionary);
  for(const [key,value] of entries){assert(!forbidden.test(key),`Retired key: ${key}`);assert(!forbidden.test(value),`Retired translation: ${value}`);}
  const files=fs.readdirSync(target).filter(n=>/\.(?:js|html|css)$/.test(n));
  for(const name of files){
    const text=fs.readFileSync(path.join(target,name),'utf8');
    assert(!forbidden.test(text),`Retired runtime literal: ${folder}/${name}`);
  }
  const module=await import(pathToFileURL(path.join(target,'locale.js')).href);
  assert.equal(module.translate('My projects','ru'),'Мои проекты');
  assert.equal(module.translate('Record','ru'),'Записать');
  assert.equal(module.translate('Couldn’t save your take','ru'),'Не удалось сохранить дубль');
  checks.push({target:folder,result:'PASS',localeSha256:sha(path.join(target,'locale.js')),dictionaryPairs:entries.length,currentRuntimeFilesScanned:files,unchangedPreviousFingerprints:untouched.length});
}
const report={version:'core-journey-studio-lowfi-v4',date:'2026-10-27',result:'PASS',scope:'REMOVE-01 dictionary deletion and current-key/value/runtime absence; no visual or interaction change',checks,positiveDetectorFixtures:2,legitimateRecoveryFixture:1,limits:'Static/syntax/build check only for unused copy. Previous v3 independent49/49 browser checks and screenshots remain historical evidence for unchanged visuals/behavior; no full browser rerun claimed.'};
fs.writeFileSync(path.join(out,'runtime-copy-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',checks}));
