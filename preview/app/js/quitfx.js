// The close: brass (light themes) or steel (dark themes) shutter blades close over the dial, the
// closed watch runs out as sand in the theme's colors, and a small star glints where it was.
// About 1.1s. Reduced motion (system or app setting) is a short fade. The caller quits in done(),
// and a safety timer makes sure done() runs even if a frame throws.
import { casePalette } from './watchcase.js';
const requestAnimationFrame = (cb) => (window.tpReviewRAF || globalThis.requestAnimationFrame)(cb);

let running = false;
export function playQuit(done) {
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    try { done(); } catch (e) { /* quit path */ }
    // Still here 3s later (the quit was refused or there is no wrapper): bring the clock back.
    setTimeout(() => { running = false; const b = document.body; b.style.opacity = ''; b.style.pointerEvents = ''; b.style.transition = ''; b.style.webkitMaskImage = b.style.maskImage = ''; document.querySelectorAll('[data-tpfx]').forEach(e => e.remove()); }, 3000);
  };
  if (running) return;   // a second trigger (tray and pusher at once) rides on the first
  running = true;
  // The other windows (notes, Settings, Plan) play their exit alongside this one.
  try { const a = window.pywebview && window.pywebview.api; if (a && a.quit_begin) a.quit_begin(); } catch (e) { /* older wrapper */ }
  setTimeout(finish, 1800);
  try { run(finish); } catch (e) { finish(); }
}

function run(finish, opening) {
  const root = document.documentElement, body = document.body;
  const cs = getComputedStyle(root);
  const reduced = root.dataset.motion === 'reduced' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (opening) {
    if (reduced) { body.style.transition = 'opacity 120ms linear'; requestAnimationFrame(() => { body.style.opacity = '1'; }); setTimeout(finish, 140); return; }
  } else {
    body.style.pointerEvents = 'none';
    if (reduced) {
      body.style.transition = 'opacity 120ms linear'; body.style.opacity = '0';
      setTimeout(finish, 130); return;
    }
  }
  const qp = opening ? null : document.getElementById('wc-quit'); if (qp) qp.classList.add('press');
  const host = document.getElementById('disc') || document.getElementById('watch') || body;
  const r = host.getBoundingClientRect();
  const CX = r.left + r.width / 2, CY = r.top + r.height / 2;
  const RD = Math.max(30, Math.min(r.width, r.height) / 2);          // dial radius the blades cover
  const RC = RD * 1.14;                                               // case radius the sand runs from
  const T = casePalette(cs);
  const steel = T.dark;
  const stops = steel ? ['#eef2f6', '#9aa6b2', '#4a5560'] : ['#f1d79a', '#c99b4f', '#8a6230'];
  const edge = steel ? '#2b333b' : '#5a3f1c';
  const grains = [cs.getPropertyValue('--accent').trim() || '#d9622b', cs.getPropertyValue('--secondary').trim() || '#e8b23a', T.bg, ...stops];
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true'); layer.dataset.tpfx = '1';
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
  const S = 500, sc = (RD * 2) / (S * 0.856);
  let bl = '';
  for (let i = 0; i < 8; i++) bl += `<g transform="rotate(${i * 45} 250 250)"><path class="qb" d="M250 250 L250 -10 A260 260 0 0 1 434 66 Z" fill="url(#tpqg)" stroke="${edge}" stroke-width="2"/></g>`;
  const blades = document.createElement('div');
  blades.style.cssText = `will-change:opacity;position:absolute;left:${CX - 250 * sc}px;top:${CY - 250 * sc}px;width:${S * sc}px;height:${S * sc}px;clip-path:circle(${RD}px at 50% 50%);opacity:0`;
  blades.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 500 500"><defs><linearGradient id="tpqg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".5" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>${bl}</svg>`;
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
  const star = document.createElement('div');
  star.style.cssText = `position:absolute;left:${CX - 60}px;top:${CY + RC * 0.17 - 60}px;width:120px;height:120px;opacity:0;will-change:transform,opacity`;
  star.innerHTML = `<svg width="120" height="120" viewBox="-60 -60 120 120"><defs><radialGradient id="tpqh"><stop offset="0" stop-color="${stops[1]}" stop-opacity=".75"/><stop offset="1" stop-color="${stops[1]}" stop-opacity="0"/></radialGradient></defs><circle r="58" fill="url(#tpqh)"/><path fill="#fff3cf" d="M0 -55 L5 -5 L55 0 L5 5 L0 55 L-5 5 L-55 0 L-5 -5Z"/><circle r="9" fill="#fff"/></svg>`;
  layer.append(blades, cv, star);
  root.appendChild(layer);
  const paths = [...blades.querySelectorAll('.qb')];
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = [], GRAINS = 800;
  for (let i = 0; i < GRAINS; i++) { const a = rnd() * 6.283, rr = Math.sqrt(rnd()) * RC; P.push({ x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, v: rnd(), c: grains[i % grains.length], w: 1 + rnd() * 2 }); }
  P.sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0));
  const E = (a, b, t) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  // seconds from the press: press 0 to 0.12, shutter 0.12 to 0.44, sand 0.44 to 0.86, star 0.80 to 1.20
  const A = 0.12, B = 0.44, SD = 0.42, G = 0.8, END = 1.3, TOP = CY - RC, SPAN = RC * 2, MSPAN = Math.max(SPAN, H - TOP) + 20;
  let t0 = 0;   // the clock starts on the first frame, so a late first frame skips nothing
  const frame = now => {
    if (!t0) t0 = now;
    const st = opening ? (window.tpOpeningStat || (window.tpOpeningStat = { frames: 0 })) : null;
    if (st) { st.frames++; st.t = Math.round(now - t0); (st.g || (st.g = [])).push(Math.round(now - t0)); }
    const js0 = performance.now();
    try {
      // The opening plays the close backwards: star, sand gathering bottom up, blades opening.
      const t = opening ? END - (now - t0) / 1000 : (now - t0) / 1000;
      if (qp && t > 0.2) qp.classList.remove('press');
      const k = eio(E(A, B, t));
      paths.forEach(p => p.setAttribute('transform', `translate(0 ${-250 * (1 - k)}) rotate(${-40 * (1 - k)} 250 250)`));
      blades.style.opacity = E(A - 0.02, A + 0.03, t);
      if (t > B) {
        const front = TOP + MSPAN * eio(E(B, B + SD, t));   // the sweep runs to the window's bottom edge, so no pusher below the case lingers
        const m = `linear-gradient(to bottom, transparent ${front - 18}px, #000 ${front + 18}px)`;
        body.style.webkitMaskImage = body.style.maskImage = m;
        const off = CY - 250 * sc;
        const mb = `linear-gradient(to bottom, transparent ${front - 18 - off}px, #000 ${front + 18 - off}px)`;
        blades.style.webkitMaskImage = blades.style.maskImage = mb;
      }
      if (opening && body.style.opacity !== '1') body.style.opacity = '1';   // after the first mask, so the face never flashes
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        const d = t - (B + ((p.y - TOP) / SPAN) * SD); if (d < 0) continue;
        const life = d / 0.4; if (life > 1) continue;
        ctx.globalAlpha = (1 - life) * 0.95; if (ctx.fillStyle !== p.c) ctx.fillStyle = p.c;
        ctx.fillRect(p.x + (CX - p.x) * 0.35 * life + 10 * Math.sin(p.v * 20 + d * 8), p.y + 800 * d * d + 40 * d * p.v, p.w, p.w);
      }
      const g = E(G, G + 0.1, t), h = E(G + 0.1, G + 0.4, t);
      star.style.opacity = g * (1 - h);
      star.style.transform = `scale(${0.2 + g * 0.9 - 0.6 * h}) rotate(${60 * (g + h)}deg)`;
      if (opening) {
        if (t <= A) { blades.style.opacity = 0; finish(); layer.remove(); return; }
        if (t <= B) body.style.webkitMaskImage = body.style.maskImage = '';
      } else if (t >= END) { body.style.opacity = '0'; ctx.clearRect(0, 0, W, H); layer.style.opacity = '0'; finish(); return; }
    } catch (e) { finish(); return; }
    if (st) st.js = Math.max(st.js || 0, Math.round(performance.now() - js0));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// The opening on app launch. hideForStart() runs as the page loads so the face never flashes;
// playStart() runs once the window is on screen. The face is revealed by 2s whatever happens.
let startState = 0;   // 0 idle, 1 hidden, 2 playing, 3 done
let startLayerCleanup = null;
function reveal() {
  if (startState === 3) return;
  startState = 3;
  const b = document.body;
  b.style.webkitMaskImage = b.style.maskImage = ''; b.style.opacity = ''; b.style.transition = '';
  if (startLayerCleanup) startLayerCleanup();
  try { if (window.pywebview && window.pywebview.api.opening_done) window.pywebview.api.opening_done(); } catch (e) { /* older wrapper */ }
  afterStart.splice(0).forEach(fn => { try { fn(); } catch (e) { /* caller's own */ } });
}
// Work that would compete with the opening for the page's frames (opening note windows) waits for it.
const afterStart = [];
export function afterOpening(fn) { if (startState === 0 || startState === 3) fn(); else afterStart.push(fn); }
export function hideForStart() {
  if (startState) return;
  startState = 1;
  // Nearly but not fully transparent: the face is still painted, so its first paint (most of a
  // second on D'Antoine's PC) happens while hidden, not in the middle of the opening.
  document.body.style.opacity = '0.002';
  // Timers are throttled while the window is still hidden, so this cap is long; once the opening
  // starts, its own 2s safety below reveals the face.
  setTimeout(reveal, 6000);
}
export function playStart() {
  if (startState !== 1) return;
  startState = 2;
  // Right after a WebView2 window is first shown, animation frames can stall for a few hundred ms
  // (once for over a second on D'Antoine's PC), which ate the whole opening. So the opening waits
  // at least 250ms and until frames arrive steadily, then plays in full. The face is revealed at most 3.2s after the
  // window shows, and 2s after the opening starts.
  const st = window.tpOpeningStat = { warm: 0, frames: 0, vis: document.visibilityState };
  setTimeout(reveal, 3200);
  let last = 0, steady = 0;
  const warm = now => {
    if (startState !== 2) return;
    st.warm++;
    steady = last && now - last < 40 ? steady + 1 : 0; last = now;
    if (steady < 8 || now - st.t0w < 250) { requestAnimationFrame(warm); return; }
    st.waited = Math.round(performance.now() - st.t0w);
    setTimeout(reveal, 2000);
    const before = new Set(document.documentElement.children);
    startLayerCleanup = () => { [...document.documentElement.children].forEach(e => { if (!before.has(e) && e.tagName === 'DIV' && e.getAttribute('aria-hidden') === 'true') e.remove(); }); };
    try { run(reveal, true); } catch (e) { reveal(); }
  };
  st.t0w = performance.now();
  requestAnimationFrame(warm);
}

// A secondary window's exit when the app quits (notes, Settings, Plan, any tool): the same sand
// sweep as the watch, short, with a slight shrink and fade, ~420ms. Reduced motion: a plain fade.
// Pointer input stops at once. Played once; the wrapper closes the window after.
export const EXIT_MS = 420;
let exiting = false;
export function playExit() {
  if (exiting) return 'busy';
  exiting = true;
  const body = document.body, el = document.documentElement;   // the whole page, its ground included
  const reduced = el.dataset.motion === 'reduced' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  body.style.pointerEvents = 'none';
  if (reduced) { el.style.transition = 'opacity 150ms linear'; el.style.opacity = '0'; return 'fade'; }
  el.style.transformOrigin = '50% 60%';
  el.style.transition = `opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms cubic-bezier(.5,0,.75,0)`;
  const H = innerHeight;
  let t0 = 0;
  const frame = now => {
    if (!t0) { t0 = now; el.style.opacity = '0'; el.style.transform = 'scale(0.94) translateY(6px)'; }
    const k = Math.min(1, (now - t0) / EXIT_MS);
    const e = k * k * (3 - 2 * k), front = -40 + (H + 80) * e;
    el.style.webkitMaskImage = el.style.maskImage = `linear-gradient(to bottom, transparent ${front - 30}px, #000 ${front + 30}px)`;
    if (k < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return 'sand';
}

// Landing page: play the opening at once. The desktop build waits for a steady frame clock instead.
export function playOpening(done) {
  run(typeof done === 'function' ? done : function () {}, true);
}
