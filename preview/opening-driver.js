// Opening lifecycle for the landing page. Motion and timing stay in the app's quitfx.js.
(()=>{
let active=false,paused=false,reduced=false,queue=[],id=0,last=0,clock=1000,timer=0,playing=false,cycles=0;
function allowed(){return active&&!paused&&!reduced&&!document.hidden}
window.tpReviewRAF=fn=>{queue.push(fn);schedule()};
function schedule(){if(!id&&queue.length&&allowed())id=requestAnimationFrame(pump)}
function pump(now){id=0;if(!allowed()){last=0;return;}if(last)clock+=Math.min(80,now-last);last=now;const work=queue;queue=[];work.forEach(fn=>fn(clock));schedule();}
function clear(){cancelAnimationFrame(id);clearTimeout(timer);id=0;queue=[];last=0;document.querySelectorAll('[data-tpfx]').forEach(n=>n.remove());document.body.style.maskImage=document.body.style.webkitMaskImage='';document.body.style.opacity='1';playing=false;}
function begin(){if(!allowed())return;playing=true;cycles++;window.TP_opening.run(()=>{playing=false;timer=setTimeout(begin,1700);},true);}
window.tpOpeningInit=()=>{};
window.tpOpeningState=s=>{const was=allowed();({active,paused,reduced}=s);if(reduced){clear();return;}if(!allowed()){cancelAnimationFrame(id);clearTimeout(timer);id=0;last=0;}else if(!was){last=0;if(playing)schedule();else begin();}};
window.tpOpeningStatus=()=>({active,paused,reduced,playing,cycles,sourceFrames:window.tpOpeningStat?.frames||0,sourceElapsed:window.tpOpeningStat?.t||0,scheduledRAF:!!id,scheduledTimer:!!timer});
window.tpOpeningStatic=()=>{clear();active=false};
window.tpOpeningReplay=()=>{clear();if(allowed())begin()};
})();
