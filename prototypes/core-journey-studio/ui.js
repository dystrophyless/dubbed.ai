import './comparison-lab.css';
import './comparison-components.css';
import {icon,applyIcons} from './icons.js';
import {fixturePeaks} from './waveform-data.js';
export function setButton(el,label,glyph){
  if(!el)return;
  const fragment=document.createDocumentFragment();
  if(glyph){const mark=document.createElement('span');mark.className=`hf-icon${glyph==='loader-circle'?' hf-spinner':''}`;mark.innerHTML=icon(glyph);mark.setAttribute('aria-hidden','true');fragment.append(mark);}
  const text=document.createElement('span');text.className='hf-label';text.textContent=label;fragment.append(text);el.replaceChildren(fragment);el.classList.add('hf-button');
}
export function decorateControls(root=document){
  root.querySelectorAll('#product button,#product a.button,dialog button').forEach(el=>{
    el.classList.add('hf-button');
    el.classList.toggle('hf-primary',el.classList.contains('primary'));
    el.classList.toggle('hf-record',el.id==='record');
    el.classList.toggle('hf-ghost',!!el.closest('.global'));
    el.classList.toggle('hf-navigation-role',!!el.closest('.global'));
  });
  root.querySelectorAll('dialog').forEach(el=>el.classList.add('hf-dialog'));
  root.querySelectorAll('.dialog-actions').forEach(el=>el.classList.add('hf-dialog-actions'));
}
// Fixture-derived continuous envelopes; the capture reveal is illustrative, not live input metering.
function envelope(values){
  const points=values.map((v,i)=>[i/(values.length-1)*1000,Math.max(1.5,v*29)]);
  const upper=points.map(([x,a])=>`${x.toFixed(2)},${(32-a).toFixed(2)}`);
  const lower=[...points].reverse().map(([x,a])=>`${x.toFixed(2)},${(32+a).toFixed(2)}`);
  return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}
export function paintWave(source,index,ratio=0){
  const el=document.querySelector('.wave');if(!el)return;
  ratio=Math.max(0,Math.min(1,ratio));
  const capturing=document.getElementById('product').classList.contains('capturing');
  const hasTake=capturing||el.dataset.hasTake==='true',key=String(index);
  if(el.dataset.line!==key){
    el.innerHTML=`<svg viewBox="0 0 1000 64" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="take-reveal"><rect width="0" height="64"/></clipPath></defs><path class="original-envelope" d="${envelope(fixturePeaks.original[index])}"/><path class="take-envelope" clip-path="url(#take-reveal)" d="${envelope(fixturePeaks.take[index])}"/><line class="cursor" y1="0" y2="64"/></svg>`;el.dataset.line=key;
  }
  el.querySelector('.take-envelope').style.display=hasTake?'':'none';
  el.querySelector('clipPath rect').setAttribute('width',String(capturing?ratio*1000:1000));
  const cursor=el.querySelector('.cursor');cursor.setAttribute('x1',String(ratio*1000));cursor.setAttribute('x2',String(ratio*1000));
  el.dataset.overlayProgress=String(capturing?ratio:hasTake?1:0);
}
export function setBadge(el,label){el.classList.add('hf-capture-badge');const mark=document.createElement('span');mark.className='hf-icon';mark.innerHTML=icon('mic');mark.setAttribute('aria-hidden','true');el.replaceChildren(mark,document.createTextNode(label));}
export {icon,applyIcons};
