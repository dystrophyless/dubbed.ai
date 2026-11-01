const node=document.getElementById('feedback');
const READ_TIME=8000,ENTER_TIME=180,EXIT_TIME=140;
let generation=0,clock=null,enterTimer=null,exitTimer=null,remaining=READ_TIME,started=0,hovered=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export const toastVisible=()=>!node.hidden;
export function releaseToastFloor(){document.body.style.removeProperty('min-height');}
export function toastClearance(){return node.hidden?0:node.offsetHeight+parseFloat(getComputedStyle(node).bottom)+16;}
export function syncToastSpace(){document.body.style.setProperty('--notice-clearance',`${toastClearance()}px`);document.body.classList.toggle('has-notice',!node.hidden);}
function pauseClock(){if(clock!==null){remaining=Math.max(0,remaining-(performance.now()-started));clearTimeout(clock);clock=null;}}
function resumeClock(){if(node.hidden||node.dataset.phase!=='open'||enterTimer!==null||hovered||document.hidden||clock!==null)return;started=performance.now();clock=setTimeout(()=>hideToast(),remaining);}
function cancelTimers(){clearTimeout(clock);clearTimeout(enterTimer);clearTimeout(exitTimer);clock=enterTimer=exitTimer=null;}
export function hideToast(animate=true){
  if(node.hidden)return;
  if(node.dataset.phase==='exit'&&animate)return;
  const current=++generation;cancelTimers();node.dataset.phase='exit';
  const finish=()=>{if(current!==generation)return;document.body.style.minHeight=`${scrollY+innerHeight}px`;node.hidden=true;node.dataset.phase='hidden';exitTimer=null;syncToastSpace();};
  if(!animate||reduced())finish();else exitTimer=setTimeout(finish,EXIT_TIME);
}
export function showToast(onPresent){
  const current=++generation;cancelTimers();remaining=READ_TIME;hovered=false;node.hidden=false;node.dataset.phase='enter';syncToastSpace();releaseToastFloor();onPresent();node.getBoundingClientRect();
  requestAnimationFrame(()=>{
    if(current!==generation)return;
    node.dataset.phase='open';
    enterTimer=setTimeout(()=>{enterTimer=null;resumeClock();},reduced()?0:ENTER_TIME);
  });
}
// Appearing under the stationary click pointer must not freeze the lifetime.
node.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&(event.movementX||event.movementY)){hovered=true;pauseClock();}});
node.addEventListener('pointerleave',()=>{hovered=false;resumeClock();});
document.addEventListener('visibilitychange',()=>document.hidden?pauseClock():resumeClock());
for(const type of ['wheel','touchmove'])document.addEventListener(type,event=>{if(!event.target.closest('.lab,#feedback,dialog'))hideToast();},{passive:true});
