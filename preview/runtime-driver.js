// Landing-page host for the live scenes, notes, alarm and opening.
// The painting, placement and clock math stay in the app modules. This file does not
// start app storage, real alarms, or the desktop bridge.
(()=>{
const q=new URLSearchParams(location.search),mode=q.get('mode')||'scene';let id=q.get('scene')||'sunmoon';
const stage=document.getElementById('demoStage'),root=document.documentElement,media=matchMedia('(prefers-reduced-motion:reduce)');
let active=false,paused=false,reduced=media.matches,clockTimer=0,noteTimer=0,notePosition=0,clockTicks=0,syncMinute=-1,detailTimer=0;
const S=window.TP_scenes,C=window.TP_clock,W=window.TP_watchcase;
const cityData=[['Chicago','America/Chicago'],['London','Europe/London'],['Tokyo','Asia/Tokyo'],['New York','America/New_York'],['Sydney','Australia/Sydney']];
let rows=[],disc=null,clocks=null;
const mark='<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 3v34M20 20L8 32M20 20l12 12" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
function resize(){root.style.setProperty('--presentation-scale',innerWidth/480);stage.style.transform=`scale(${innerWidth/480})`;if(mode==='scene'&&disc&&clocks&&clocks.clientWidth){place();S.syncScenes();updateDetail();}}
resize();addEventListener('resize',resize);
function populate(){
 const watch=document.createElement('div');watch.className='watch';watch.innerHTML='<svg class="w-case" viewBox="0 0 640 640" aria-hidden="true"></svg><div class="disc"><div class="w-brand">'+mark+'<span class="wordmark">TimePeace</span></div><div class="w-inner"><div class="clocks" aria-live="off"></div></div></div>';stage.append(watch);
 if(mode==='opening'){watch.id='watch';watch.querySelector('.disc').id='disc';root.dataset.anim='0';root.dataset.layout='classic';root.classList.add('opening-preview');watch.querySelector('.wordmark').innerHTML='<span class=wm-time>Time</span><span class=wm-peace>Peace</span>';}watch.querySelector('.w-case').innerHTML=W.caseSvg(W.casePalette(getComputedStyle(root)),false);disc=watch.querySelector('.disc');clocks=watch.querySelector('.clocks');
 rows=(mode==='scene'?cityData.slice(0,4):cityData).map(([city,tz],i)=>{const el=document.createElement('article');el.className='clock'+(!i?' local':'');el.innerHTML=`<div class="city">${city}</div><div class="time"><span class="hm"></span><span class="sec"></span><span class="ampm"></span></div><div class="date"></div>`;clocks.append(el);return {el,tz,local:i===0,hour:0};});
 if(mode==='opening'){rows.forEach(r=>r.el.querySelector('.date').style.setProperty('display','block','important'));tick(true);window.tpOpeningInit?.();return;}root.dataset.layout=id;tick(true);place();S.mountScenes(disc,()=>({id,animate:active&&!paused,reduced,rows}));S.syncScenes();
}
function tick(first=false){
 if(!first&&(!active||paused||reduced))return;
 const now=C.appNow();clockTicks++;
 rows.forEach(r=>{const p=C.parts(r.tz,now,{hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});const hm=C.hourMinuteIn(r.tz,now);r.hour=hm.h+hm.m/60;r.el.querySelector('.hm').textContent=p.hour+':'+p.minute;r.el.querySelector('.sec').textContent=p.second;r.el.querySelector('.ampm').textContent=p.dayPeriod;r.el.querySelector('.date').textContent=C.dateLabelIn(r.tz,now);r.el.dataset.instant=String(now.getTime());});
 if(mode!=='opening'&&disc&&now.getMinutes()!==syncMinute){syncMinute=now.getMinutes();place();S.syncScenes();}
}

function place(){
 S.placeSceneRows(id,clocks,rows);
 const D=clocks.clientWidth;
 // Three visiting cities leave room for the unchanged 12.5px city/date and 16px time.
 // Sizes below are physical CSS-pixel floors, converted back into the logical watch stage.
 const scale=innerWidth/480,rowHeight=Math.max(34,44*scale)/scale,gap=Math.max(6.5,6*scale)/scale;
 const start=133+6/scale;
 rows.forEach((r,i)=>{if(!i){Object.assign(r.el.style,{top:'53px',height:'80px',width:'260px',left:((D-260)/2)+'px'});}else{Object.assign(r.el.style,{top:(start+(i-1)*(rowHeight+gap))+'px',height:rowHeight+'px',left:(D*.14)+'px',width:(D*.72)+'px'});}});
}
let detailFrames=0,detailROI=null,detailCanvas=null,lastDetail=-1;
function updateDetail(){
 clearTimeout(detailTimer);
 if(!['lanterns','kites','glasshouse'].includes(id)||!q.has('detail'))return;
 if(!detailCanvas){detailCanvas=document.createElement('canvas');detailCanvas.className='detail-canvas';detailCanvas.width=600;detailCanvas.height=360;detailCanvas.setAttribute('aria-label','Magnified crop of the same live scene; native app speed');document.body.append(detailCanvas);}
 const draw=()=>{
  const src=disc.querySelector('canvas.scene-cv');if(src&&rows[1]){
   const el=rows[1].el,D=disc.clientWidth,u=D/744,ratio=src.width/D,gutter={lanterns:20,kites:16,glasshouse:26}[id];
   const cx=parseFloat(el.style.left)-gutter*u,cy=parseFloat(el.style.top)+parseFloat(el.style.height)/2+(id==='kites'?3:0);
   detailROI={x:cx-19,y:cy-11.4,width:38,height:22.8,zoom:432/38};
   S.reviewDetail(detailCanvas,detailROI);detailFrames++;
  }
  if(active&&!paused&&!reduced)detailTimer=setTimeout(draw,1000/30);
 };draw();
}

const message='Call Tokyo at 0900\nStandup 1430';let noteText;
function populateNote(){
 stage.innerHTML='<article class="sticky preview-note" data-pinned="1" data-pattern="'+(q.get('paper')==='sky'?'grid':'ruled')+'"><span class="sticky-pin" aria-hidden="true"><i class="pin-head"></i><i class="pin-needle"></i></span><div class="sticky-paper"><div class="sticky-title">Today</div><div class="sticky-body" aria-label="Example note being written"><span id="noteText"></span><i class="note-caret" aria-hidden="true"></i></div><div class="sticky-curl" aria-hidden="true"></div></div></article>';
 const note=stage.querySelector('.sticky');if(q.get('paper')==='sky'){note.style.setProperty('--paper','#c8e9ff');note.style.setProperty('--ink','#243b50');}noteText=stage.querySelector('#noteText');noteText.textContent=reduced?message:'';
}
function typeNext(){clearTimeout(noteTimer);if(!active||paused||reduced)return;notePosition++;noteText.textContent=message.slice(0,Math.min(notePosition,message.length));if(notePosition>message.length){noteTimer=setTimeout(()=>{notePosition=0;typeNext()},3000);}else noteTimer=setTimeout(typeNext,140);}
let alarm,status,replay;
function ring(){alarm.classList.add('show');root.dataset.alarm='1';status.textContent='';replay.textContent='Replay alarm';}
function populateAlarm(){
 stage.innerHTML='<div class="demo-alarm-caption">ALARM PREVIEW · SILENT DEMO</div><section class="alarm-card show" role="group" aria-label="Example TimePeace alarm"><div class="al-head"><span class="al-icon" aria-hidden="true">♧</span><div class="al-text"><b class="al-title">Call Tokyo</b><span class="al-when">Time for your reminder</span></div></div><div class="al-acts"><button type="button" class="al-done">Dismiss</button><button type="button" class="al-snooze" aria-expanded="false">Snooze</button></div><div class="al-snoozes" hidden><button type="button" data-m="10">10 min</button><button type="button" data-m="60">1 hour</button></div></section><p class="alarm-status" aria-live="polite"></p><button id="alarmReplay" type="button">Replay alarm</button>';
 alarm=stage.querySelector('.alarm-card');status=stage.querySelector('.alarm-status');replay=stage.querySelector('#alarmReplay');
 alarm.querySelector('.al-icon').innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
 alarm.querySelector('.al-done').onclick=()=>{alarm.classList.remove('show');delete root.dataset.alarm;status.textContent='Dismissed in this demo.';};
 const snoozes=alarm.querySelector('.al-snoozes');alarm.querySelector('.al-snooze').onclick=()=>{snoozes.hidden=!snoozes.hidden;alarm.querySelector('.al-snooze').setAttribute('aria-expanded',String(!snoozes.hidden));};snoozes.querySelectorAll('button').forEach(b=>b.onclick=()=>{snoozes.hidden=true;alarm.classList.remove('show');delete root.dataset.alarm;status.textContent='Snoozed in this demo. No alarm is scheduled.';});replay.onclick=ring;ring();
}
function state(){
 root.dataset.motion=reduced?'reduced':'normal';root.dataset.paused=String(!active||paused||reduced?'1':'0');
 clearTimeout(clockTimer);clearTimeout(noteTimer);
 if(mode==='scene'||mode==='opening'){
  if(active&&!paused&&!reduced){tick();const again=()=>{tick();clockTimer=setTimeout(again,1000-Date.now()%1000)};clockTimer=setTimeout(again,1000-Date.now()%1000);}
  if(mode==='scene'){S.syncScenes();window.tpWindowVisible?.(active&&!paused);updateDetail();}else window.tpOpeningState?.({active,paused,reduced});
 }else if(mode==='note'){if(reduced)noteText.textContent=message;else if(active&&!paused)noteTimer=setTimeout(typeNext,notePosition===0?350:140);}
}
if(mode==='scene'||mode==='opening')populate();else if(mode==='note')populateNote();else populateAlarm();
addEventListener('message',e=>{if(e.source===parent&&e.data?.kind==='tp-review-replay'){window.tpOpeningReplay?.();return;}if(e.source!==parent||e.data?.kind!=='tp-review-state')return;const wasActive=active;active=!!e.data.active;paused=!!e.data.paused;reduced=!!e.data.reduced;if(mode==='note'&&active&&!wasActive&&!reduced){notePosition=0;noteText.textContent='';}if(mode==='scene'&&e.data.scene&&S.SCENE_IDS.includes(e.data.scene)){id=e.data.scene;root.dataset.layout=id;place();}state();});
media.addEventListener('change',e=>{reduced=e.matches;state()});
window.reviewStatus=()=>({mode,scene:id,active,paused,reduced,clockTicks,notePosition,time:rows[0]?.el.querySelector('.time').textContent,canvas:!!document.querySelector('canvas.scene-cv'),opening:window.tpOpeningStatus?.(),detailFrames,detailROI});
state();requestAnimationFrame(()=>{if(mode==='scene'&&disc&&clocks.clientWidth){place();S.syncScenes();updateDetail();}window.reviewReady=true;parent.postMessage({kind:'tp-review-ready'},'*');});
})();
