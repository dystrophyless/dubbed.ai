import './highfi.css';
import './panel-result.css';
import './panel-responsive.css';
import './video-center.css';
import './focused-exit.css';
import {createResultPlayer} from './result-player.js';
import {translate,lineLabel} from './locale.js';
import {setButton,decorateControls,paintWave,setBadge,icon,applyIcons} from './ui.js';
import {showToast,hideToast,toastVisible,toastClearance,syncToastSpace,releaseToastFloor} from './toast.js';

const $ = (id) => document.getElementById(id);
const lines = [
  {text:'What brings you to the land of the gatekeepers?',start:0,end:5.1},
  {text:'I’m searching for someone.',start:5.1,end:8.5},
  {text:'Someone very dear? A kindred spirit?',start:8.5,end:13.4},
];
const key='dubbed-lowfi-v1';
let state; try {state=JSON.parse(localStorage.getItem(key));} catch {}
state ||= {index:0,candidates:[null,null,null],accepted:[null,null,null],completed:false,view:'record'};
const locale=()=>state.locale||'en';
const t=(text)=>locale()==='ru'&&text==='Exit'?'Выйти':locale()==='ru'&&text==='Original'?'Оригинал':locale()==='ru'&&text==='Compare Original and My dub. Download always saves My dub.'?'Сравните оригинал и свой дубляж. Скачивается всегда ваш дубляж.':translate(text,locale());
let active=null, auditionSource='original', resumable=false, pointerSeeking=false, keySeeking=false, seekChanged=false, mediaAction=0, saving=false, guardDestination=state.failureDestination??null, destinationFocus=null, serial=Date.now(), message=state.failure||'', error=!!state.failure;
const video=$('scene'), audio=$('take-audio');
const resultPlayer=createResultPlayer(()=>locale());
const persist=()=>localStorage.setItem(key,JSON.stringify(state));
const line=()=>lines[state.index];
const duration=()=>line().end-line().start;
const format=(t)=>`0:${String(Math.floor(Math.max(0,t))).padStart(2,'0')}`;
function stop(){mediaAction++;video.pause();audio.pause();resultPlayer.pause();active=null;resumable=false;pointerSeeking=false;keySeeking=false;seekChanged=false;$('pause').hidden=true;}
function pauseAudition(){
  if(active!=='original'&&active!=='take')return;
  mediaAction++;video.pause();audio.pause();active=null;resumable=true;render();
}
function isSaveFailure(){return error&&message.startsWith('Couldn’t save');}
function isMicFailure(){return error&&message.startsWith('Microphone');}
function atCompleteEnd(){return state.completed&&state.index===lines.length-1&&!state.candidates[state.index]&&!isSaveFailure();}
let announcement=0;
function announceNotice(){const current=++announcement;$('notification-announcement').textContent='';requestAnimationFrame(()=>{if(current===announcement)$('notification-announcement').textContent=error?$('take-help').textContent:[$('feedback-title')?.textContent,$('feedback-copy')?.textContent].filter(Boolean).join(' ');});}
function clearNotice(keepMicrophone=false){if(keepMicrophone&&isMicFailure())return;message='';error=false;delete state.failure;delete state.failureDestination;hideToast();announcement++;$('notification-announcement').textContent='';}
function notice(text,isError=false){if(!isError&&isMicFailure()&&text.startsWith('All lines'))return;message=text;error=isError;if(isError)state.failure=text;else delete state.failure;$('feedback').dataset.notice='';render();if(text&&state.view==='record'){showToast(showRecoveryAction);announceNotice();}else {hideToast();announcement++;$('notification-announcement').textContent='';}}
function retryGuidance(){const destination=state.failureDestination??guardDestination??'next';return t(destination==='previous'?'Not saved. Take kept here. Retry returns to the previous line.':destination==='result'?'Not saved. Take kept here. Retry opens your result.':destination==='Settings'?'Not saved. Take kept here. Retry opens Settings.':destination==='My projects'?'Not saved. Take kept here. Retry opens My projects.':destination==='New dub'?'Not saved. Take kept here. Retry opens New dub.':'Not saved. Take kept here. Retry saves it, then continues.');}
const noticeClearance=toastClearance;
function revealAboveNotice(target){if(!target?.getClientRects().length)return;const r=target.getBoundingClientRect(),bottom=innerHeight-noticeClearance();if(r.bottom>bottom)scrollBy({top:r.bottom-bottom,behavior:'instant'});else if(r.top<16)scrollBy({top:r.top-16,behavior:'instant'});}
function showRecoveryAction(){
  if(innerWidth>=1248){const bottom=Math.max(document.querySelector('.timeline').getBoundingClientRect().bottom,document.querySelector('.performance').getBoundingClientRect().bottom),safeBottom=innerHeight-noticeClearance();if(bottom>safeBottom)scrollBy({top:bottom-safeBottom,behavior:'instant'});}
  else {const panel=document.querySelector('.performance'),action=isMicFailure()?$('open-settings'):isSaveFailure()?$('next'):document.activeElement;revealAboveNotice(panel.offsetHeight<=innerHeight-noticeClearance()-16?panel:action);}
}
document.addEventListener('focusin',event=>{if(!noticeClearance()||!event.target.closest('#product'))return;revealAboveNotice(event.target);});
function render(){
  const candidate=state.candidates[state.index], accepted=state.accepted[state.index], capturing=active==='record';
  $('record-view').hidden=state.view!=='record';$('result-view').hidden=state.view!=='result';
  $('main').classList.toggle('result-workspace',state.view==='result');
  $('heading').textContent=state.view==='record'?'Sintel · The search':'Your result';
  $('dialogue').textContent=$('long-line').checked?'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.':line().text;
  $('position').textContent=`Line ${state.index+1} of ${lines.length}`;
  $('saved').textContent=candidate?'New take':accepted?'Saved':'';
  $('take').disabled=(!candidate&&!accepted)||capturing||saving;
  const help=t(capturing?'Perform the line while the scene plays.':saving?'Saving this take…':isMicFailure()?'Microphone unavailable. Open Settings, then try again.':candidate?(state.index===2&&!state.completed?'Next saves this take and assembles your video.':'Next saves this take and continues.'):atCompleteEnd()?'All lines are saved. Open your result when you’re ready.':accepted?'Your saved take is ready to listen to.':'Record this line to continue.');
  const guidance=isSaveFailure()&&!saving?retryGuidance():help;if($('take-help').textContent!==guidance)$('take-help').textContent=guidance;
  $('record').textContent=capturing?'Recording…':candidate||accepted?'Record again':'Record';
  $('record').disabled=capturing||saving; $('replay').disabled=capturing||saving;
  document.querySelectorAll('[data-destination]').forEach(b=>b.disabled=capturing||saving);
  $('record').setAttribute('aria-pressed',String(capturing));
  $('previous').disabled=state.index===0||capturing||saving;
  $('next').disabled=(!candidate&&!accepted)||capturing;
  $('next').setAttribute('aria-busy',String(saving));
  $('next').textContent=saving?'Saving…':isSaveFailure()?'Retry save':atCompleteEnd()?'To result':'Next';
  $('pause').hidden=capturing||(!resumable&&active!=='original'&&active!=='take');
  $('pause').textContent=resumable?'Resume':'Pause';
  if(state.view!=='record')hideToast();$('mic-recovery').hidden=!isMicFailure();$('open-settings').disabled=capturing||saving;
  $('capture-badge').hidden=!capturing; $('product').classList.toggle('capturing',capturing);
  $('scrub').disabled=capturing||saving;$('to-result').hidden=!state.completed||state.view!=='record'||atCompleteEnd();$('to-result').disabled=capturing||saving;
  document.querySelector('.wave').dataset.hasTake=String(!!(candidate||accepted));
  paintUI();persist();fitRehearsal();
}
function paintUI(){
  decorateControls();document.documentElement.lang=locale();$('dialogue').lang=$('long-line').checked?'ru':'en';$('locale').value=locale();
  setButton($('replay'),t('Original'),'rotate-ccw');setButton($('record'),t($('record').textContent),'mic');setButton($('take'),t('Your take'),'headphones');
  setButton($('previous'),t('Previous'),'chevron-left');setButton($('next'),t(saving?'Saving…':isSaveFailure()?'Retry save':atCompleteEnd()?'To result':'Next'),saving?'loader-circle':isSaveFailure()?null:'chevron-right');
  setButton($('pause'),t(resumable?'Resume':'Pause'),resumable?'play':'pause');setButton($('to-result'),t('To result'),'chevron-right');
  setButton($('return'),t('Return to recording'),'undo-2');setButton($('retry-assembly'),t('Retry assembly'),'rotate-ccw');setButton($('download'),locale()==='ru'?'Скачать мой дубляж':'Download My dub','download');setButton($('destination-close'),t('Back to scene'));
  document.querySelectorAll('[data-destination]').forEach(el=>setButton(el,t(el.id==='exit'?'Exit':el.dataset.destination),el.id==='exit'?'log-out':el.dataset.destination==='Settings'?'settings':null));
  $('heading').textContent=state.view==='record'?'Sintel · The search':t('Your result');
  $('result-project').hidden=state.view!=='result';$('dots').hidden=state.view!=='record';
  $('dots').setAttribute('aria-label',locale()==='ru'?'Текущая реплика':'Current line');
  $('dots').innerHTML=lines.map((_,i)=>`<span aria-current="${i===state.index}" aria-label="${locale()==='ru'?'Реплика':'Line'} ${i+1}"></span>`).join('');$('position').textContent=locale()==='ru'?`Реплика ${state.index+1} / ${lines.length}`:`Line ${state.index+1} / ${lines.length}`;
  $('reference-volume-label').textContent=t('Reference volume');
  $('wave-description').textContent=locale()==='ru'?(active==='record'?'Исходная звуковая волна. Записывается ваш дубль.':`Исходная звуковая волна${state.candidates[state.index]||state.accepted[state.index]?' с наложением вашего дубля':''}. Прослушивание: ${auditionSource==='take'?'ваш дубль':'оригинал'}.`):(active==='record'?'Original waveform. Your take is being recorded.':`Original waveform${state.candidates[state.index]||state.accepted[state.index]?' with your take overlay':''}. Listening source: ${auditionSource==='take'?'Your take':'Original'}.`);$('scrub').setAttribute('aria-describedby','time wave-description');
  $('scrub').setAttribute('aria-label',t('Position within this line'));$('volume').setAttribute('aria-label',t('Reference volume'));
  $('record-view').setAttribute('aria-label',t('Record a dialogue line'));document.querySelector('.performance').setAttribute('aria-label',t('Performance controls'));$('result-view').setAttribute('aria-label',t('Result'));$('result').setAttribute('aria-label',t('Your result'));
  const candidate=state.candidates[state.index],accepted=state.accepted[state.index];$('saved').textContent=t(candidate?'New take':accepted?'Saved':'');
  if(accepted&&!candidate){const mark=document.createElement('span');mark.className='hf-icon';mark.innerHTML=icon('check');mark.setAttribute('aria-hidden','true');$('saved').prepend(mark);}
  setButton($('open-settings'),t('Open Settings'),'settings');
  $('next').setAttribute('aria-describedby','take-help');
  const feedback=$('feedback'),noticeKey=`${locale()}|${message}`;
  if(message&&feedback.dataset.notice!==noticeKey){
    feedback.dataset.notice=noticeKey;feedback.replaceChildren();
    if(message){
      const mark=document.createElement('span');mark.className='hf-icon';mark.innerHTML=icon(error?'circle-alert':'check');mark.setAttribute('aria-hidden','true');
      const body=document.createElement('div'),title=document.createElement('p'),copy=document.createElement('p');title.id='feedback-title';copy.id='feedback-copy';title.className='hf-notice-title';copy.className='hf-notice-copy';
      title.textContent=t(isMicFailure()?'Microphone unavailable':isSaveFailure()?'Couldn’t save your take':message);
      copy.textContent=t(isMicFailure()?'Recording didn’t start. Your takes are unchanged.':isSaveFailure()?(state.accepted[state.index]?'New take kept here; saved take unchanged.':'Your take is kept in this browser.'):'');
      copy.hidden=!copy.textContent;body.append(title,copy);feedback.append(mark,body);feedback.classList.toggle('notice-error',error);
    }
  }
  syncToastSpace();
  const previous=guardDestination==='previous';$('guard').querySelector('h2').textContent=t('Keep this take?');
  $('guard-copy').textContent=t(previous?'Save this take before moving to the previous line?':'Save this take before leaving this line?');
  setButton($('guard').querySelector('[value="stay"]'),t('Stay'));setButton($('guard').querySelector('[value="discard"]'),t(previous?'Go without saving':'Leave without saving'));setButton($('guard').querySelector('[value="save"]'),t(previous?'Save and go':'Save and leave'));
  $('destination-copy').textContent=t('This neighboring screen is outside this recording prototype.');$('settings-note').textContent=t('After onboarding, microphone selection and optional checks are available only in Settings.');
  const assemblyTitle=t(state.resultAssemblyFailed?'Couldn’t assemble your video':'Assembling your video…');if($('assembly-title').textContent!==assemblyTitle)$('assembly-title').textContent=assemblyTitle;$('assembly-copy').textContent=t('Your three saved lines are safe.');
  if(state.view==='result'){$('result-title').textContent=t(state.resultAssemblyFailed?'Your recordings are saved':$('assembly').hidden?'Your dub is ready':'Putting your scene together');$('result-description').textContent=t(state.resultAssemblyFailed?'Try assembling again, or return to recording. Your saved takes stay safe.':$('assembly').hidden?'Compare Original and My dub. Download always saves My dub.':'You can leave this page. Your recordings stay saved.');}
  applyIcons(document);resultPlayer.refresh();updateClock();
}
function fitRehearsal(){
  syncToastSpace();
  const main=$('main'),rehearsal=document.querySelector('.rehearsal'),script=document.querySelector('.script'),timeline=document.querySelector('.timeline');
  const desktop=innerWidth>=1248,compact=desktop&&innerHeight<760&&state.view==='record';
  main.classList.toggle('compact-desktop',compact);
  // Dialogue stays below the picture at every height;A keeps only actions in its side panel.
  if(script.parentElement!==rehearsal)rehearsal.insertBefore(script,timeline);
  if(state.view!=='record'){main.style.removeProperty('--workspace-width');main.style.removeProperty('--media-width');main.style.removeProperty('--panel-width');resultPlayer.fit();return;}
  if(!desktop){main.style.removeProperty('--workspace-width');main.style.removeProperty('--media-width');main.style.removeProperty('--panel-width');paintWave(auditionSource,state.index,(video.currentTime-line().start)/duration());return;}
  const panel=272,gap=24,maxMedia=Math.min(920,innerWidth-2*(32+panel+gap));
  main.style.setProperty('--panel-width',`${panel}px`);
  let width=maxMedia;
  for(let pass=0;pass<4;pass++){
    main.style.setProperty('--media-width',`${width}px`);
    main.style.setProperty('--workspace-width',`${width}px`);
    const top=rehearsal.getBoundingClientRect().top+scrollY;
    const timelineGap=parseFloat(getComputedStyle(timeline).marginTop)||0;
    const available=innerHeight-top-16-timeline.offsetHeight-timelineGap-script.offsetHeight;
    const next=Math.min(maxMedia,Math.max(288,available*16/9));
    if(Math.abs(next-width)<1)break;
    width=next;
  }
  paintWave(auditionSource,state.index,(video.currentTime-line().start)/duration());
}
window.addEventListener('resize',()=>{fitRehearsal();if(toastVisible())requestAnimationFrame(showRecoveryAction);});
document.fonts.ready.then(fitRehearsal);
function seekStart(){video.currentTime=line().start;audio.currentTime=0;updateClock();}
function showPerformanceContext(){
  const scene=document.querySelector('.scene').getBoundingClientRect(),timeline=document.querySelector('.timeline').getBoundingClientRect(),height=timeline.bottom-scene.top;
  let bottom=innerHeight-noticeClearance()-16;
  if(toastVisible()&&height>bottom-16){hideToast(false);bottom=innerHeight-16;}
  if(scene.top<16||timeline.bottom>bottom){const delta=scene.top<16||height>bottom-16?scene.top-16:timeline.bottom-bottom;window.scrollTo({top:Math.max(0,scrollY+delta),behavior:'instant'});}
}
function updateClock(){const elapsed=Math.max(0,Math.min(duration(),video.currentTime-line().start));$('time').textContent=`${format(elapsed)} / ${format(duration())}`;$('scrub').value=String(Math.round(elapsed/duration()*1000));$('scrub').setAttribute('aria-valuetext',`${format(elapsed)} / ${format(duration())}`);paintWave(auditionSource,state.index,elapsed/duration());if(active==='record')setBadge($('capture-badge'),locale()==='ru'?`Запись · осталось ${format(duration()-elapsed)}`:`Recording · ${format(duration()-elapsed)} left`);}
async function startAudition(kind,restart=true){
  if(saving||active==='record')return;
  hideToast();
  stop();const action=mediaAction;
  if(restart||video.currentTime>=line().end-.025)seekStart();
  auditionSource=kind;if(!error)message='';
  video.muted=kind==='take';video.volume=Number($('volume').value);
  try {
    if(kind==='take'){
      const source=`/media/take-${state.index}.wav`;
      if(!audio.src.endsWith(source))audio.src=source;
      if(audio.readyState<1)await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true});});
      if(action!==mediaAction)return;
      audio.currentTime=Math.min(audio.duration,Math.max(0,video.currentTime-line().start));
    }
    if(action!==mediaAction)return;
    active=kind;render();showPerformanceContext();
    await video.play();if(action!==mediaAction)return;
    if(kind==='take'&&audio.currentTime<audio.duration-.01)await audio.play();
  }
  catch {if(action===mediaAction){stop();notice('Video could not play. Try Original again.',true);}}
}
function play(kind){startAudition(kind);}
async function record(){
  releaseToastFloor();stop();clearNotice();
  if($('fail-mic').checked){$('fail-mic').checked=false;notice('Microphone access is unavailable. Your existing take is unchanged. Open Settings to restore access, then return here.',true);return;}
  auditionSource='original';seekStart();video.muted=false;video.volume=Number($('volume').value);active='record';render();showPerformanceContext();
  try{await video.play();}catch{stop();notice('Video could not start. Your existing take is unchanged. Try Original, then Record again.',true);}
}
video.addEventListener('timeupdate',()=>{updateClock();if(active&&video.currentTime>=line().end-.025){const was=active;stop();video.currentTime=line().end;if(was==='record'){state.candidates[state.index]={id:++serial};notice('');}else render();updateClock();}});
video.addEventListener('loadedmetadata',()=>{seekStart();render();if(toastVisible())requestAnimationFrame(showRecoveryAction);});
$('replay').onclick=()=>play('original');$('take').onclick=()=>play('take');$('record').onclick=record;$('pause').onclick=()=>resumable?startAudition(auditionSource,false):pauseAudition();
$('volume').oninput=()=>video.volume=Number($('volume').value);
function beginSeek(){if(active==='record'||saving)return false;stop();render();return true;}
function finishSeek(){if(active==='record'||saving)return;pointerSeeking=false;keySeeking=false;startAudition(auditionSource,false);}
$('scrub').addEventListener('pointerdown',e=>{if(beginSeek()){pointerSeeking=true;$('scrub').setPointerCapture(e.pointerId);}});
$('scrub').addEventListener('pointerup',()=>{if(pointerSeeking)finishSeek();});
$('scrub').addEventListener('pointercancel',()=>{pointerSeeking=false;resumable=true;render();});
$('scrub').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)&&!keySeeking&&beginSeek())keySeeking=true;});
$('scrub').addEventListener('keyup',()=>{if(keySeeking)finishSeek();});
$('scrub').oninput=()=>{if(active==='record'||saving){updateClock();return;}if(!pointerSeeking&&!keySeeking)beginSeek();seekChanged=true;video.currentTime=line().start+Number($('scrub').value)/1000*duration();updateClock();};
$('scrub').onchange=()=>{if(seekChanged&&!pointerSeeking&&!keySeeking&&active!=='record'&&!saving)finishSeek();};
function move(index){releaseToastFloor();stop();auditionSource='original';state.index=index;if(state.failure?.startsWith('Microphone')){message=state.failure;error=true;}else clearNotice();guardDestination=null;seekStart();render();$('replay').focus({preventScroll:true});showPerformanceContext();}
async function acceptAndMove(destination){
  if(saving)return;stop();saving=true;render();
  await new Promise(r=>setTimeout(r,500));
  if($('fail-save').checked){$('fail-save').checked=false;saving=false;guardDestination=destination;state.failureDestination=destination;notice('Couldn’t save this take. It is still here on this browser; the previous saved take is unchanged. Retry before leaving.',true);$('next').focus({preventScroll:true});return;}
  state.accepted[state.index]=state.candidates[state.index];state.candidates[state.index]=null;saving=false;clearNotice(true);
  const initialCompletion=!state.completed&&state.accepted.every(Boolean);
  if(initialCompletion){state.completed=true;if(destination==='next'||destination==='result'){showResult(true);return;}if(destination==='previous')move(state.index-1);else navigate(destination,true);notice('All lines saved. Your video is assembling in the background.');return;}
  if(destination==='previous')move(state.index-1);else if(destination==='next'){if(state.index<2)move(state.index+1);else notice('All lines are saved. Choose To result to update your video.');}else if(destination==='result')showResult(true);else navigate(destination,true);
  render();
}
$('next').onclick=()=>{if(state.candidates[state.index])acceptAndMove(isSaveFailure()?(state.failureDestination??guardDestination??'next'):'next');else if(atCompleteEnd())showResult(true);else if(state.accepted[state.index]&&state.index<2)move(state.index+1);else if(state.completed)notice('All lines are saved. Choose To result to update your video.');};
function guard(destination){stop();guardDestination=destination;$('guard').returnValue='stay';paintUI();$('guard').showModal();}
$('guard').addEventListener('close',()=>{const choice=$('guard').returnValue;if(choice==='save')acceptAndMove(guardDestination);else if(choice==='discard'){state.candidates[state.index]=null;clearNotice(true);render();if(guardDestination==='previous')move(state.index-1);else if(guardDestination==='result')showResult(true);else navigate(guardDestination,true);}else {guardDestination=null;render();}});
$('previous').onclick=()=>state.candidates[state.index]?guard('previous'):move(state.index-1);
let assemblyTimer;
function showResult(assemble){
 stop();hideToast();announcement++;$('notification-announcement').textContent='';clearTimeout(assemblyTimer);
 if(assemble)state.resultAssemblyFailed=false;
 state.view='result';message='';error=false;render();releaseToastFloor();
 const failed=!!state.resultAssemblyFailed;
 $('assembly').hidden=!assemble&&!failed;resultPlayer.enter(assemble||failed);
 $('assembly-icon').classList.toggle('hf-spinner',assemble);$('assembly-icon').dataset.icon=failed?'circle-alert':'loader-circle';applyIcons($('assembly'));
 $('download').hidden=assemble||failed;$('retry-assembly').hidden=!failed;
 $('assembly-title').textContent=t(failed?'Couldn’t assemble your video':'Assembling your video…');
 $('result-title').textContent=t(failed?'Your recordings are saved':assemble?'Putting your scene together':'Your dub is ready');
 $('result-description').textContent=t(failed?'Try assembling again, or return to recording. Your saved takes stay safe.':assemble?'You can leave this page. Your recordings stay saved.':'Compare Original and My dub. Download always saves My dub.');
 resultPlayer.fit();persist();
 if(assemble)assemblyTimer=setTimeout(()=>{if(state.view!=='result')return;state.resultAssemblyFailed=$('fail-assembly').checked;$('fail-assembly').checked=false;showResult(false);},1800);
}
$('retry-assembly').onclick=()=>showResult(true);
$('to-result').onclick=()=>state.candidates[state.index]?guard('result'):showResult(true);
$('return').onclick=()=>{resultPlayer.leave();state.view='record';move(0);};
function navigate(destination,guarded=false){if(!guarded&&state.candidates[state.index]&&state.view==='record'){guard(destination);return;}destinationFocus={element:document.activeElement,feedback:!!document.activeElement.closest('#feedback'),destination};stop();$('destination-title').textContent=t(destination);$('settings-note').hidden=destination!=='Settings';paintUI();$('destination').showModal();}
document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{if(active!=='record'&&!saving)navigate(b.dataset.destination);});
$('destination-close').onclick=()=>$('destination').close();
$('destination').addEventListener('close',()=>{if(!destinationFocus)return;const preferred=destinationFocus.feedback?$('feedback').querySelector('button'):destinationFocus.element;const target=preferred?.isConnected&&preferred!==document.body&&preferred!==document.documentElement&&preferred.getClientRects().length?preferred:document.querySelector(`[data-destination="${destinationFocus.destination}"]`);target?.focus({preventScroll:true});destinationFocus=null;});
$('open-settings').onclick=()=>navigate('Settings');
$('reset').onclick=()=>{clearTimeout(assemblyTimer);stop();hideToast(false);releaseToastFloor();announcement++;$('notification-announcement').textContent='';auditionSource='original';localStorage.removeItem(key);state={index:0,candidates:[null,null,null],accepted:[null,null,null],completed:false,view:'record'};message='';error=false;$('fail-save').checked=false;$('fail-mic').checked=false;$('fail-assembly').checked=false;$('long-line').checked=false;seekStart();render();};
$('long-line').onchange=render;
$('locale').onchange=()=>{state.locale=$('locale').value;render();if(toastVisible()){showRecoveryAction();announceNotice();}};
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  if(!items.length)return;
  const current=items.indexOf(document.activeElement),next=current<0?(event.shiftKey?items.length-1:0):(current+(event.shiftKey?-1:1)+items.length)%items.length;
  event.preventDefault();items[next].focus();
}));
window.addEventListener('beforeunload',e=>{if(active==='record'||saving){e.preventDefault();e.returnValue='';}});
if(state.view==='result')showResult(false);else render();
