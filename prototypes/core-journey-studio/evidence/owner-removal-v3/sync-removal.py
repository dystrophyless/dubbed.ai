"""Owner-directed removal only; preserves unrelated pre-existing dirty contract text."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[4]

def read(name):
    return (ROOT/name).read_bytes().decode('utf-8').replace('\r\n','\n')

def write(name,text):
    p=ROOT/name
    ending='\r\n' if b'\r\n' in p.read_bytes() else '\n'
    p.write_bytes(text.replace('\n',ending).encode('utf-8'))

def section(text,heading,replacement):
    m=re.search('^'+re.escape(heading)+'$',text,re.M)
    assert m,heading
    level=len(heading)-len(heading.lstrip('#'))
    nxt=re.search(r'^#{1,'+str(level)+r'} ',text[m.end():],re.M)
    end=m.end()+nxt.start() if nxt else len(text)
    return text[:m.start()]+replacement.rstrip()+'\n\n'+text[end:]

def lines(text,mapping):
    for needle,new in mapping.items():
        matches=[line for line in text.splitlines() if needle in line]
        assert len(matches)==1,(needle,len(matches))
        text=text.replace(matches[0],new)
    return text

shared='_docs/frontend-flows/00-shared-contract.md'
s=read(shared)
for heading in ['## Visible reprocessing action in recording','## Reprocessing with an unaccepted draft','## Zero-turn reprocessing preserves usable preparation']:
    s=section(s,heading,'')
s=s.replace('Logical replacement follows the later confirmed acceptance/reprocessing rules;','Logical take replacement follows durable candidate acceptance;')
s=lines(s,{
'- Before the first accepted take, Process again': '- User-initiated whole-section repeat preparation is removed by owner decision2026-10-27. No action, entitlement, quote or service command exists for rerunning a delivered preparation. Technical-failure recovery, identity-bound unknown-outcome reconciliation and Result assembly retry remain distinct and available under their existing contracts.',
'120 one-time non-expiring welcome credits': '120 one-time non-expiring welcome credits per verified eligible account. Preparation quote is ceil(selected seconds),1credit/sec;2free slots,10after first purchase. No project repeat-preparation allowance or paid rerun exists. System preparation failure is free; technical retry/reconciliation does not duplicate a charge. Running cancellation discloses completed-stage-only cost; production allocation remains unresolved. No manual edits, translation, performance scoring, cloned voices, multi-take library, full editor or incomplete export. Output up to720p MP4, orientation preserved, no added subtitles; original voices replaced while background remains. Authentication/account/deletion, current-project retention and download-only distribution rules are unchanged.',
'The owner explicitly removed Prepare': 'The owner removed Prepare and all manual correction from the MVP, including missed-line addition. No background-only preview/check/approval. Processing with usable turns goes directly to Record; transcript text is optional guidance. Segmentation quality is a requirement, not a perfect-accuracy promise. Perform a supplied poor turn as-is or start another normal project. Zero turns show No dialogue found and another-video recovery, never Record/Result. No repeat preparation exists. Flow08 remains withdrawn; stable flow IDs remain.',
'No correction or repair of a poorly segmented': 'No repair of a poorly segmented recording turn is provided. Perform the supplied turn as-is or start a new project under ordinary credit/slot rules. No targeted AI repair, manual correction, skip/export-original fallback or same-project whole-section reset; no new refund or entitlement.',
'Zero-turn recovery was subsequently resolved': 'Zero-turn recovery: show No dialogue found, offer another video through New dub, and do not enter Record/Result. A successfully delivered zero-turn attempt remains charged; it is not a technical failure.',
'When automatic processing finds no recording turns': 'When automatic processing finds no recording turns, show No dialogue found / Реплики не найдены and offer another video through New dub. Never enter Record or assemble a speechless result; manual additions remain excluded. The successful zero-turn charge is unchanged; no extra retry entitlement or refund is granted.',
})
write(shared,s)

name='_docs/frontend-flows/07-processing.md';s=read(name)
s=section(s,'### 3.2 Entry for reprocessing','### 3.2 Technical-failure recovery\n\nOnly recovery from a confirmed technical failure of the initial preparation remains. Resolve the authoritative failed attempt and its accounting before presenting the existing retry; unknown/pending outcomes reconcile the same operation identity and never blindly start another command. No rerun of delivered preparation, free project allowance, paid repeat class, recording-state reset or Record launch control exists.')
s=section(s,'### 16.4 Preparation safety tests','### 16.4 Preparation safety tests\n\n- Retry only confirmed technical failure, preserving source/selection/project/slot and existing accounting protections.\n- Reconcile unknown start/cancel/activation by operation identity without duplicate authorization or charge.\n- Fence deleted/superseded projects and stale worker completions; none can replace current state or erase recording drafts.\n- Assert no rerun-delivered-preparation command, allowance, quote, reset or UI entry exists.')
s=section(s,'## Record launch visibility - approved core journey','')
s=lines(s,{
'# Flow 07 —':'# Flow 07 — Initial preparation processing, cancellation and technical recovery',
'- the one included retry':'',
'- later paid whole-section':'',
'- preservation of the prior usable preparation during reprocessing':'- safe initial preparation activation, preserving existing state against stale/deleted/superseded operations.',
'- safe replacement activation after confirmation':'- validated activation bound to the authorized source/selection/project revision; and',
'- the Record workspace, playback':'- the Record workspace, reference audition or recording controls (Flow09);',
'- recording or the first-successfully-saved-take event':'- recording acceptance or its exclusive-access grant;',
'4. A successfully delivered zero-dialogue':'4. A successfully delivered zero-dialogue preparation remains charged. Show No dialogue found / Реплики не найдены and another-video recovery; never enter Record/Result or create a speechless export. This does not grant a refund or project retry allowance.',
'7. Every project has exactly one included':'7. User-requested repeat preparation is removed for every project, before and after recording. There is no included allowance or paid rerun.',
'8. Later eligible reprocessing':'8. Technical failure is not delivered preparation. Preserve its existing free-failure, accounting and explicit recovery protections; uncertain outcomes reconcile rather than trigger new work.',
'9. Whole-section reprocessing':'9. Record, Processing and Projects expose no reset/rerun command or first-take eligibility lock for a removed feature.',
'10. The revised MVP contains no user-editable':'10. The MVP has no user-editable preparation. Processing cannot discard an existing recording candidate or accepted take.',
'16. After the first accepted take':'16. A user who dislikes supplied segmentation performs it as-is or starts a new project under normal credit/slot rules; no correction, targeted re-slice or same-project reset.',
'17. An unaccepted recorded candidate':'17. Technical callbacks, retry, cancellation or failed activation cannot auto-accept or delete an unaccepted recording candidate; preserve durable draft/account/revision safety.',
'| Complete validated reprocessing activated':'',
'| Failed or cancelled reprocessing':'',
'| Initial complete validated zero-turn':'| Initial complete validated zero-turn preparation | Show No dialogue found / Реплики не найдены and another video; no Record/Result entry |',
'| Complete zero-turn reprocessing':'',
'| Included retry |':'',
'| Later paid reprocessing |':'',
'For the included retry, production services':'Technical recovery retains explicit authoritative accounting and idempotent operation identity. A failed attempt is not a successful delivery or a new project entitlement.',
'| `no_dialogue` |':'| `no_dialogue` | A complete validated successful attempt contains no recordable turns | Show another-video recovery, unchanged successful charge and no Record/Result entry. |',
'- permanent reprocessing-lock state;':'',
'During initial preparation, Record is the pending':'Record is the pending destination only after authoritative usable preparation. Availability is never inferred from a completed animation. No delivered-preparation reset is offered.',
'- included retry: included status':'',
'- reprocessing: the current automatic':'',
'- reprocessing with an unaccepted draft:':'',
'Show the stable workspace frame and project':'Show the stable workspace frame and authoritative project identity. Preserve geometry with flat placeholders, no shimmer. Do not invent credit, progress, entitlement or stage values.',
'Cancellation entry states that queued':'Queued cancellation is free; claim completion only after authoritative terminal cancellation and reservation release.',
'- included-retry consumption when':'',
'- preservation of the prior active preparation for a reprocessing':'- preservation of source/selection and all protected project state.',
'Show the authoritative terminal accounting and allowance':'Show authoritative terminal accounting. After initial cancellation return to New dub with saved source/interval; changes request a fresh exact quote and require a new deliberate processing authorization. Navigation never reserves or starts work.',
'- the included retry remains available':'',
'- the prior usable automatic preparation remains active for reprocessing':'- source, selection and protected project state remain available.',
'If reprocessing output completes after':'If output completes after project deletion, supersession or a newer authoritative attempt, reject stale activation and preserve current state. Production billing for completed non-activatable output remains an explicit technical gate; the UI cannot choose it.',
'An initial complete validated successful attempt with zero':'A complete validated successful zero-turn attempt enters no_dialogue and keeps the successful charge. Show No dialogue found / Реплики не найдены and another-video/New dub action. No turn fabrication, Record/Result entry, manual correction or speechless output.',
'If a reprocessing attempt completes successfully':'',
'| Reprocessing lock appears concurrently':'',
'| Reprocessing returns zero turns':'',
'- Any unaccepted recording candidate remains':'- An unaccepted recording candidate remains account-owned and recoverable under the shared no-expiry rule. Processing/technical recovery never auto-accepts or deletes it. Physical cleanup remains technical policy.',
'| Reprocessing title |':'',
'| Retry preserved |':'',
'- an initial complete validated successful zero-turn outcome':'- a complete validated successful zero-turn outcome with terminal accounting, another-video action and no Record/Result handoff;',
'- a complete validated successful zero-turn reprocessing':'',
'- initial, included-retry, and paid-reprocessing classes;':'- initial authorization, confirmed technical failure recovery and identity-bound uncertain-outcome reconciliation;',
'- initial successful charged zero-turn completion':'- successful charged zero-turn completion with another-video recovery and no Record/Result handoff;',
'- successful charged zero-turn reprocessing':'',
'- reprocessing success, failure, cancellation':'- no delivered-preparation rerun, project allowance or reset control/command;',
'- reprocessing with an unaccepted draft,':'- technical failure, cancellation, stale activation and project deletion preserving protected media;',
'- authoritative reprocessing lock enforcement':'- authoritative deletion/supersession fences and idempotent technical recovery;',
'**AC-F07-03 —':'- **AC-F07-03 — Queued cancellation:** terminal queued cancellation costs zero and releases reservation; UI waits for authoritative outcome.',
'**AC-F07-05 —':'- **AC-F07-05 — Failure protection:** technical/required-background failure activates no preparation, charges no preparation credits and preserves protected source/project/media for explicit recovery.',
'**AC-F07-06 —':'- **AC-F07-06 — Technical recovery:** retry only confirmed technical failure under existing accounting rules; unknown outcomes reconcile the same identity without duplicate work/charge. No included or paid project-rerun entitlement.',
'**AC-F07-07 —':'- **AC-F07-07 — Removed reset:** no user-initiated whole-section rerun action, command, eligibility lock or quote exists at any recording stage.',
'**AC-F07-08 —':'- **AC-F07-08 — Safe activation:** activate only complete validated authorized initial output; deletion, stale revision or supersession wins. No callback deletes recording drafts or replaces protected accepted media.',
'**AC-F07-19 —':'- **AC-F07-19 — Zero turns:** a complete zero-turn attempt remains successfully charged, shows No dialogue found and another video, never Record/Result/manual-add/speechless output.',
'**AC-F07-22 —':'- **AC-F07-22 — Draft protection:** technical recovery/cancellation/activation failure cannot auto-accept or delete a recording candidate; account/revision fences remain.',
'- Prove queued cancellation settles zero,':'- Prove terminal queued cancellation settles zero and releases reservation.',
'- Prove paid reprocessing uses':'- Prove no successful-delivery rerun entitlement, paid quote or command is exposed.',
'- Complete an initial successful zero-turn attempt;':'- Complete a successful zero-turn attempt: charge unchanged, No dialogue found/another video, no Record/Result.',
'- Complete successful zero-turn reprocessing':'',
'| Record flow | Visible':'| Record flow | Validated nonempty preparation, source/selection/timing revisions | Direct Record handoff; no reset/rerun command or recording UI inside Processing |',
'**OPEN-F07-X02 —':'- **OPEN-F07-X02 — Withdrawn feature:** the former draft-reset decision no longer applies. Preserve account-owned candidates; no repeat-preparation reset exists. Physical cleanup timing remains technical evidence.',
})
s=s.replace('processing/reprocessing behavior','initial-processing/technical-recovery behavior').replace('included-retry state and permanent-lock state','technical-failure recovery state').replace('exact charge, release/return amount where defined, and included-retry consequence','exact charge and release/return amount where defined').replace('terminal accounting and retry-allowance facts','terminal accounting facts').replace('available-balance, reservation, and retry facts','available-balance, reservation and technical-recovery facts').replace('active prior preparation and candidate replacement/activation facts','authorized initial preparation candidate/activation facts').replace('unaccepted-draft identity/state, when present, and whether the required replacement/deletion warning has been acknowledged for the current authorization','protected unaccepted-draft identity/state when present; no deletion authorization is implied').replace('reset outcome, terminal accounting, and authoritative deletion outcome for any warned unaccepted draft','terminal accounting and unchanged protected recording-draft state')
write(name,s)

print('Shared and Flow07 removal synchronized; initial billing, technical recovery and operation identity preserved.')
