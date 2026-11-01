from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[4]
def read(n):return (ROOT/n).read_bytes().decode('utf-8').replace('\r\n','\n')
def write(n,s):
 p=ROOT/n;e='\r\n' if b'\r\n' in p.read_bytes() else '\n';p.write_bytes(s.replace('\n',e).encode('utf-8'))
def lines(s,m):
 for needle,new in m.items():
  hits=[l for l in s.splitlines() if needle in l];assert len(hits)==1,(needle,len(hits));s=s.replace(hits[0],new)
 return s
def section(s,h,new):
 m=re.search('^'+re.escape(h)+'$',s,re.M);assert m,h;level=len(h)-len(h.lstrip('#'));n=re.search(r'^#{1,'+str(level)+r'} ',s[m.end():],re.M);end=m.end()+n.start() if n else len(s);return s[:m.start()]+new.rstrip()+'\n\n'+s[end:]

n='_docs/frontend-flows/06-new-dub.md';s=read(n)
s=lines(s,{
'- processing progress, cancellation after authorization, retry, or reprocessing':'- processing progress, cancellation after authorization and technical-failure recovery (Flow07);',
'- The first successfully accepted saved take permanently locks':'- No user-initiated rerun/reset of delivered preparation exists. New dub cannot expose a same-project bypass.',
'- When processing detects zero recording turns,':'- Zero detected turns never enter Record/Result. Show No dialogue found / Реплики не найдены and New dub to choose another video. A successful zero-turn delivery remains charged; no refund or repeat allowance is added.',
'- If an eligible reprocessing run finds zero':'',
'- When Flow 07 reports zero detected turns,':'- Zero detected turns stay in Processing-owned No dialogue found recovery with another-video/New dub action, never Record/Result.',
'- If that zero-turn outcome came from reprocessing':'',
'| Processing completes with zero detected turns':'| Processing completes with zero detected turns | Show No dialogue found / Реплики не найдены and another video. | No Record/Result; successful delivery charge unchanged, no new entitlement. |',
'| Reprocessing completes with zero turns':'',
'- zero-turn reprocessing preservation':'',
'- Flow 07 receives the accepted attempt identity':'- Flow07 receives accepted attempt identity and owns progress/cancel/technical recovery. Usable turns hand off directly to Record. Completed initial cancellation returns source/selection for fresh quote and explicit authorization; successful zero turns offer another video, no Record/Result.',
'- A zero-turn reprocessing result cannot':'',
'- zero-turn reprocessing that preserves':'',
'**AC-F06-15 —':'- **AC-F06-15 — Zero-turn boundary:** completed zero-turn processing shows No dialogue found / Реплики не найдены and another video, never Record/Result. Successful delivery charge remains unchanged; no repeat-preparation entitlement.',
'- Verify a zero-turn result shows':'- Verify bilingual zero-turn recovery, unchanged successful-delivery charge, another-video action and no Record/Result.',
'- Verify zero-turn reprocessing preserves':'',
'| Flow 07 | Retrieve':'| Flow07 | Resolve accepted attempt; usable success enters Record; completed initial cancellation returns saved source/selection to New dub; zero turns show another-video recovery. | Processing, cancellation, reservation settlement/release, technical recovery, background status and zero-turn lifecycle. |',
});s=s.replace('targeted reprocessing','targeted AI reset');write(n,s)

n='_docs/frontend-flows/09-record.md';s=read(n)
s=section(s,'### 5.10 Process again','### 5.10 No preparation reset\n\nThe owner removed user-initiated whole-section repeat preparation on2026-10-27, including its included/paid variants. Record has no action, handler, entitlement, quote or reset warning for it. Poor segmentation is performed as supplied or handled by a normal new project; technical failure recovery belongs to initial Processing. Candidate/accepted media, acceptance guards and revision fences remain unchanged.')
s=section(s,'### Start eligible reprocessing from Record','')
s=lines(s,{
'If initial processing detects zero turns':'If initial processing detects zero turns, Record is ineligible. Remain in Processing-owned No dialogue found / Реплики не найдены recovery with another-video action. Never synthesize a turn or route to Result.',
'- processing execution/progress and its billing lifecycle':'- initial processing execution/progress, technical recovery and its billing lifecycle (Flow07);',
'If an automatically supplied turn is clipped':'If a supplied turn is poorly segmented, perform it as-is or start a normal new project under ordinary credit/slot rules. No repair or same-project preparation reset exists.',
'Reference volume belongs conceptually':'Reference volume belongs with audition/player controls and changes original/reference playback only, never captured/saved/final gain. Errors remain workspace-associated; transient notices supplement durable accessible guidance/actions for capture, ownership, unknown saves and unsaved media.',
'- **Utilities/recovery:**':'- **Recovery:** keep reference-volume access with listening controls, contextual Settings recovery and completed-project To result under §5.9. No repeat-preparation utility exists.',
'**F09-AC-19 —':'- [ ] **F09-AC-19 — Direct handoff and zero turns:** usable initial Processing enters Record directly; successful zero turns remain in No dialogue found/another-video recovery, no Record/Result.',
'**F09-AC-21 —':'- [ ] **F09-AC-21 — Continue destination:** unfinished work opens Record, completed work Result. No same-project preparation reset action/command exists at any recording stage.',
'**F09-AC-31 —':'- [ ] **F09-AC-31 — Removed preparation reset:** no repeat-preparation button, entitlement, paid quote, handler or media-reset side effect. Technical initial-failure and Result assembly recovery are preserved.',
'- Processing handoff tests for nonempty turns':'- Processing handoff tests cover usable turns and successful zero turns: No dialogue found/another video, no Record/Result for zero turns.',
'- Continue routing with unfinished takes':'- Verify Continue routing for unfinished versus completed work, with no preparation-reset entry or command.',
'- Verify secondary Process again discoverability':'- Assert the removed repeat-preparation action, command, entitlement and copy are absent before/after capture and acceptance.',
'- reprocessing with an unaccepted draft across':'',
'- **Processing flow:**':'- **Processing flow:** supplies selected section, ordered automatic turns, fixed windows/margins and revisions. Usable initial output enters Record; successful zero turns remain in another-video recovery. No same-project reset; stale technical callbacks cannot overwrite protected media.',
'- **RESOLVED-09-SEGMENTATION:**':'- **RESOLVED-09-SEGMENTATION:** perform a poor supplied turn as-is or start a normal new project; no repair/reset path.',
'- **RESOLVED-09-06A:**':'- **RESOLVED-09-06A:** Continue opens unfinished Record or completed Result. Zero detected turns stay in Processing-owned No dialogue found/another-video recovery without entering either.',
'- **RESOLVED-09-REPROCESS:**':'- **WITHDRAWN-09-REPROCESS:** owner removed user-requested repeat preparation entirely on2026-10-27. Former first-take lock, allowance, quote and reset-warning clauses are no longer requirements.',
'- delete the previous preparation/draft at reprocessing':'- delete a protected candidate/accepted take from a preparation callback or technical recovery;',
})
s=s.replace(' or whole-section reprocessing lock','').replace(', secondary Process again','').replace(' `Process again`,','').replace('or creates the permanent reprocessing lock','').replace(' or the reprocessing lock','').replace('/reprocessing-lock','').replace('reprocessing-lock mutation','acceptance mutation').replace('microphone/reprocessing/result actions','microphone/result actions').replace('current whole-section reprocessing eligibility/quote/lock reason; and ','').replace('processing replacement and result job states','initial preparation and result job states').replace('reprocessing outcomes, ','').replace(', subject to the permanent reprocessing lock after the first successfully accepted saved take','').replace('Such a processing revision cannot be created after the first successfully accepted saved take because whole-section reprocessing is then permanently locked.','User-requested preparation revisions are unavailable; stale technical responses remain fenced.').replace('or creates the reprocessing lock','').replace('no accepted-count/progress/reprocessing-lock mutation','no accepted-count/progress mutation')
write(n,s)

n='_docs/frontend-flows/10-result.md';s=read(n)
s=lines(s,{
'- Initial processing with zero generated turns':'- Initial zero-turn processing cannot enter Record/Result or create an assembly operation. Processing-owned No dialogue found / Реплики не найдены offers another video.',
'- A zero-turn reprocessing output never':'',
'- The charge for the completed zero-turn processing':'- A successful zero-turn preparation remains charged; no new entitlement or refund. It is distinct from technical failure.',
'**Errors:** zero-turn/ineligible snapshot':'**Errors:** zero-turn/ineligible snapshot, incomplete/incompatible takes, stale request revision, missing asset, deleted/inaccessible project, operation-creation failure or unavailable service. Never assemble a zero-turn snapshot. Route zero turns to Processing-owned No dialogue found/another-video recovery; ordinary nonempty accepted snapshots retain all authorization/generation invariants.',
'**AC-10-03 Zero-turn recovery:**':'- [ ] **AC-10-03 Zero-turn recovery:** successful zero-turn preparation remains charged, shows No dialogue found/another video and cannot enter Record/Result or authorize assembly. No manual addition, speech-free output or repeat-preparation entitlement.',
'- Verify eligibility matrices for missing':'- Verify eligibility for missing/unavailable/incompatible media, shorter accepted media and accepted replacement media. Successful zero-turn preparation keeps its charge, offers another video and never authorizes an assembly snapshot. Result assembly retry remains distinct from preparation and preserves its own frozen identity/authorization.',
'Zero-turn fixtures distinguish an initial attempt':'Zero-turn fixtures never authorize an assembly snapshot or enter Record/Result. Nonempty accepted snapshots retain the ordinary eligibility/authorization gate; technical failure and Result assembly retries remain separate.',
'- **Processing flow/service:**':'- **Processing flow/service:** owns automatic fixed turns and direct Record handoff. Successful zero turns show No dialogue found/another video and remain charged, never Record/Result or an assembly snapshot. No Prepare, manual correction, missed-line or background-audition stage.',
});write(n,s)

n='_docs/frontend-flows/11-projects.md';s=read(n)
s=lines(s,{
'This synchronized revision incorporates':'This revision retains validated-draft preservation, title provenance/rename rules, activity ordering, authoritative Continue routing, account-owned recording recovery, exclusive capture, credit/reservation meaning, no completion email/push, shared presentation and deletion safety. Owner2026-10-27 removes user-requested repeat preparation; successful zero-turn output offers another video and never enters Record/Result. Production event evidence remains open.',
'- Whole-section reprocessing becomes permanently':'- No user-initiated same-project preparation reset exists before or after recording; My projects cannot expose a bypass.',
'- When an initial processing attempt, or the latest attempt':'- Zero detected turns remain outside Record/Result. Show No dialogue found and another video through New dub; the successful processing charge is unchanged.',
'- When a completed reprocessing attempt detects':'',
'- Every completed zero-turn run keeps':'- Successful zero-turn delivery remains charged; it grants no refund or repeat-preparation entitlement.',
'| Latest processing attempt found no dialogue':'| Processing found no dialogue | No Record/Result; another video is available and the successful charge is unchanged | Flows06–07 |',
'| Latest reprocessing attempt found no dialogue':'',
'| Latest reprocessing attempt reports zero turns':'',
'- initial/no-active-usable zero dialogue detected':'- zero dialogue detected, with another-video recovery and no Record/Result destination;',
'- a latest reprocessing attempt with zero turns':'',
'**AC-F11-06A —':'- **AC-F11-06A — No repair/reset:** supplied turns proceed to Record as given. No transcript/speaker/timing edit, missed-line addition, background audition, targeted repair, post-preparation source replacement, same-project reset, automatic refund or slot exception. Perform as-is or start a normal new project.',
'**AC-F11-19 —':'- **AC-F11-19 — Zero-turn recovery:** successful zero-turn output stays charged, shows No dialogue found/another video and never enters Record/Result; no extra entitlement.',
'- Verify the first successfully accepted saved take':'- Verify no same-project preparation-reset action or command exists at any recording stage.',
'- Verify an initial/no-active-usable zero-turn result':'- Verify zero turns show No dialogue found/another video, never Record/Result, with unchanged successful charge.',
});s=s.replace('retry, or reprocessing details','technical-failure recovery details').replace('retry/reprocessing rules','initial-preparation authorization/technical-recovery rules');write(n,s)

n='_docs/frontend-flows/12-credits.md';s=read(n).replace('eligible reprocessing or another-video recovery','another-video recovery')
s=lines(s,{'- later paid reprocessing settlement;':'','- Verify one unified chronological feed':'- Verify one unified chronological feed with welcome grant, pending/verified purchase, initial preparation reservation/settlement/release, credit return/refund, system-failure no-charge, queued cancellation and running-cancellation fixtures. Technical recovery never duplicates the original charge; no repeat-preparation allowance or paid rerun records are created.'});write(n,s)
print('Flows06/09/10/11/12 synchronized; transport, acceptance, Result retries, billing and candidate identity retained.')
