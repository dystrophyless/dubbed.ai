from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[4]
def read(n):return (ROOT/n).read_bytes().decode('utf-8').replace('\r\n','\n')
def write(n,s):
 p=ROOT/n;e='\r\n' if b'\r\n' in p.read_bytes() else '\n';p.write_bytes(s.replace('\n',e).encode('utf-8'))
def lines(s,m):
 for needle,new in m.items():
  hits=[l for l in s.splitlines() if (l.startswith(needle) if needle.startswith('|') else needle in l)]
  if not hits and new and new in s:continue
  assert len(hits)==1,(needle,len(hits));s=s.replace(hits[0],new)
 return s

n='_docs/business-requirements/BR-001_custom_video_dubbing.md';s=read(n)
s=lines(s,{
'| BR-001-R08 |':'| BR-001-R08 | Owner2026-10-27 removed user-initiated whole-section repeat preparation entirely, including included/paid reruns and first-take eligibility/reset rules. Technical-failure recovery of initial preparation remains; never reset protected recordings. | Latest direct owner amendment |',
'| BR-001-R20 |':'| BR-001-R20 | No repeat-preparation allowance or paid rerun exists. Technical failures retain existing charge/reservation/recovery protections; internal worker retries never create duplicate charges. Recording, listening, reopen and download incur no additional preparation credits under declared limits. | Latest direct owner amendment; existing billing safety |',
'| Wrong text, speaker, or clipped first word |':'| Wrong text, speaker, or clipped first word | Perform supplied turns as-is or start a normal new project; no manual correction, targeted repair or same-project reset. |',
'| Entirely missed line after recording began |':'| Entirely missed line after recording began | No manual addition or same-project preparation reset; ordinary new-project credit/slot rules apply. |',
'| Duration pricing, included retry, failure protection':'| Duration pricing, failure protection, trial coverage | Earlier proposal/owner discussion | Current quote is1credit/second rounded up and120 welcome credits; included/paid reruns were removed2026-10-27. Failure/cancellation safety remains; USD packs remain evidence-dependent. |',
'Explain the two-minute scope, best-effort preparation':'Explain two-minute scope, best-effort preparation, exact credit quote, technical-failure recovery, project limits and deletion consequences at relevant actions. Headphones are recommended, not mandatory. No unlimited/perfect-audio/untested-latency promises or repeat-preparation entitlement.',
});write(n,s)

n='_docs/specifications/SPEC-001_dubbed_mvp.md';s=read(n)
s=lines(s,{
'| Preparation attempt | One user-authorized':'| Preparation attempt | One authorized initial preparation or explicit recovery of a confirmed technical failure. Internal worker retries are not new billable attempts; unknown outcomes reconcile existing identity. Delivered preparation has no user rerun/reset. |',
'Model outputs are proposals until validated':'Model outputs require validated activation against authorized source/selection/project revisions. Stale/deleted/superseded output cannot replace current protected state; charge settlement follows §4.7.',
'Before eligible reprocessing, warn':'No user-requested rerun/reset of delivered preparation exists. Technical recovery cannot discard recording drafts or accepted media; candidate/operation/revision safety remains.',
'Whole-selected-section AI reprocessing is available':'User-initiated whole-section repeat preparation is removed by owner2026-10-27, before and after recording. No allowance, paid quote, first-save eligibility lock, reset confirmation or same-project bypass. Poor supplied segmentation is performed as-is or handled by a normal new project.',
'Reserve the quote when the user authorizes processing':'Reserve the exact quote at explicit initial-preparation authorization and settle complete delivery before subjective approval. Dissatisfaction is not failure/refund. System/required-background failure releases reservation and preserves protected work for technical recovery. Successful zero-dialogue delivery remains charged and offers another video, no manual addition or Record/Result. Internal worker retries/unknown-operation reconciliation cannot duplicate the charge; no project repeat allowance or paid rerun exists.',
'- Before recording begins, a processing change':'- Validate initial preparation before recording; stale, deleted or superseded technical completions cannot replace active source/turn/media revisions. Exclusive capture, candidate acceptance and immutable assembly authorization remain authoritative.',
'**AC-07 Reprocessing:**':'- [ ] **AC-07 No preparation reset:** no user-requested rerun action, service command, entitlement, quote or first-take lock. Technical failure recovery/reconciliation remains identity-bound and preserves protected media.',
'**AC-20 Included use:**':'- [ ] **AC-20 No repeat entitlement:** no included/paid preparation rerun. Internal worker retry and unknown-result reconciliation cannot duplicate accounting; recording/listening/reopen/download add no preparation charge.',
'**AC-21 Trial:**':'- [ ] **AC-21 Trial:** exactly120 non-expiring one-time welcome credits per eligible verified account, no duplicate grant; covers maximum120-second initial preparation. No repeat-preparation entitlement.',
'| AC-07 |':'| AC-07 | Assert reset/rerun command, action and entitlement absence at every recording state; exercise technical-failure and unknown-result recovery | Existing operation/account/revision fences and charge/media safety; no duplicate work or reset side effect. |',
'| AC-20 |':'| AC-20 | Initial delivery, technical failure, internal retry, unknown reconciliation and recording/listening/download | Exact ledger/reservation transitions, no duplicate charge and no project repeat allowance. |',
'| D05 |':'| D05 | Withdrawn2026-10-27: former first-saved-take reset lock no longer applies because user-requested repeat preparation is removed. | Latest direct owner amendment | Initial-processing/capture/account/revision safety remains. |',
'| D13 |':'| D13 | Withdrawn2026-10-27: no same-project delivered-preparation replacement/reset consent or draft deletion feature remains. | Latest direct owner amendment | Technical callbacks and recovery must preserve protected media. |',
});s=s.replace(', included-retry eligibility','');write(n,s)

n='_docs/frontend-implementation-contract.md';s=read(n).replace('Settings/reprocessing remain honest neighboring boundaries','Settings remains an honest neighboring boundary').replace('The first accepted take permanently locks reprocessing. ','').replace('Zero-turn reprocessing preserves the prior usable preparation and draft. ','')
s=lines(s,{'- Flow 07 `OPEN-F07-X02`':'- Flow07 OPEN-F07-X02 no longer describes a draft-reset feature: owner2026-10-27 removed all user-requested repeat preparation. Technical failure/reconciliation preserves protected media; no new cleanup policy is defined.'})
s+='\n## Owner removal -2026-10-27\n\nNo user-initiated whole-section repeat preparation exists in UI, typed commands, mock handlers, fixtures, accounting entitlements or quotes. Preserve initial technical-failure recovery, cancellation/account/ledger safety, identity-bound unknown-outcome reconciliation, rerecording, and immutable Result assembly retry. Published issue alignment remains held; this amendment does not authorize integration or external updates.\n';write(n,s)

for n in ['_docs/frontend-flows/06-new-dub.md','_docs/frontend-flows/07-processing.md','_docs/frontend-flows/09-record.md','_docs/frontend-flows/12-credits.md']:
 s=read(n)
 s=re.sub(r'^.*included-retry (?:availability/consumption state|eligibility information|eligibility;|accounting facts).*\n','',s,flags=re.M)
 s=s.replace(', included-retry eligibility','').replace(' or reprocessing lock','').replace(', retry consumption,',',').replace('and retry consequence','and accounting consequence').replace('and included-retry consumption','and duplicate-charge protection')
 s=re.sub(r'^- Prove included-retry success.*\n','- Verify confirmed technical failure recovery and terminal cancellation retain existing accounting protections without a project rerun allowance.\n',s,flags=re.M)
 write(n,s)
n='_docs/frontend-flows/00-shared-contract.md';s=read(n).replace('Cancellation billing and included-retry consumption remain governed by the existing confirmed rules; this answer changes navigation, not those entitlements.','Cancellation billing remains governed by the existing confirmed rules; navigation does not authorize or charge another attempt. No project repeat-preparation entitlement exists.');write(n,s)
n='_docs/frontend-flows/affect-ui-clean-light-reference.md';s=read(n).replace('backend cancellation/cost/race/reprocessing rules','initial-processing cancellation/cost/race/technical-recovery rules');write(n,s)
n='_docs/frontend-flows/README.md';s=read(n).replace('Preparation progress, cancellation and reprocessing','Initial preparation progress, cancellation and technical recovery');write(n,s)
for n in ['_docs/task-drafts/frontend-flows/README.md','_docs/task-drafts/frontend-flows/preparation_progress_cancel_and_reprocess.md']:
 s=read(n).replace('Reconcile preparation progress, cancellation and safe reprocessing','Reconcile initial preparation progress, cancellation and technical recovery')
 if n.endswith('preparation_progress_cancel_and_reprocess.md'):s+='\nOwner2026-10-27 removed user-requested repeat preparation. Link/title here reflects local current scope; the published issue title/body remain stale and require authorized alignment. This remains a link stub, not a replacement issue body.\n'
 write(n,s)
n='_docs/HANDOFF.md';s=read(n);anchor='## Current scope and status\n';s=s.replace(anchor,anchor+'\n2026-10-27 latest amendment: remove user-initiated whole-section repeat preparation from both prototype runtimes and active requirements. Initial technical-failure recovery, unknown-operation reconciliation and Result assembly retry remain. The original high-fi approval is historical with this explicit narrow owner amendment. Studio-v3 must keep dialogue outside the video and use coherent shared edges; integration/contract-package dispatch, GitHub mutations, commit and push remain held.\n',1);write(n,s)
for n in ['brainstorm.md','_docs/PROJECT_BRAINSTORM.md']:
 s=read(n);first=s.index('\n');s=s[:first+1]+'\nCurrent owner amendment2026-10-27: user-initiated whole-section repeat preparation, its free project allowance and paid reruns are removed. Initial technical-failure recovery and identity-bound reconciliation remain; Result assembly retry/rerecording are distinct. Older discussion below/linked is historical provenance, not current authority for the removed feature. Active shared/flow/BR/SPEC contracts carry the removal; integration remains held.\n'+s[first+1:];write(n,s)
print('BR/SPEC/implementation, active source catalog/index and published-link labels aligned; historical brainstorm marked superseded. No GitHub writes.')
