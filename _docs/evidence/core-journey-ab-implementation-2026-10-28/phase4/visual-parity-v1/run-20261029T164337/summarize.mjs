import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile(process.env.METRICS,'utf8'));
for(const x of data){
 const proto=x.spec.includes('prototype');
 const get=(s)=>x[s]??null;
 const media=get(proto?'.scene':'.media-viewport');
 const caption=get(proto?'.script':'.dialogue-copy');
 const wave=get(proto?'.wave':'.waveform-row');
 const meta=get(proto?'.timeline-meta':'.waveform-meta');
 const controls=get(proto?'.performance':x.spec==='A-app'?'.record-panel':'.record-controls');
 const actions=get(proto?(x.spec==='A-prototype'?'.performance-actions':'.studio-controls'):x.spec==='A-app'?'.record-performance':'.record-studio-actions');
 const fmt=(r)=>r?[r.x,r.y,r.w+'x'+r.h].join(','):'-';
 console.log([x.spec.padEnd(12),x.viewport.padEnd(8),'header='+fmt(get(proto?'.project-header':'.record-header')??get('.studio-header')),'title='+JSON.stringify(x.text.heading),'media='+fmt(media),'caption='+fmt(caption),'wave='+fmt(wave),'meta='+fmt(meta),'controls='+fmt(controls),'actions='+fmt(actions),'docH='+x.doc.h,'videoReady='+(get(proto?'.scene video':'.media-viewport video')?.readyState)].join(' '));
}
