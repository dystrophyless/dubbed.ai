import './result-player.css';
import {icon} from './icons.js';
import maximize from 'lucide-static/icons/maximize.svg?raw';
export function createResultPlayer(locale){
 const $=id=>document.getElementById(id),root=$('result-player'),videos={dub:$('result'),original:$('result-original')};
 let source='dub',sequence=0,busy=false,failed=false,seeking=false,keySeeking=false,pendingPosition=0,pendingPlaying=false;
 const current=()=>videos[source],tr=(en,ru)=>locale()==='ru'?ru:en;
 const name=()=>source==='dub'?tr('My dub','Мой дубляж'):tr('Original','Оригинал');
 const time=n=>`${Math.floor(Math.max(0,n)/60)}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
 const duration=()=>Number.isFinite(current().duration)?current().duration:0;
 const atEnd=()=>duration()>0&&(current().ended||current().currentTime>=duration()-.03);
 const ready=v=>v.error?Promise.reject(v.error):v.readyState>=1?Promise.resolve():new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',reject,{once:true});});
 function pause(){sequence++;busy=false;Object.values(videos).forEach(v=>v.pause());paint();}
 function paint(){
  const v=current();if(v.error&&!busy)failed=true;const pending=busy||(!failed&&v.readyState<2&&!seeking&&!keySeeking),ended=atEnd();root.dataset.source=source;root.setAttribute('aria-busy',String(pending));
  for(const [key,video]of Object.entries(videos)){video.hidden=source!==key;video.setAttribute('aria-label',key==='dub'?tr('My dub','Мой дубляж'):tr('Original','Оригинал'));}
  $('source-original').textContent=tr('Original','Оригинал');$('source-dub').textContent=tr('My dub','Мой дубляж');
  $('source-original').setAttribute('aria-pressed',String(source==='original'));$('source-dub').setAttribute('aria-pressed',String(source==='dub'));
  document.querySelector('.result-sources').setAttribute('aria-label',tr('Playback source','Источник воспроизведения'));
  const label=failed?tr('Retry loading','Повторить загрузку'):ended?tr('Replay','Сначала'):v.paused?tr('Play','Воспроизвести'):tr('Pause','Пауза');
  $('result-play').setAttribute('aria-label',label);$('result-play').title=label;$('result-play').disabled=pending;$('result-play').firstElementChild.innerHTML=icon(failed||ended?'rotate-ccw':v.paused?'play':'pause');
  $('result-seek').disabled=pending||failed||!duration();$('result-seek').setAttribute('aria-label',tr('Video position','Позиция видео'));
  if(!seeking&&!keySeeking)$('result-seek').value=duration()?v.currentTime/duration()*1000:0;
  $('result-seek').setAttribute('aria-valuetext',`${time(v.currentTime)} / ${time(duration())} · ${name()}`);$('result-time').textContent=`${time(v.currentTime)} / ${time(duration())}`;
  $('result-volume').setAttribute('aria-label',tr('Video volume','Громкость видео'));
  const full=!!document.fullscreenElement,fullLabel=full?tr('Exit fullscreen','Выйти из полноэкранного режима'):tr('Enter fullscreen','На весь экран');
  $('result-fullscreen').setAttribute('aria-label',fullLabel);$('result-fullscreen').title=fullLabel;$('result-fullscreen').disabled=!document.fullscreenEnabled;$('result-fullscreen').firstElementChild.innerHTML=maximize.replace('stroke-width="2"','stroke-width="1.1"');
  const status=$('result-media-status');status.hidden=!pending&&!failed;const statusText=failed?tr(`Couldn’t load ${name()}. Retry loading or choose the other source.`,`Не удалось загрузить «${name()}». Повторите загрузку или выберите другой источник.`):tr(`Loading ${name()}…`,`Загружается «${name()}»…`);if(status.textContent!==statusText)status.textContent=statusText;
  if($('assembly').hidden)$('result-description').textContent=tr('Compare Original and My dub. Download always saves My dub.','Сравните оригинал и свой дубляж. Скачивается всегда ваш дубляж.');
 }
 async function select(next,retry=false){
  if(next===source&&!retry)return;
  const old=current(),position=busy?pendingPosition:old.currentTime,playing=busy?pendingPlaying:!old.paused&&!old.ended,token=++sequence;pendingPosition=position;pendingPlaying=playing;
  Object.values(videos).forEach(v=>v.pause());source=next;busy=true;failed=false;seeking=false;keySeeking=false;paint();const v=current();if(retry)v.load();
  try{await ready(v);if(token!==sequence)return;v.currentTime=Math.min(position,Math.max(0,v.duration));busy=false;paint();if(playing&&v.currentTime<v.duration-.03)await v.play();}
  catch{if(token===sequence){busy=false;failed=true;paint();}}
  if(token===sequence)paint();else if(v!==current())v.pause();
 }
 async function toggle(){
  if(failed){await select(source,true);return;}
  const v=current(),token=++sequence;if(!v.paused){v.pause();paint();return;}if(atEnd())v.currentTime=0;
  try{await v.play();}catch{if(token===sequence){failed=true;paint();}}
 }
 function beginSeek(){if($('result-seek').disabled)return;pause();seeking=true;}
 function updateSeek(){if($('result-seek').disabled)return;current().currentTime=Number($('result-seek').value)/1000*duration();paint();}
 function finishSeek(){if(!seeking&&!keySeeking)return;seeking=false;keySeeking=false;if(atEnd())paint();else toggle();}
 $('source-original').onclick=()=>select('original');$('source-dub').onclick=()=>select('dub');
 document.querySelector('.result-sources').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'original':event.key==='End'?'dub':event.target.id==='source-original'?'dub':'original';$('source-'+next).focus();select(next);};
 $('result-play').onclick=toggle;
 $('result-seek').onpointerdown=event=>{beginSeek();$('result-seek').setPointerCapture(event.pointerId);};$('result-seek').onpointerup=finishSeek;$('result-seek').onpointercancel=()=>{seeking=false;keySeeking=false;paint();};
 $('result-seek').onkeydown=event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)&&!keySeeking){beginSeek();keySeeking=true;}};
 $('result-seek').onkeyup=finishSeek;$('result-seek').oninput=updateSeek;$('result-seek').onchange=()=>{if(!seeking&&!keySeeking){beginSeek();updateSeek();finishSeek();}};
 $('result-volume').oninput=()=>Object.values(videos).forEach(v=>v.volume=Number($('result-volume').value));
 $('result-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{const status=$('result-media-status');status.hidden=false;status.textContent=tr('Fullscreen is unavailable in this browser.','Полноэкранный режим недоступен в этом браузере.');}};
 document.addEventListener('fullscreenchange',paint);
 for(const v of Object.values(videos)){v.volume=.7;for(const event of ['timeupdate','play','pause','ended','loadedmetadata','canplay','waiting','seeking','seeked'])v.addEventListener(event,()=>{if(v===current())paint();});v.addEventListener('error',()=>{if(v===current()){busy=false;failed=true;paint();}});}
 function fit(){
  const main=$('main');if(!$('record-view').hidden||innerWidth<768||document.fullscreenElement)return;main.style.removeProperty('--result-width');
  const picture=root.hidden?document.querySelector('.result-stage'):document.querySelector('.result-picture'),rail=document.querySelector('.result-transport'),bottom=document.querySelector('.result-bottom');
  const minimum=parseFloat(getComputedStyle(main).getPropertyValue('--result-min-width'))||520;let width=Math.min(920,innerWidth-64);for(let pass=0;pass<6;pass++){main.style.setProperty('--result-width',`${width+32}px`);const available=innerHeight-picture.getBoundingClientRect().top-scrollY-rail.offsetHeight-bottom.offsetHeight-40,next=Math.min(width,Math.max(minimum,Math.min(920,available*16/9)));if(Math.abs(next-width)<1)break;width=next;}main.style.setProperty('--result-width',`${width+32}px`);
 }
 return {pause,refresh:paint,fit,enter(assembling){pause();source='dub';failed=!!videos.dub.error;seeking=false;keySeeking=false;Object.values(videos).forEach(v=>{if(v.readyState)v.currentTime=0;});root.hidden=assembling;paint();fit();},leave(){pause();if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});}};
}
