// TimePeace animated layouts: canvas art for the 18 scenes. The art is drawn here, the clock rows stay
// DOM (live time, the user's own cities, any count) on top of it; css/scenes.css styles them per scene.
// The art is painted in the approved mockup's 800 x 800 space (the disc is the circle of radius 372 round
// 400,400) and scaled to the disc. Cities with a container in the art (hex cell, flower, lily pad, jar,
// jellyfish, balloon, planet) have it drawn from the measured position of their DOM row.
// One shared rAF loop at most 30 fps; nothing runs while the window is hidden or minimized, the canvas is offscreen, or motion is off.
// Lock never touches the art: a locked clock looks and animates exactly like an unlocked one.

const W = 800, CX = 400, CY = 400, R = 372, TAU = Math.PI * 2, W8 = TAU / 8;
export const FPS = 30;          // frame cap
export const MAX_DPR = 1.5;     // the canvas never renders finer than this
const PW = 132, PH = 64;        // a city pill in art units

let x = null;                   // the context being painted (the aurora swaps it for its sky layer)
let STILL = false;              // one frame, no particles
let TH = { ink: '#3b2414', paper: '#f6ead2', accent: '#e0632a', brandLight: '#b84a1c', dark: false };
let ROWS = [], LOC = null, PACK = false;   // other cities: {x,y,w,h,s,i,hour}; the local row; more than four cities
let OX = [], OY = [], VARS = {};           // per row offsets (art units) and CSS variables the scene wants set this frame

const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const sstep = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const lp = (t, ph = 0, n = 1) => (((t / 8) * n + ph) % 1 + 1) % 1;   // looping 0..1 phase, n whole cycles per 8 s
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixc = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
const acc = a => { const c = hexRGB(TH.accent); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
function grad(y0, y1, stops) { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function rgrad(cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function shadowOn(c = 'rgba(0,0,0,.35)', b = 12, y = 4) { x.shadowColor = c; x.shadowBlur = b; x.shadowOffsetY = y; }
function shadowOff() { x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0; }
function rr(px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function sky(stops) { x.fillStyle = grad(0, 800, stops); x.fillRect(0, 0, W, W); }
function stars(t, n, seed, alpha = 1, ymax = 800, dim, sz = 1) {
  const r = rnd(seed);
  x.fillStyle = '#fff';
  for (let i = 0; i < n; i++) {
    const sx = r() * 800, sy = r() * ymax, s = (r() * 1.6 + .4) * sz, ph = r() * TAU, tw = .55 + .45 * Math.sin(W8 * 3 * t + ph);
    x.globalAlpha = alpha * tw * (dim ? dim(sx, sy) : 1);
    x.beginPath(); x.arc(sx, sy, s, 0, TAU); x.fill();
  }
  x.globalAlpha = 1;
}

// ---------- where the rows go (art units; the circle is 400,400 r 372) ----------
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// n cities (1 to 4) along the four places the art was drawn with; four is exactly the approved picture
function arc4(n, P) {
  const at = t => { const f = clamp(t, 0, 1) * 3, i = Math.min(2, Math.floor(f)), u = f - i; return [lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u)]; };
  return Array.from({ length: n }, (_, i) => at(.5 + (i - (n - 1) / 2) / 3));
}
// four places as two above, two below; fewer cities keep the lower pair and the middle between them
function quad4(n, [a, b, c, d]) { return n < 1 ? [] : n === 1 ? [mid(c, d)] : n === 2 ? [c, d] : n === 3 ? [a, b, mid(c, d)] : [a, b, c, d]; }
// more than four cities: rows of equal pills, bottom up, shrinking as the count grows
function pack(n, o = {}) {
  const s = n <= 8 ? .86 : n <= 12 ? .72 : .6, cap = n > 12 ? 5 : 4, rows = Math.ceil(n / cap);
  const w = o.d ? o.d * s : (o.w || PW) * s, h = o.d ? o.d * s : (o.h || PH) * s, gap = 8, yb = o.yb || 640, out = [];
  for (let j = 0, left = n; j < rows; j++) {
    const m = Math.ceil(left / (rows - j)); left -= m;
    for (let k = 0; k < m; k++) out.push({ x: CX + (k - (m - 1) / 2) * (w + gap), y: yb - (rows - 1 - j) * (h + gap + 1 + (o.rowGap || 0)), w, h, s });
  }
  return out;
}
const dims = (pts, w = PW, h = PH) => pts.map(p => ({ x: p[0], y: p[1], w, h, s: w / PW }));
// local row box: art units centred on the time block
const LW = 300, LH = 116;
const locBox = (cx, cy, w = LW, h = LH) => ({ x: cx, y: cy - 5, w, h });

const BOT = [[198, 562], [322, 642], [478, 642], [602, 562]];
const up = (P, dy) => P.map(p => [p[0], p[1] + dy]);
// A scene's place table: loc [x, y] of the time block, arc or quad for the four city places, w/h for the pills,
// pack for the shape used past four cities, lbox for a boxed local row. slots(n, hours) replaces all of this.
const SC = {};
function slotsFor(id, n, hours) {
  const d = SC[id];
  if (d.slots) return d.slots(n, hours || []);
  const pk = n > 4, w = d.w || PW, h = d.h || PH;
  const lc = pk ? d.packLoc || [d.loc[0], Math.min(d.loc[1], 340)] : d.loc;
  const loc = locBox(lc[0], lc[1], d.lbox && d.lbox[0], d.lbox && d.lbox[1]);
  const others = pk ? pack(n, d.pack || { w, h }) : dims(d.arc ? arc4(n, d.arc) : quad4(n, d.quad), w, h);
  return { loc, others };
}

// ---------- the scenes ----------
// 01 Bees and honeycomb: every city is a hex cell, the local one the big cell
const hexPath = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
SC.honeycomb = {
  name: 'Bees & Honeycomb', hero: 2, light: false,
  slots(n) {
    const hexDims = r => ({ w: Math.sqrt(3) * r, h: 2 * r });
    const lr = n > 4 ? 104 : 126, L = { x: CX, y: n > 4 ? 372 : 390, ...hexDims(lr) };
    if (n <= 4) { const pts = arc4(n, [[235, 535], [328, 652], [472, 652], [565, 535]]); return { loc: L, others: pts.map(p => ({ x: p[0], y: p[1], ...hexDims(80), s: 1 })) }; }
    for (let r = n <= 7 ? 66 : n <= 10 ? 56 : 48; r > 24; r *= .92) {
      const sx = Math.sqrt(3) * r * 1.04, sy = 1.5 * r * 1.04, c = [];
      for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) {
        const px = CX + (i + (j & 1 ? .5 : 0)) * sx, py = 430 + j * sy, dl = Math.hypot(px - L.x, py - L.y);
        if (Math.hypot(px - CX, py - CY) + r * 1.05 > R - 8 || dl < lr + r * .95 + 6 || py < 170) continue;
        c.push([px, py, Math.hypot(px - CX, py - 560)]);
      }
      if (c.length >= n) { c.sort((a, b) => a[2] - b[2]); return { loc: L, others: c.slice(0, n).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(p => ({ x: p[0], y: p[1], ...hexDims(r), s: r / 80 })) }; }
    }
    return { loc: L, others: pack(n) };
  },
  bg() {
    sky(['#ffe7a3', '#f6c453', '#d98f1f']);
    x.strokeStyle = 'rgba(160,90,10,.18)'; x.lineWidth = 3;
    for (let j = -1; j < 11; j++) for (let i = -1; i < 11; i++) { hexPath(i * 78 + (j % 2) * 39, j * 68, 44); x.stroke(); }
    const cells = [[LOC.x, LOC.y, LOC.h / 2], ...ROWS.map(r => [r.x, r.y, r.h / 2])];
    cells.forEach(([cx, cy, r]) => { x.save(); shadowOn('rgba(120,60,0,.45)', 20, 8); hexPath(cx, cy, r); x.fillStyle = rgrad(cx - r * .3, cy - r * .4, 4, r * 1.2, ['#fff4c9', '#ffcf4a', '#e79a1d']); x.fill(); shadowOff(); x.lineWidth = 5; x.strokeStyle = '#b8700f'; x.stroke(); x.restore(); });
  },
  fg(t) {
    // honey drips over the cell edge: teardrop with a highlight
    [[LOC.x, LOC.y, LOC.h / 2], ...ROWS.map(r => [r.x, r.y, r.h / 2])].forEach(([cx, cy, r], i) => {
      x.save();
      const dl = 5 + 7 * (.5 + .5 * Math.sin(W8 * 2 * t + i)), dx = cx + r * .3, y0 = cy + r * .8;
      x.fillStyle = '#e8920f'; x.beginPath(); x.moveTo(dx, y0); x.bezierCurveTo(dx + 1, y0 + dl * .45, dx + 6, y0 + dl * .7, dx + 6, y0 + dl + 3); x.arc(dx, y0 + dl + 3, 6, 0, Math.PI); x.bezierCurveTo(dx - 6, y0 + dl * .7, dx - 1, y0 + dl * .45, dx, y0); x.fill();
      x.fillStyle = 'rgba(255,236,170,.8)'; x.beginPath(); x.ellipse(dx - 2, y0 + dl + 1, 1.6, 2.6, 0, 0, TAU); x.fill(); x.restore();
    });
    if (STILL) return;
    // bees wander the comb but keep out of the cells (the text lives there)
    const ex = [[LOC.x, LOC.y - 10, LOC.w * .6, LOC.h * .39], ...ROWS.map(r => [r.x, r.y, r.w * .46, r.h * .21])];
    const pos = (b, tt) => {
      const kx = [1, 2, 1, 3, 2, 1, 3][b], ky = [2, 1, 3, 1, 3, 2, 2][b];
      let bx = CX + Math.sin(W8 * kx * tt + b * 1.7) * (250 - b * 12) + Math.sin(W8 * 5 * tt + b) * 22, by = CY + Math.sin(W8 * ky * tt + b * .9) * (215 - b * 8) + Math.sin(W8 * 7 * tt + b * 2) * 14;
      ex.forEach(([ecx, ecy, rx, ry]) => { const ux = (bx - ecx) / rx, uy = (by - ecy) / ry, d = Math.hypot(ux, uy); if (d < 1 && d > 1e-4) { bx = ecx + ux / d * rx; by = ecy + uy / d * ry; } });
      return [bx, by];
    };
    for (let b = 0; b < 7; b++) {
      const [bx, by] = pos(b, t), [nx, ny] = pos(b, t + .03), ang = Math.atan2(ny - by, nx - bx);
      x.fillStyle = 'rgba(90,50,0,.25)'; for (let k = 1; k < 6; k++) { const [qx, qy] = pos(b, t - k * .12); x.beginPath(); x.arc(qx, qy, 2 - k * .25, 0, TAU); x.fill(); }
      x.save(); x.translate(bx, by); x.rotate(ang); if (Math.cos(ang) < 0) x.scale(1, -1);
      const fl = Math.sin(W8 * 80 * t + b) * .5 + .5;
      x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(-2, -9 - fl * 3, 9, 5 + fl * 2, -.4, 0, TAU); x.fill(); x.beginPath(); x.ellipse(4, -8 - fl * 3, 7, 4 + fl * 2, .4, 0, TAU); x.fill();
      x.fillStyle = '#ffc81e'; x.beginPath(); x.ellipse(0, 0, 13, 8, 0, 0, TAU); x.fill(); x.fillStyle = '#2b1600'; x.fillRect(-4, -8, 4, 16); x.fillRect(4, -7, 3, 14); x.beginPath(); x.arc(12, 0, 5, 0, TAU); x.fill(); x.restore();
    }
  },
  vars: { '--sc-brand': '#7a3d05' }
};

// 02 Butterfly garden: every city is the heart of a flower
const flower = (cx, cy, r, col, t, i) => {
  x.save(); x.translate(cx, cy); x.rotate(Math.sin(W8 * t + i) * .06);
  for (let k = 0; k < 6; k++) { x.rotate(TAU / 6); x.fillStyle = col; x.beginPath(); x.ellipse(0, -r * .62, r * .42, r * .6, 0, 0, TAU); x.fill(); }
  x.fillStyle = 'rgba(255,252,240,.94)'; x.beginPath(); x.arc(0, 0, r * .72, 0, TAU); x.fill(); x.restore();
};
SC.butterflies = {
  name: 'Butterfly Garden', hero: 1, light: true, loc: [400, 320], packLoc: [400, 290], lbox: [340, 190], arc: BOT, w: 100, h: 100, pack: { d: 100, yb: 626, rowGap: 6 },
  bg() { sky(['#bfe8ff', '#e6f7e4', '#9fd88a']); },
  fg(t) {
    x.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 4; i++) { const cx = ((i * 250 + (t / 8) * 1000) % 1000) - 100; x.beginPath(); x.ellipse(cx, 120 + i * 40, 70, 18, 0, 0, TAU); x.fill(); }
    x.fillStyle = '#6fbf5a'; x.beginPath(); x.moveTo(0, 640); for (let i = 0; i <= 20; i++) x.lineTo(i * 40, 620 + Math.sin(i * 1.3) * 18); x.lineTo(800, 800); x.lineTo(0, 800); x.fill();
    const cols = ['#ff8fb1', '#b48cff', '#ffb347', '#6ccff6'];
    ROWS.forEach((r, i) => { const fr = r.w * .7; x.strokeStyle = '#4f9a3c'; x.lineWidth = 5; x.beginPath(); x.moveTo(r.x, r.y + fr * .6); x.quadraticCurveTo(r.x + 10, r.y + fr * 1.5, r.x, 800); x.stroke(); flower(r.x, r.y, fr, cols[i % 4], t, i); });
    if (STILL) return;
    for (let b = 0; b < 6; b++) {
      const kx = [1, 2, 1, 1, 2, 1][b], ky = [1, 2, 3, 2, 1, 3][b], bx = CX + Math.sin(W8 * kx * t + b * 1.05) * 300, by = CY - 40 + Math.sin(W8 * ky * t + b * 2) * 230 + Math.sin(W8 * 3 * t + b) * 10;
      const flap = Math.abs(Math.sin(W8 * 72 * t + b * 1.3)), c = cols[b % 4];
      x.save(); x.translate(bx, by); x.rotate(Math.cos(W8 * kx * t + b * 1.05) * .5); x.scale(.9 + .1 * (b % 3), 1);
      const wing = () => { x.beginPath(); x.ellipse(13, -9, 15, 12, -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(9, 8, 9, 8, .5, 0, TAU); x.fill(); };
      [-1, 1].forEach(s => { x.save(); x.scale(s * (.25 + .75 * flap), 1); x.fillStyle = c; x.globalAlpha = .92; wing(); if (flap < .3) { x.fillStyle = 'rgba(60,30,70,.4)'; wing(); } x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(14, -10, 4, 0, TAU); x.fill(); x.restore(); });
      x.fillStyle = '#2b1d12'; x.fillRect(-1.5, -12, 3, 24); x.restore();
    }
  },
  vars: { '--sc-brand': 'accent' }
};

// 03 Sun and moon: a day and night ring turning behind the clock; cities in daylight get a light pill
SC.sunmoon = {
  name: 'Sun & Moon', hero: 2.8, light: false, loc: [400, 370], arc: up(BOT, 20),
  fg(t) {
    const a = W8 * t - 0.6, day = (Math.sin(a) + 1) / 2;
    sky([`hsl(${lerp(235, 205, day)} ${lerp(45, 70, day)}% ${lerp(10, 62, day)}%)`, `hsl(${lerp(260, 40, day)} ${lerp(40, 85, day)}% ${lerp(22, 80, day)}%)`]);
    stars(t, 90, 7, 1 - day);
    x.save(); x.translate(CX, CY); x.rotate(a); x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 2; x.setLineDash([4, 10]); x.beginPath(); x.arc(0, 0, 290, 0, TAU); x.stroke(); x.setLineDash([]);
    x.fillStyle = rgrad(0, -290, 0, 90, ['rgba(255,230,140,.9)', 'rgba(255,200,80,0)']); x.beginPath(); x.arc(0, -290, 90, 0, TAU); x.fill(); x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(0, -290, 40, 0, TAU); x.fill();
    for (let k = 0; k < 12; k++) { x.save(); x.translate(0, -290); x.rotate(k * TAU / 12 + W8 * t); x.fillStyle = '#ffc22e'; x.fillRect(-3, -62, 6, 14); x.restore(); }
    x.fillStyle = rgrad(0, 290, 0, 80, ['rgba(220,230,255,.6)', 'rgba(220,230,255,0)']); x.beginPath(); x.arc(0, 290, 80, 0, TAU); x.fill();
    // crescent: the moon disc minus a bite, cut with an even-odd clip so no sky colour is painted over the scene
    x.save(); x.beginPath(); x.rect(-1000, -1000, 2000, 2000); x.moveTo(44, 282); x.arc(14, 282, 30, 0, TAU); x.clip('evenodd'); x.fillStyle = '#eef1ff'; x.beginPath(); x.arc(0, 290, 34, 0, TAU); x.fill(); x.restore(); x.restore();
    const sun = .5 * Math.exp(-Math.pow((day - .5) / .17, 2)); x.fillStyle = grad(470, 640, [acc(0), acc(sun), acc(0)]); x.fillRect(0, 470, W, 170);
    x.fillStyle = `rgba(20,25,50,${lerp(.85, .35, day)})`; x.beginPath(); x.moveTo(0, 600); x.bezierCurveTo(200, 560, 500, 640, 800, 580); x.lineTo(800, 800); x.lineTo(0, 800); x.fill();
    // the time block turns from moonlight to ink with the sky
    const m = sstep((day - .4) / .2);
    VARS['--sc-lfg'] = mixc('#f4f1ff', TH.dark ? '#f4f1ff' : TH.ink, m); VARS['--sc-lglow'] = `rgba(160,170,255,${(.6 * (1 - m)).toFixed(2)})`; VARS['--sc-brand'] = mixc('#ffcf6b', TH.brandLight, m);
  }
};

// 04 Elephant parade
function elephant(ex, ey, s, t, flip, sil, hold) {
  const body = sil || '#8b93a8', ear = sil || '#7a8297';
  x.save(); x.translate(ex, ey); x.scale(flip ? -s : s, s); const step = Math.sin(W8 * 8 * t);
  x.fillStyle = body; [[-40, step], [-15, -step], [20, step], [45, -step]].forEach(([lx, ph]) => { x.save(); x.translate(lx, 30); x.rotate(ph * .18); rr(-10, 0, 20, 46, 8); x.fill(); x.restore(); });
  x.beginPath(); x.ellipse(0, 10, 70, 48, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(70, -12, 34, 0, TAU); x.fill();
  x.strokeStyle = body; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(-66, -2); x.quadraticCurveTo(-84, 18, -80 + Math.sin(W8 * 2 * t) * 5, 48); x.stroke();
  x.fillStyle = ear; x.beginPath(); x.ellipse(52, -8, 22, 30, .2, 0, TAU); x.fill();
  x.strokeStyle = body; x.lineWidth = 16; const tr = Math.sin(W8 * 2 * t) * .4; x.beginPath(); x.moveTo(98, -5); if (hold) x.quadraticCurveTo(118, 26, 126, 6); else x.quadraticCurveTo(118, 30 + tr * 20, 105 + tr * 25, -40 - tr * 30); x.stroke();
  if (!sil) { x.fillStyle = '#fff'; x.beginPath(); x.arc(82, -20, 4, 0, TAU); x.fill(); x.fillStyle = '#222'; x.beginPath(); x.arc(83, -20, 2, 0, TAU); x.fill(); }
  x.restore();
}
function dust(ex, ey, s, t, col) { for (let k = 0; k < 4; k++) { const u = lp(t, k * .25, 8); x.globalAlpha = .32 * (1 - u); x.fillStyle = col; x.beginPath(); x.arc(ex + (-40 + k * 28) * s - u * 26 * s, ey + 74 * s - u * 9 * s, (3 + 10 * u) * s, 0, TAU); x.fill(); } x.globalAlpha = 1; }
// scrolling ground: tiles are 400 wide and move one tile per 8 s, so they loop without a seam
function acacia(bx, gy, col) { x.fillStyle = col; x.fillRect(bx - 5, gy - 120, 10, 125); x.beginPath(); x.ellipse(bx, gy - 122, 78, 20, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(bx - 34, gy - 138, 44, 14, 0, 0, TAU); x.fill(); }
function scrollGround(t, gy, o) {
  const off = (t / 8) * 400;
  if (o.tree) for (let k = -1; k < 3; k++) acacia(k * 400 - off + 250, gy, o.tree);
  o.rows.forEach(([ry, mult, col]) => { x.fillStyle = col; const so = (off * mult) % 400; for (let k = -1; k < 3; k++) for (let j = 0; j < 4; j++) { const px = k * 400 - so + j * 100 + ((j * 37 + ry) % 50); x.beginPath(); x.moveTo(px - 7, ry); x.lineTo(px - 3, ry - 15); x.lineTo(px, ry); x.lineTo(px + 3, ry - 19); x.lineTo(px + 7, ry); x.fill(); } });
}
SC.elephant = {
  name: 'Elephant Parade', hero: 1.3, light: true, loc: [400, 280], quad: [[150, 300], [650, 300], [130, 450], [670, 450]],
  bg() { sky(['#ffd9a0', '#ffb77a', '#f3d9a6']); x.fillStyle = 'rgba(255,240,200,.9)'; x.beginPath(); x.arc(400, 500, 76, 0, TAU); x.fill(); x.fillStyle = '#e8c07a'; x.beginPath(); x.moveTo(0, 570); x.bezierCurveTo(300, 545, 500, 595, 800, 560); x.lineTo(800, 800); x.lineTo(0, 800); x.fill(); },
  fg(t) {
    scrollGround(t, 575, { tree: '#8a6a3c', rows: [[640, 1, '#c99b55'], [730, 2, '#b88a46']] });
    const ey = 545, ex = 400;
    if (!STILL) { dust(ex, ey, .85, t, '#d9b383'); dust(287, 583, .38, t + .5, '#d9b383'); dust(175, 548, .55, t + .25, '#d9b383'); }
    elephant(175, 548, .55, t + .25, false); elephant(287, 583, .38, t + .5, false, null, true); elephant(ex, ey, .85, t, false);
    if (!STILL) { for (let k = 0; k < 14; k++) { const q = lp(t, k / 14, 8), bx = ex + 100 * .85 + q * 140, by = ey - 45 * .85 - Math.sin(q * Math.PI) * 100; x.globalAlpha = 1 - q; x.fillStyle = '#8fd3ff'; x.beginPath(); x.arc(bx, by, 4 + q * 4, 0, TAU); x.fill(); } x.globalAlpha = 1; }
    ROWS.forEach((r, i) => { OY[i] = Math.sin(W8 * 2 * t + i) * 4; });
  },
  vars: { '--sc-brand': 'accent' }
};

// radial glow sprites, one per colour, drawn scaled with globalAlpha instead of building a gradient every frame
const SPR = {};
function spriteGlow(rgb, a) { const k = rgb + a; if (!SPR[k]) { const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); SPR[k] = c; } return SPR[k]; }

// 05 Fireflies: every city is a glowing jar
SC.fireflies = {
  name: 'Fireflies', hero: 1, light: false, loc: [400, 310], quad: [[180, 470], [620, 470], [290, 640], [510, 640]], w: 136, h: 84, pack: { w: 136, h: 84, yb: 636 },
  bg() { sky(['#06121e', '#0c2a2a', '#0a1a12']); },
  fg(t) {
    stars(t, 50, 3, .6, 400);
    // three parallax pine layers
    [['#0b2218', 500, .5, 60, 1], ['#071a12', 545, 1, 52, 2], ['#04100b', 590, 1.8, 46, 3]].forEach(([c, by, par, h, L]) => { x.fillStyle = c; const sw = Math.sin(W8 * t) * par * 3; for (let i = -1; i < 11; i++) { const bx = i * 86 + L * 23 + sw; x.beginPath(); x.moveTo(bx, 800); x.lineTo(bx + 43, by - h - (i * L % 3) * 16); x.lineTo(bx + 86, 800); x.fill(); } });
    ROWS.forEach((r, i) => {
      const g = .6 + .4 * Math.sin(W8 * 2 * t + i * 1.7), jr = r.h * 1.3;
      x.globalAlpha = g; x.drawImage(spriteGlow('220,255,120', .35), r.x - jr, r.y - jr, jr * 2, jr * 2); x.globalAlpha = 1;
      rr(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, r.h * .19); x.fillStyle = 'rgba(20,40,25,.72)'; x.fill(); x.strokeStyle = `rgba(200,255,150,${.28 + .15 * g + .1})`; x.lineWidth = 2.5; x.stroke();
      x.fillStyle = 'rgba(70,60,40,.8)'; rr(r.x - r.w * .32, r.y - r.h / 2 - 10, r.w * .64, 12, 4); x.fill();
    });
    const boxes = [...ROWS.map(r => [r.x, r.y, r.w / 2, r.h / 2]), [LOC.x, LOC.y - 40, 110, 64]];
    const nearT = (fx, fy) => { let m = 1; boxes.forEach(([cx, cy, hx, hy]) => { const d = Math.hypot(Math.max(Math.abs(fx - cx) - hx, 0), Math.max(Math.abs(fy - cy) - hy, 0)); m = Math.min(m, d / 45); }); return clamp(m, 0, 1); };
    const r = rnd(11), n = STILL ? 14 : 40;
    for (let i = 0; i < n; i++) {
      const ph = r() * TAU, kx = 1 + Math.floor(r() * 2), ky = 1 + Math.floor(r() * 3), ax = 150 + r() * 230, ay = 120 + r() * 220, bk = 2 + Math.floor(r() * 3);
      const fx = 400 + Math.sin(W8 * kx * t + ph) * ax, fy = 400 + Math.cos(W8 * ky * t + ph * 2) * ay, b = (STILL ? .7 : Math.max(0, Math.sin(W8 * bk * t + ph))) * nearT(fx, fy);
      if (b < .02) continue;
      x.globalAlpha = b; x.drawImage(spriteGlow('240,255,150', 1), fx - 14, fy - 14, 28, 28); x.fillStyle = '#ffffdc'; x.beginPath(); x.arc(fx, fy, 2, 0, TAU); x.fill(); x.globalAlpha = 1;
    }
  },
  vars: { '--sc-brand': '#d8ff7a' }
};

// 06 Koi pond: the cities sit on lily pads, the fish swim underneath
SC.koi = {
  name: 'Koi Pond', hero: 2, light: false, loc: [400, 410], quad: [[190, 250], [610, 250], [200, 590], [600, 590]], pack: { rowGap: 36, yb: 626 },
  bg() { x.fillStyle = rgrad(CX, CY, 50, 520, ['#3aa6a0', '#1d6f7a', '#0d3d4d']); x.fillRect(0, 0, W, W); },
  fg(t) {
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; for (let k = 0; k < 4; k++) { const u = lp(t, k * .25); x.globalAlpha = 1 - u; x.beginPath(); x.arc(560, 250, u * 360, 0, TAU); x.stroke(); } x.globalAlpha = 1;
    const FP = p => [CX + Math.cos(p) * 250, CY + Math.sin(p) * 190], OFF = [0, 2.1, 4.2], TS = [1.5, 4.2, 6.6];
    if (!STILL) TS.forEach((ts, i) => { const u = lp(t - ts) * 8; if (u < 1.8) { const [rx, ry] = FP(W8 * ts + OFF[i]); x.strokeStyle = `rgba(255,255,255,${.4 * (1 - u / 1.8)})`; x.lineWidth = 2; x.beginPath(); x.arc(rx, ry, u * 34, 0, TAU); x.stroke(); x.beginPath(); x.arc(rx, ry, u * 20, 0, TAU); x.stroke(); } });
    const fish = (p, col, sz, spot) => {
      const [fx, fy] = FP(p), ang = p + Math.PI / 2; x.save(); x.translate(fx, fy); x.rotate(ang); x.scale(sz, sz); const w = Math.sin(W8 * 8 * t + p * 3) * .35;
      x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(8, 10, 40, 14, 0, 0, TAU); x.fill();
      x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, 40, 14, 0, 0, TAU); x.fill(); x.save(); x.translate(-38, 0); x.rotate(w); x.beginPath(); x.moveTo(0, 0); x.lineTo(-26, -14); x.quadraticCurveTo(-18, 0, -26, 14); x.fill(); x.restore();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(8, -3, 12, 6, 0, 0, TAU); x.fill(); x.fillStyle = '#d23b1f'; x.beginPath(); x.ellipse(-12, 2, 10, 6, 0, 0, TAU); x.fill();
      x.fillStyle = spot; [[-4, -6, 5, 3], [-24, 4, 4, 2.6], [20, 5, 4, 2.4], [-30, -4, 3, 2]].forEach(([sx, sy, a, b]) => { x.beginPath(); x.ellipse(sx, sy, a, b, 0, 0, TAU); x.fill(); });
      x.fillStyle = '#111'; x.beginPath(); x.arc(30, -6, 1.8, 0, TAU); x.arc(30, 6, 1.8, 0, TAU); x.fill(); x.restore();
    };
    [0, 1, 2].forEach(i => fish(W8 * t + OFF[i], ['#ff7a2f', '#fff3e6', '#ffb21c'][i], 1, ['rgba(40,20,10,.55)', 'rgba(210,80,30,.7)', 'rgba(150,60,10,.55)'][i]));
    // fish first, pads after: the fish swim under the pads
    ROWS.forEach((r, i) => {
      const bob = Math.sin(W8 * 2 * t + i) * 3, pr = r.w * (PACK ? .5 : .58); OY[i] = bob;
      x.save(); x.translate(r.x, r.y + bob); x.fillStyle = '#3f9a46'; x.beginPath(); x.arc(0, 0, pr, .25, TAU - .05); x.lineTo(0, 0); x.fill(); x.strokeStyle = '#2c7a35'; x.lineWidth = 2; x.stroke(); x.restore();
    });
  },
  vars: { '--sc-brand': '#ffd27a' }
};

// 07 Paper planes: a plane leaves the local time for each city along a dashed route
SC.planes = {
  name: 'Paper Planes', hero: 0, light: true, loc: [400, 380], quad: [[160, 300], [640, 300], [150, 560], [650, 560]],
  bg() {
    sky(['#fdf6e7', '#f1e3c4']);
    x.strokeStyle = 'rgba(120,90,50,.08)'; x.lineWidth = 1; for (let i = 0; i < 800; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 800); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(800, i); x.stroke(); }
  },
  fg(t) {
    const n = ROWS.length, L = [CX, n === 4 ? CY + 190 : PACK ? LOC.y + 72 : CY + 70], P = ROWS.map(r => [r.x, r.y - (PACK ? r.h / 2 : 0)]);
    const ctl = P.map(([px, py]) => [px, L[1] + (py > L[1] + 20 ? 40 : 0)]);
    P.forEach(([px, py], i) => { const c1 = ctl[i]; x.strokeStyle = TH.accent; x.globalAlpha = .55; x.setLineDash([6, 8]); x.lineDashOffset = -lp(t) * 14 * 17; x.lineWidth = 2.5; x.beginPath(); x.moveTo(L[0], L[1]); x.quadraticCurveTo(c1[0], c1[1], px, py); x.stroke(); x.setLineDash([]); x.globalAlpha = 1; });
    x.fillStyle = TH.accent; x.beginPath(); x.arc(L[0], L[1], 8, 0, TAU); x.fill();
    P.forEach(([px, py], i) => {
      const c1 = ctl[i], f = lp(t, i / Math.max(n, 4)), d = (f + .08) % 1; OY[i] = -(d < .12 ? Math.sin(Math.PI * d / .12) * 5 : 0);
      if (STILL) return;
      const q = ease(f), fa = Math.min(1, f * 8, (1 - f) * 8), bx = (1 - q) * (1 - q) * L[0] + 2 * (1 - q) * q * c1[0] + q * q * px, by = (1 - q) * (1 - q) * L[1] + 2 * (1 - q) * q * c1[1] + q * q * py;
      const dx = 2 * (1 - q) * (c1[0] - L[0]) + 2 * q * (px - c1[0]), dy = 2 * (1 - q) * (c1[1] - L[1]) + 2 * q * (py - c1[1]);
      x.save(); x.globalAlpha = fa; x.translate(bx, by); x.rotate(Math.atan2(dy, dx)); shadowOn('rgba(0,0,0,.25)', 6, 6); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(18, 0); x.lineTo(-14, -11); x.lineTo(-8, 0); x.lineTo(-14, 11); x.closePath(); x.fill(); shadowOff(); x.strokeStyle = '#9a8a70'; x.lineWidth = 1; x.stroke(); x.beginPath(); x.moveTo(18, 0); x.lineTo(-8, 0); x.stroke(); x.restore();
    });
  },
  vars: { '--sc-brand': 'accent' }
};

// 08 Northern lights over a still lake
const AU = {};
const AUR = {   // vertical ray profiles: [pos, hue, sat, light, alpha], top to bottom
  far: [[0, 170, 80, 55, 0], [.3, 160, 90, 55, .22], [.8, 150, 100, 65, .5], [1, 150, 100, 70, 0]],
  main: [[0, 268, 100, 74, 0], [.28, 268, 100, 72, .3], [.6, 175, 80, 55, .55], [.86, 150, 100, 71, .95], [1, 150, 100, 71, 0]],
  near: [[0, 190, 90, 60, 0], [.4, 170, 90, 60, .5], [.85, 145, 100, 75, 1], [1, 145, 100, 75, 0]]
};
const CURT = [{ k: 'far', low: 300, side: 70, h: 150, al: .34, A: 38, kk: TAU / 430, sp: 1, ph: .7 }, { k: 'main', low: 225, side: 120, h: 200, al: .62, A: 78, kk: TAU / 370, sp: 2, ph: 0 }, { k: 'near', low: 262, side: 95, h: 95, al: .9, A: 52, kk: TAU / 250, sp: -1, ph: 2.1 }];
function curtGeo(c, ci, s, t) { const arg = c.kk * s + W8 * c.sp * t + c.ph, sideT = Math.pow((s - 400) / 440, 2); return { px: s + c.A * Math.sin(arg), dxds: 1 + c.A * c.kk * Math.cos(arg), yl: c.low + c.side * sideT + 10 * Math.sin(s * .013 + W8 * 2 * t + ci), hh: c.h * (.75 + .25 * Math.sin(s * .011 + W8 * t + ci * 2)) * (1 - .25 * sideT) }; }
function covAt(sx, sy, t) { let v = 0; CURT.forEach((c, ci) => { const g = curtGeo(c, ci, sx, t); v += Math.max(0, 1 - Math.abs((sy - (g.yl - g.hh * .4)) / (g.hh * .6))) * c.al; }); return Math.min(1, v); }
function smoothRidge(seed, amp, rough) {
  const r = rnd(seed); let p = [0, 0];
  for (let it = 0; it < 7; it++) { const q = []; for (let i = 0; i < p.length - 1; i++) q.push(p[i], (p[i] + p[i + 1]) / 2 + (r() - .5) * amp); q.push(p[p.length - 1]); p = q; amp *= rough; }
  for (let pass = 0; pass < 2; pass++) p = p.map((v, i) => i && i < p.length - 1 ? (p[i - 1] + 2 * v + p[i + 1]) / 4 : v);
  return p;
}
function raySprite(kind, off) {
  const key = kind + off; if (AU.rays[key]) return AU.rays[key];
  const c = mkCanvas(1, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  AUR[kind].forEach(([p, h, s, l, a]) => gr.addColorStop(p, `hsla(${h + off},${s}%,${l}%,${a})`)); g.fillStyle = gr; g.fillRect(0, 0, 1, 128);
  return AU.rays[key] = c;
}
function auroraInit() {
  if (AU.SK) return;
  AU.rays = {}; AU.AB = mkCanvas(160, 100); AU.abx = AU.AB.getContext('2d'); AU.SK = mkCanvas(400, 300);   // the sky layer is half size: the aurora is soft and this is a quarter of the pixels
   AU.skx = AU.SK.getContext('2d');
  AU.far = smoothRidge(31, 150, .52); AU.near = smoothRidge(77, 110, .5);
  const r = rnd(9); AU.pines = []; for (let i = 0; i <= 100; i++) AU.pines.push(r() > .18 ? 10 + r() * 22 : 0);
  const g = rnd(55); AU.glints = []; for (let i = 0; i < 14; i++) AU.glints.push([60 + g() * 680, 612 + g() * 170, 10 + g() * 28, g() * TAU]);
}
function ridgePath(arr, base, sc) { x.beginPath(); x.moveTo(0, 600); arr.forEach((v, i) => x.lineTo(i * 800 / (arr.length - 1), base + v * sc)); x.lineTo(800, 600); x.closePath(); }
function auroraSky(t, main) {
  x = AU.skx; x.setTransform(.5, 0, 0, .5, 0, 0); x.clearRect(0, 0, 800, 600);
  x.fillStyle = grad(0, 600, ['#020617', '#06142e', '#0b2340', '#0e2a3a']); x.fillRect(0, 0, 800, 600);
  x.fillStyle = grad(420, 600, [acc(0), acc(.10)]); x.fillRect(0, 420, 800, 180);   // a faint warm horizon behind the ridges
  stars(t, 140, 5, .9, 430, (sx, sy) => 1 - covAt(sx, sy, t), 1.5);
  const abx = AU.abx; abx.clearRect(0, 0, 160, 100); abx.globalCompositeOperation = 'lighter';
  CURT.forEach((c, ci) => {
    for (let s = -40; s <= 840; s += 8) {
      const g = curtGeo(c, ci, s, t); if (g.px < -20 || g.px > 820) continue;
      const br = Math.sqrt(clamp(Math.abs(g.dxds), .2, 1.4)), u = s / 800;   // columns stack where the curtain folds, so the alpha shrinks there: a bright, unsaturated pleat
      let a = c.al * br * .62 * (.75 + .25 * Math.sin(u * 6 - W8 * 2 * t + ci)) * (.62 + .38 * Math.sin(s * .017 + W8 * t + ci * 2));
      if (g.yl > 200 && g.yl - g.hh < 340) a *= 1 - .45 * Math.exp(-Math.pow((g.px - 400) / 170, 2));
      abx.globalAlpha = Math.min(1, a); abx.drawImage(raySprite(c.k, 8 * Math.round(Math.sin(s * .021 + W8 * 3 * t + ci))), g.px / 5 - 2, (g.yl - g.hh) / 5, 4, g.hh / 5);
    }
  });
  abx.globalAlpha = 1;
  x.save(); x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.drawImage(AU.AB, 0, 0, 800, 500);
  CURT.forEach((c, ci) => { if (c.k === 'far') return; x.globalAlpha = .07; for (let s = 0; s <= 800; s += 20) { const g = curtGeo(c, ci, s + (ci * 5) % 7, t), sp = raySprite(c.k, 0); if (g.px >= 0 && g.px < 800) x.drawImage(sp, g.px, g.yl - g.hh, 1, g.hh); } });
  x.restore();
  x.fillStyle = '#0a1a2c'; ridgePath(AU.far, 498, 1); x.fill(); x.fillStyle = '#040a12'; ridgePath(AU.near, 556, .8); x.fill();
  x.fillStyle = '#02070d'; x.beginPath(); x.moveTo(0, 604); AU.pines.forEach((h, i) => { const px = i * 8; x.lineTo(px, 604); x.lineTo(px + 4, 604 - h); x.lineTo(px + 8, 604); }); x.lineTo(800, 604); x.closePath(); x.fill();
  x = main;
}
SC.aurora = {
  name: 'Northern Lights', hero: 2.6, light: false, loc: [400, 290], quad: [[215, 595], [585, 595], [300, 675], [500, 675]], pack: { yb: 650 },
  fg(t) {
    auroraInit(); auroraSky(t, x); const SK = AU.SK; x.drawImage(SK, 0, 0, 800, 600);
    // the lake: gradient, the sky mirrored in 4 px ripple slices, a darkening, a shoreline, glints
    x.fillStyle = grad(600, 800, ['#0a1f33', '#030a14']); x.fillRect(0, 600, 800, 200);
    for (let y = 600; y < 800; y += 5) { const dy = y - 600, sy = 600 - (dy + 5) / .7; if (sy < 0) break; x.globalAlpha = .3 * (1 - dy / 200 * .6); x.drawImage(SK, 0, sy / 2, 400, 2.5 / .7, Math.sin(y * .15 + W8 * 2 * t) * 3, y, 800, 5); }
    x.globalAlpha = 1; x.fillStyle = grad(600, 800, ['rgba(2,8,16,0)', 'rgba(2,8,16,.6)']); x.fillRect(0, 600, 800, 200);
    x.fillStyle = 'rgba(160,255,220,.15)'; x.fillRect(0, 600, 800, 1);
    AU.glints.forEach(([gx, gy, gw, ph]) => { x.fillStyle = `rgba(180,255,225,${.22 * Math.max(0, Math.sin(W8 * 2 * t + ph))})`; x.fillRect(gx, gy, gw, 1.5); });
    if (!STILL && t >= 5.2 && t <= 5.9) {   // a shooting star once per loop
      const q = (t - 5.2) / .7, e = 1 - (1 - q) * (1 - q), hx = lerp(580, 390, e), hy = lerp(120, 190, e), al = Math.sin(Math.PI * q), ux = 190 / Math.hypot(190, 70), uy = -70 / Math.hypot(190, 70);
      x.save(); x.lineCap = 'round'; const g = x.createLinearGradient(hx, hy, hx + ux * 110, hy + uy * 110); g.addColorStop(0, `rgba(255,255,255,${al})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = g; x.lineWidth = 2.2; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + ux * 110, hy + uy * 110); x.stroke();
      x.fillStyle = `rgba(255,255,255,${al})`; x.beginPath(); x.arc(hx, hy, 2.4, 0, TAU); x.fill(); x.restore();
    }
  },
  vars: { '--sc-brand': '#ffe3c2' }
};

// 09 Lighthouse and waves
SC.ocean = {
  name: 'Lighthouse Waves', hero: 1.5, light: true, loc: [250, 310], arc: [[190, 560], [320, 630], [480, 630], [610, 570]],
  bg() {
    sky(['#0d1b3a', '#283f73', '#e08a6a']);
    x.fillStyle = '#2a2030'; x.beginPath(); x.moveTo(560, 520); x.lineTo(578, 340); x.lineTo(622, 340); x.lineTo(640, 520); x.fill(); x.fillStyle = '#e4e0dc'; [380, 440].forEach(y => x.fillRect(570 - (y - 340) * .02, y, 62, 20));
    x.fillStyle = '#ffe9a8'; x.fillRect(585, 318, 30, 22); x.fillStyle = '#2a2030'; x.beginPath(); x.moveTo(578, 318); x.lineTo(600, 296); x.lineTo(622, 318); x.fill();
  },
  fg(t) {
    stars(t, 40, 9, .6, 300);
    const ba = -2.4 + Math.sin(W8 * t) * 1.1; x.save(); x.globalCompositeOperation = 'lighter'; x.translate(600, 330); x.rotate(ba); const g = x.createLinearGradient(0, 0, 600, 0); g.addColorStop(0, 'rgba(255,240,180,.65)'); g.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(650, -90); x.lineTo(650, 90); x.fill(); x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rgrad(600, 329, 0, 95, ['rgba(255,236,170,.75)', 'rgba(255,220,150,0)']); x.beginPath(); x.arc(600, 329, 95, 0, TAU); x.fill(); x.restore();
    [[520, '#1e4a7a', 1, 1, 1], [580, '#173b66', -1, 2, 2], [650, '#102c50', 2, 2, 3]].forEach(([wy, c, s1, s2, k], i) => {
      const crest = px => wy + Math.sin(px / 60 + W8 * s1 * t + i) * 10 + Math.sin(px / 23 - W8 * s2 * t) * 4;
      x.fillStyle = c; x.beginPath(); x.moveTo(0, 800); for (let j = 0; j <= 40; j++) x.lineTo(j * 20, crest(j * 20)); x.lineTo(800, 800); x.fill();
      x.save(); x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2; x.setLineDash([16, 28]); x.lineDashOffset = -lp(t, 0, k * (i % 2 ? -1 : 1)) * 44 * 6; x.beginPath(); for (let j = 0; j <= 40; j++) { j ? x.lineTo(j * 20, crest(j * 20)) : x.moveTo(0, crest(0)); } x.stroke(); x.restore();
    });
    ROWS.forEach((r, i) => { OY[i] = Math.sin(W8 * 2 * t + i * 1.3) * 6; });   // the buoys bob
  },
  vars: { '--sc-brand': '#ffd59a' }
};

// 10 Cherry blossoms
SC.blossom = {
  name: 'Cherry Blossoms', hero: 1, light: true, loc: [400, 360], arc: up(BOT, 20), pack: { yb: 650 },
  bg() {
    sky(['#ffe3ec', '#fff4ee', '#fde2d0']);
    x.strokeStyle = '#5b3a2e'; x.lineCap = 'round'; x.lineWidth = 16; x.beginPath(); x.moveTo(40, 240); x.quadraticCurveTo(190, 215, 300, 150); x.stroke(); x.lineWidth = 8; x.beginPath(); x.moveTo(140, 222); x.quadraticCurveTo(210, 260, 280, 235); x.stroke();
    const r = rnd(4); for (let i = 0; i < 40; i++) { const u = r(), bx = 50 + u * 260, by = 150 + (1 - u) * 80 + (r() - .5) * 90; x.fillStyle = ['#ffb7cf', '#ff9ec0', '#ffd1e0'][i % 3]; x.beginPath(); x.arc(bx, by, 8 + r() * 8, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(255,160,190,.25)'; x.beginPath(); x.ellipse(CX, 730, 420, 80, 0, 0, TAU); x.fill();
  },
  fg(t) {
    const n = STILL ? 10 : 34, r2 = rnd(21), gust = Math.pow(Math.sin(Math.PI * clamp((t - 4) / 2, 0, 1)), 2);
    const keep = (px, py) => { const d = Math.hypot(Math.max(Math.abs(px - CX) - 120, 0), Math.max(Math.abs(py - LOC.y) - 60, 0)); return clamp(d / 50, 0, 1); };
    x.fillStyle = '#ff9fc2';
    for (let i = 0; i < n; i++) {
      const nn = 1 + (i % 2), ph = r2(), q = STILL ? ph : lp(t, ph, nn), px = r2() * 800 + Math.sin(q * TAU * 2 + i) * 40 - q * 160 + 80 + gust * 70 * (1 + (i % 3) * .3), py = q * 900 - 50, al = keep(px, py);
      if (al <= 0) continue;
      x.save(); x.globalAlpha = al; x.translate(px, py); x.rotate(q * TAU * 2 + i); x.scale(1, Math.abs(Math.sin(W8 * 2 * t + i)) * .7 + .3); x.beginPath(); x.ellipse(0, 0, 7, 4.5, 0, 0, TAU); x.fill(); x.restore();
    }
  },
  vars: { '--sc-brand': '#d9487a' }
};

// 11 Planet orbit: every other city is a planet at the angle of its hour; the local time sits on the sun
const PCOL = [['#7fd1ff', '#2a6fd6'], ['#ffb36b', '#c5532a'], ['#b89bff', '#5b3cc4'], ['#7fffc0', '#1f9a6a'], ['#ff9fc2', '#c03a78'], ['#ffe27a', '#c99a1c']];
// rings and angles for n planets (librating +-0.35 rad so labels never collide): the four of the mockup keep its radii
function orbitPlan(n, hours) {
  const m = Math.max(1, Math.ceil(n / 4)), plan = [];
  for (let i = 0; i < n; i++) {
    const ring = n <= 4 ? i : i % m, rad = n <= 4 ? [155, 185, 215, 245][i] : m === 1 ? 200 : 155 + ring * (105 / (m - 1));
    plan.push({ i, ring, rad, a: (hours[i] || 0) / 24 * TAU - Math.PI / 2, pr: n <= 4 ? 24 : n <= 8 ? 19 : 15 });
  }
  if (n > 4) for (let ring = 0; ring < m; ring++) {   // keep the planets of one ring clear of each other
    const l = plan.filter(p => p.ring === ring).sort((p, q) => p.a - q.a);
    l.forEach((p, k) => { if (k) p.a = Math.max(p.a, l[k - 1].a + 104 / p.rad); });
  }
  return plan;
}
const planetXY = (p, lib) => [CX + Math.cos(p.a + lib) * p.rad, CY + Math.sin(p.a + lib) * p.rad * .98];
// the label stands off the planet along its radius; its centre is the DOM row's centre
function planetLabel(p, lib) {
  const [px, py] = planetXY(p, lib), ux = Math.cos(p.a + lib), uy = Math.sin(p.a + lib), ex = (p.i === 2 ? 18 : 0) * (p.pr > 20 ? 1 : 0);
  return [px + ux * (p.pr + 10 + ex + 38 * Math.abs(ux)), py + uy * (p.pr + 10 + 12 * Math.abs(uy)) + 4];
}
SC.orbit = {
  name: 'Planet Orbit', hero: 0, light: false,
  slots(n, hours) {
    const loc = { x: CX, y: CY + 8 - 5, w: 200, h: 112 }, plan = orbitPlan(n, hours);
    return { loc, others: plan.map(p => { const [lx, ly] = planetLabel(p, 0); return { x: lx, y: ly, w: 96, h: 44, s: 1 }; }) };
  },
  bg() { x.fillStyle = rgrad(CX, CY, 20, 560, ['#1b1040', '#0a0820', '#04030c']); x.fillRect(0, 0, W, W); },
  fg(t) {
    stars(t, 120, 13, .8);
    x.fillStyle = rgrad(CX, CY, 10, 150, ['rgba(255,200,90,.55)', 'rgba(255,150,50,0)']); x.beginPath(); x.arc(CX, CY, 150, 0, TAU); x.fill();
    x.fillStyle = rgrad(CX - 20, CY - 20, 5, 95, ['#fff1b8', '#ffb52e', '#e2731c']); x.beginPath(); x.arc(CX, CY, 92, 0, TAU); x.fill();
    const lib = .35 * Math.sin(W8 * t), plan = orbitPlan(ROWS.length, ROWS.map(r => r.hour));
    plan.forEach(p => {
      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(CX, CY, p.rad, p.rad * .98, 0, 0, TAU); x.stroke();
      const [px, py] = planetXY(p, lib), cols = PCOL[p.i % PCOL.length];
      x.fillStyle = rgrad(px - p.pr / 3, py - p.pr / 3, 2, p.pr * 1.25, cols); x.beginPath(); x.arc(px, py, p.pr, 0, TAU); x.fill();
      if (p.i % 4 === 2) { x.strokeStyle = 'rgba(220,200,255,.8)'; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py, p.pr * 1.67, p.pr * .42, -.4, 0, TAU); x.stroke(); }
      const [l0x, l0y] = planetLabel(p, 0), [l1x, l1y] = planetLabel(p, lib); OX[p.i] = l1x - l0x; OY[p.i] = l1y - l0y;
    });
  },
  vars: { '--sc-brand': '#ffd36b' }
};

// 12 Rainy window
SC.rain = {
  name: 'Rainy Window', hero: 0, light: false, loc: [400, 290], lbox: [360, 190], arc: up(BOT, -10), pack: { yb: 648 },
  bg() {
    sky(['#1a2333', '#2b3550', '#3b3348']);
    const r = rnd(17); for (let i = 0; i < 60; i++) { const bx = r() * 800, by = 380 + r() * 420, s = 10 + r() * 34; x.globalAlpha = .85; x.drawImage(spriteGlow(['255,190,90', '255,120,90', '120,200,255', '255,230,160'][i % 4], .55), bx - s, by - s, s * 2, s * 2); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(200,215,235,.08)'; x.fillRect(0, 0, 800, 800);
  },
  fg(t) {
    for (let i = 0; i < 6; i++) { const bx = 80 + i * 130, by = 470 + (i * 97) % 280, s = 22 + (i % 3) * 8; x.globalAlpha = .35 + .35 * (.5 + .5 * Math.sin(W8 * 2 * t + i * 2)); x.drawImage(spriteGlow(['255,190,90', '255,120,90', '120,200,255'][i % 3], .55), bx - s, by - s, s * 2, s * 2); }   // a few lights keep pulsing
    x.globalAlpha = 1;
    // drops stick, then accelerate, leaving a trail; one or two whole trips per loop
    const gs = q => { const s = q * 4, sg = Math.floor(s), f = s - sg; return (sg + f * f * (3 - 2 * f)) / 4; };
    const dr = rnd(33);
    for (let i = 0; i < 70; i++) {
      const bx = dr() * 800, nn = 1 + (dr() > .6 ? 1 : 0), ph = dr(), s = 2 + dr() * 5, q = STILL ? ph : lp(t, ph, nn), by = gs(q) * 900 - 50, f = q * 4 - Math.floor(q * 4);
      if (!STILL && nn > 1) { x.strokeStyle = 'rgba(220,235,255,.16)'; x.lineWidth = s * .6; x.beginPath(); x.moveTo(bx, by - s - 8 - 240 * f * (1 - f)); x.lineTo(bx, by - s); x.stroke(); }
      x.fillStyle = 'rgba(220,235,255,.35)'; x.beginPath(); x.ellipse(bx, by, s * .8, s, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(bx - s * .3, by - s * .3, s * .25, 0, TAU); x.fill();
    }
  },
  vars: { '--sc-brand': '#ffcf8a' }
};

// 13 Hot air balloons: the pill is the basket's tag, the balloon floats above it
const BCOL = [['#ff6f59', '#ffe0a3'], ['#ffa63d', '#fff1d6'], ['#fff0d9', '#ff8a65'], ['#2fb5a3', '#ffe9b8'], ['#b48cff', '#fff0d9'], ['#ff8fb1', '#ffe9b8']];
SC.balloons = {
  name: 'Hot Air Balloons', hero: 1, light: true,
  slots(n) {
    const loc = locBox(400, 250);
    if (n <= 4) return { loc, others: dims(arc4(n, [[170, 552], [320, 632], [490, 592], [630, 532]])) };
    const s = n <= 8 ? .66 : .52, out = [];   // two staggered ranks, the back one higher
    for (let i = 0; i < n; i++) {
      const rank = i % 2, k = i >> 1, m = rank ? n >> 1 : Math.ceil(n / 2), step = (n <= 8 ? 440 : 520) / Math.ceil(n / 2);   // the ranks interleave
      out.push({ x: CX + (k - (m - 1) / 2) * step + (rank ? step / 4 : -step / 4), y: rank ? 622 : 560, w: PW * s, h: PH * s, s });
    }
    return { loc: locBox(400, 235), others: out };
  },
  bg() { sky(['#8fd0ff', '#ffd9b8', '#ffc39a']); x.fillStyle = '#7fb069'; x.beginPath(); x.moveTo(0, 700); x.bezierCurveTo(250, 650, 550, 720, 800, 670); x.lineTo(800, 800); x.lineTo(0, 800); x.fill(); },
  fg(t) {
    x.fillStyle = 'rgba(255,255,255,.75)'; [[150, 200], [600, 150], [420, 560]].forEach(([cx, cy], i) => { const o = (t / 8) * 900 * (i + 1) % 900; [[0, 0, 60], [45, -10, 45], [-40, 5, 40]].forEach(([dx, dy, s]) => { x.beginPath(); x.arc(((cx + dx + o) % 900) - 50, cy + dy, s, 0, TAU); x.fill(); }); });
    ROWS.forEach((r, i) => {
      const k = r.s, bob = Math.sin(W8 * t + i * 1.4) * 14 * k, sw = Math.sin(W8 * 2 * t + i) * .04, col = BCOL[i % BCOL.length]; OY[i] = bob;
      x.save(); x.translate(r.x, r.y - 112 * k + bob); x.scale(k, k); x.rotate(sw);
      shadowOn('rgba(0,0,0,.2)', 16, 8); x.beginPath(); x.moveTo(0, 40); x.bezierCurveTo(-70, 0, -70, -110, 0, -110); x.bezierCurveTo(70, -110, 70, 0, 0, 40); x.fillStyle = col[0]; x.fill(); shadowOff();
      x.fillStyle = col[1]; x.beginPath(); x.moveTo(0, 40); x.bezierCurveTo(-25, 0, -25, -110, 0, -110); x.bezierCurveTo(25, -110, 25, 0, 0, 40); x.fill();
      x.strokeStyle = '#5a3a1c'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-10, 38); x.lineTo(-16, 64); x.moveTo(10, 38); x.lineTo(16, 64); x.stroke();
      const fl = Math.sin(W8 * 16 * t + i * 2) * .5 + .5; x.fillStyle = `rgba(255,${150 + fl * 60},40,.9)`; x.beginPath(); x.ellipse(0, 50, 3.5, 6 + fl * 4, 0, 0, TAU); x.fill();
      x.fillStyle = '#9a6a35'; rr(-17, 64, 34, 20, 4); x.fill(); x.strokeStyle = '#6e4a22'; x.lineWidth = 1; x.beginPath(); x.moveTo(-17, 72); x.lineTo(17, 72); x.moveTo(-6, 64); x.lineTo(-6, 84); x.moveTo(6, 64); x.lineTo(6, 84); x.stroke(); x.restore();
    });
  },
  vars: { '--sc-brand': 'accent' }
};

// 14 Jellyfish: the time floats in the bell
const GL = {};
function glowSprite(rgb) { if (!GL[rgb]) { const c = mkCanvas(280, 280), g = c.getContext('2d'), gr = g.createRadialGradient(140, 140, 0, 140, 140, 140); gr.addColorStop(0, `rgba(${rgb},.25)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 280, 280); GL[rgb] = c; } return GL[rgb]; }
const JCOL = ['255,120,220', '120,220,255', '180,140,255', '120,255,200', '255,190,120', '160,255,140'];
SC.jelly = {
  name: 'Jellyfish', hero: 1, light: false, loc: [400, 250], quad: [[180, 372], [620, 372], [260, 592], [540, 592]], h: 48, pack: { w: PW, h: 48, yb: 640, rowGap: 46 },
  bg() { sky(['#06233f', '#041a33', '#020814']); x.globalAlpha = .08; x.fillStyle = '#bfe8ff'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(200 + i * 100, 0); x.lineTo(150 + i * 120, 800); x.lineTo(190 + i * 120, 800); x.fill(); } x.globalAlpha = 1; },
  fg(t) {
    // marine snow: the pattern repeats every 200 px and drifts one period per loop
    const r = rnd(8); x.fillStyle = 'rgba(180,230,255,.4)'; x.beginPath(); for (let i = 0; i < 10; i++) { const px = r() * 800, y0 = r() * 200, sp = 1 + (r() > .5 ? 1 : 0); for (let j = 0; j < 4; j++) { const py = (((y0 - (t / 8) * 200 * sp) % 200) + 200) % 200 + j * 200; x.moveTo(px + 1.5, py); x.arc(px, py, 1.5, 0, TAU); } } x.fill();
    ROWS.forEach((rw, i) => {
      const k = rw.s, col = JCOL[i % JCOL.length], u = lp(t, i * .17, 2), pulse = u < .25 ? Math.sin(u / .25 * Math.PI / 2) : Math.cos((u - .25) / .75 * Math.PI / 2);   // fast squeeze, slow release
      const bob = Math.sin(W8 * 2 * t + i * 1.3 - 1) * 10 * k, by = rw.y + 13 * k + bob, w = (90 - pulse * 14) * k, h = (48 + pulse * 8) * k, ph = W8 * 2 * t + i * 1.3; OY[i] = bob;
      x.drawImage(glowSprite(col), rw.x - 140 * k, by - 140 * k, 280 * k, 280 * k);
      x.strokeStyle = `rgba(${col},.55)`; x.lineWidth = 3 * k; for (let q = 0; q < 5; q++) { const tx = rw.x + (-48 + q * 24) * k; x.beginPath(); x.moveTo(tx, by + 6 * k); for (let s = 1; s <= 10; s++) x.lineTo(tx + Math.sin(s * .7 + (ph - s * .25) * 1.5 + q) * 8 * k, by + (6 + s * 10) * k); x.stroke(); }
      x.fillStyle = `rgba(${col},.45)`; x.beginPath(); x.ellipse(rw.x, by, w, h, 0, Math.PI, 0); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.stroke();
    });
  },
  vars: { '--sc-brand': '#9fe6ff' }
};

// 15 Campfire
const flick = (k, t) => .82 + .12 * Math.sin(W8 * 3 * t + k * 1.7) + .08 * Math.sin(W8 * 7 * t + k * 2.9) + .05 * Math.sin(W8 * 13 * t + k * .6);
function sitter(sx, sy, face) { x.fillStyle = '#0a0508'; x.beginPath(); x.ellipse(sx, sy, 16, 20, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(sx + face * 3, sy - 28, 9, 0, TAU); x.fill(); x.beginPath(); x.ellipse(sx + face * 14, sy + 12, 11, 6, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,150,70,.3)'; x.beginPath(); x.ellipse(sx + face * (-9), sy - 2, 3, 15, 0, 0, TAU); x.fill(); }
SC.campfire = {
  name: 'Campfire', hero: 1, light: false, loc: [400, 270], quad: [[175, 520], [625, 520], [205, 625], [595, 625]], pack: { yb: 650 },
  bg() { sky(['#070b1f', '#1a1433', '#2a1a22']); x.fillStyle = '#120c10'; x.beginPath(); x.moveTo(0, 620); x.bezierCurveTo(250, 590, 550, 640, 800, 600); x.lineTo(800, 800); x.lineTo(0, 800); x.fill(); },
  fg(t) {
    stars(t, 110, 2, .9, 520);
    const fx = CX, fy = 640, fl = flick(0, t);
    x.fillStyle = rgrad(fx, fy - 40, 10, 300 * fl, ['rgba(255,150,60,.45)', 'rgba(255,100,40,0)']); x.beginPath(); x.arc(fx, fy - 40, 300, 0, TAU); x.fill();
    sitter(fx - 112, fy + 4, 1); sitter(fx + 112, fy + 6, -1);
    x.strokeStyle = '#5a3420'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(fx - 60, fy + 20); x.lineTo(fx + 60, fy - 5); x.moveTo(fx + 60, fy + 20); x.lineTo(fx - 60, fy - 5); x.stroke();
    [-48, 48].forEach((o, k) => { x.fillStyle = rgrad(fx + o, fy + 8, 0, 42, [`rgba(255,120,40,${.55 * flick(k + 5, t)})`, 'rgba(255,90,30,0)']); x.beginPath(); x.arc(fx + o, fy + 8, 42, 0, TAU); x.fill(); });
    // five flame tongues, three nested layers each
    const TO = [-34, -17, 0, 17, 34], TH2 = [78, 112, 150, 118, 84];
    [[1, '#ff6a1f'], [.68, '#ffa22e'], [.4, '#ffe07a']].forEach(([sc, c]) => { x.fillStyle = c; TO.forEach((o, k) => { const w = 22 * sc, h = TH2[k] * sc * flick(k, t), bx = fx + o * (.5 + .5 * sc), tx = fx + o * .6 + Math.sin(W8 * 2 * t + k * 1.3) * 8 * sc, ty = fy - h; x.beginPath(); x.moveTo(bx - w, fy); x.quadraticCurveTo(bx - w * .7, fy - h * .5, tx, ty); x.quadraticCurveTo(bx + w * .7, fy - h * .5, bx + w, fy); x.fill(); }); });
    if (!STILL) { const r = rnd(5); x.fillStyle = '#ffc46b'; for (let i = 0; i < 30; i++) { const ph = r(), q = lp(t, ph, 1 + (i % 2)), sx = fx + (r() - .5) * 60 + Math.sin(q * TAU * 2 + i) * 30, sy = fy - 40 - q * 420; x.globalAlpha = 1 - q; x.beginPath(); x.arc(sx, sy, 2.2 * (1 - q) + .6, 0, TAU); x.fill(); } x.globalAlpha = 1; }
    VARS['--sc-glint'] = `rgba(255,160,80,${(.3 + .2 * fl).toFixed(2)})`;
  },
  vars: { '--sc-brand': '#ffb35c' }
};

// 16 Origami cranes
function crane(cx, cy, s, t, col, ph, al) {
  x.save(); x.globalAlpha = al; x.translate(cx, cy); x.scale(s, s); const f = STILL ? .3 : Math.sin(W8 * 5 * t + ph);
  x.fillStyle = 'rgba(60,40,20,.12)'; x.beginPath(); x.ellipse(14, 52, 38, 9, 0, 0, TAU); x.fill();   // a soft shadow on the paper ground
  x.fillStyle = col; x.beginPath(); x.moveTo(-40, 0); x.lineTo(0, -6); x.lineTo(40, -20); x.lineTo(10, 6); x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.moveTo(-40, 0); x.lineTo(10, 6); x.lineTo(0, -6); x.fill();
  x.fillStyle = col; x.beginPath(); x.moveTo(-8, -3); x.lineTo(-30, -40 * f - 6); x.lineTo(14, -4); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.moveTo(-8, -3); x.lineTo(-30, -40 * f - 6); x.lineTo(0, -3); x.fill();
  x.fillStyle = col; x.beginPath(); x.moveTo(-8, 0); x.lineTo(-20, 30 * f + 8); x.lineTo(14, 0); x.fill(); x.restore();
}
SC.cranes = {
  name: 'Origami Cranes', hero: 1, light: true, loc: [400, 340], arc: up(BOT, 30), pack: { yb: 652 },
  bg() { sky(['#f4efe6', '#e9e0cf']); x.fillStyle = acc(.08); x.beginPath(); x.arc(CX, CY - 60, 240, 0, TAU); x.fill(); },
  fg(t) {
    const cols = [TH.accent, '#2f7fbf', '#d94a7a', '#3b9a6a', '#c9973f'];
    // two lanes only: y 140 to 190 and 470 to 520; fade in and out at the rim
    for (let i = 0; i < 5; i++) { const q = lp(t, i * .2), cx = -80 + q * 960, lane = i % 2 ? 495 : 165, al = Math.min(1, Math.max(0, (cx - 30) / 120), Math.max(0, (770 - cx) / 120)); if (al <= 0) continue; crane(cx, lane + Math.sin(q * TAU + i) * 22, .9 + (i % 2) * .3, t, cols[i], i, al); }
  },
  vars: { '--sc-brand': 'accent' }
};

// 17 Lava lamp
const BLOB = (() => { let c = null; return () => { if (!c) { c = mkCanvas(256, 256); const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,200,80,.95)'); gr.addColorStop(.45, 'rgba(255,120,40,.7)'); gr.addColorStop(1, 'rgba(255,70,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } return c; }; })();
SC.lava = {
  name: 'Lava Lamp', hero: 2, light: false, loc: [400, 290], lbox: [360, 190], arc: up(BOT, -10), pack: { yb: 648 },
  bg() { sky(['#3a0b3f', '#7a1648', '#c2392f']); },
  fg(t) {
    x.save(); x.globalCompositeOperation = 'lighter'; const r = rnd(6), NN = [1, 1, 1, 2, 1, 1, 2, 1, 1], B = BLOB();
    for (let i = 0; i < 9; i++) { const ph = r(), s = 50 + r() * 70, q = lp(t, ph, NN[i]), e = .5 - .5 * Math.cos(TAU * q), by = 860 - e * 920, bx = 150 + r() * 500 + Math.sin(TAU * q + i) * 60, sz = s * (1 + .1 * Math.sin(W8 * 2 * t + i)), h = sz * (1.1 + .2 * Math.sin(W8 * t + i)); x.drawImage(B, bx - sz * 1.5, by - h * 1.5, sz * 3, h * 3); }
    x.restore();
  },
  vars: { '--sc-brand': '#ffc27a' }
};

// 18 Safari sunset: silhouettes walk in place on the scrolling ground
function giraffe(gx, gy, s, t) {
  x.save(); x.translate(gx, gy); x.scale(s, s); const st = Math.sin(W8 * 8 * t); x.fillStyle = '#1a0e10';
  [[-20, st], [-8, -st], [16, st], [28, -st]].forEach(([lx, p]) => { x.save(); x.translate(lx, 0); x.rotate(p * .15); x.fillRect(-3, 0, 6, 60); x.restore(); });
  x.beginPath(); x.ellipse(4, -4, 34, 16, 0, 0, TAU); x.fill(); x.save(); x.translate(28, -8); x.rotate(-.5 + Math.sin(W8 * 2 * t) * .05); x.fillRect(-5, -80, 10, 80); x.beginPath(); x.ellipse(8, -84, 14, 7, .3, 0, TAU); x.fill(); x.restore(); x.restore();
}
SC.safari = {
  name: 'Safari Sunset', hero: 1.3, light: false, loc: [400, 250], quad: [[150, 330], [650, 330], [205, 610], [595, 610]], pack: { yb: 652 },
  bg() { sky(['#3b1d4a', '#c2413a', '#ff9a3c', '#ffd27a']); },
  fg(t) {
    const sy = 520 + Math.sin(W8 * t) * 10; x.fillStyle = rgrad(CX, sy, 40, 260, ['rgba(255,236,150,1)', 'rgba(255,170,70,.5)', 'rgba(255,120,60,0)']); x.beginPath(); x.arc(CX, sy, 260, 0, TAU); x.fill(); x.fillStyle = '#ffe58a'; x.beginPath(); x.arc(CX, sy, 120, 0, TAU); x.fill();
    x.fillStyle = '#1a0e10'; x.fillRect(0, 600, 800, 200); x.beginPath(); x.moveTo(0, 605); x.bezierCurveTo(250, 585, 550, 615, 800, 598); x.lineTo(800, 620); x.lineTo(0, 620); x.fill();
    scrollGround(t, 602, { tree: '#1a0e10', rows: [[604, 1, '#1a0e10']] });
    elephant(440, 560, .75, t, false, '#1a0e10'); giraffe(300, 545, 1, t + 1);
    if (!STILL) { x.strokeStyle = '#2a1218'; x.lineWidth = 2.5; [[0, 0], [-24, 12], [-24, -12], [-48, 24], [-48, -24]].forEach(([ox, oy], j) => { const bx = lp(t) * 1000 - 100 + ox, by = 128 + oy * .5, f = Math.sin(W8 * 16 * t + j) * 8; x.beginPath(); x.moveTo(bx - 10, by - f); x.quadraticCurveTo(bx - 4, by - 2, bx, by); x.quadraticCurveTo(bx + 4, by - 2, bx + 10, by - f); x.stroke(); }); }
  },
  vars: { '--sc-brand': '#ffe0a0' }
};

// 19 Paper lanterns: dusk, each city is a lantern. Not a honeycomb and not a garden.
SC.lanterns = {
  name: 'Paper Lanterns', hero: 1.4, light: false, loc: [400, 280], arc: [[190, 545], [325, 640], [475, 640], [610, 545]],
  bg() { sky(['#140818', '#3a1838', '#6a2a38', '#c46a48']); },
  fg(t) {
    x.strokeStyle = 'rgba(255, 214, 170, .35)'; x.lineWidth = 1.2;
    const hang = (px, py, k, i) => {
      const bob = Math.sin(W8 * t + i) * 4;
      const cy = py - 36 * k + bob;
      x.beginPath(); x.moveTo(px, cy - 16 * k); x.lineTo(px, cy - 28 * k); x.stroke();
      x.save(); x.translate(px, cy);
      shadowOn('rgba(80,20,10,.35)', 12, 6);
      x.fillStyle = ['#e25b3a', '#f0a04a', '#d23b6a', '#efcf86'][i % 4];
      x.beginPath(); x.moveTo(0, -28 * k); x.bezierCurveTo(-26 * k, -20 * k, -24 * k, 24 * k, 0, 30 * k); x.bezierCurveTo(24 * k, 24 * k, 26 * k, -20 * k, 0, -28 * k); x.fill();
      shadowOff();
      x.fillStyle = 'rgba(255, 236, 190, .85)'; x.fillRect(-8 * k, -32 * k, 16 * k, 6 * k);
      x.strokeStyle = 'rgba(90, 30, 20, .45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -26 * k); x.lineTo(0, 24 * k); x.moveTo(-10 * k, -8 * k); x.lineTo(10 * k, -8 * k); x.stroke();
      x.restore();
    };
    // Beside the city, not over the local time or the wordmark.
    ROWS.forEach((r, i) => { const k = 0.58; hang(r.x - r.w / 2 - 20, r.y + 36 * k, k, i + 1); });
  },
  vars: { '--sc-brand': '#ffd7a8' }
};

// 20 Kite festival: a bright windy sky. Each city is the tag on a kite string.
SC.kites = {
  name: 'Kite Festival', hero: 0.8, light: true, loc: [400, 250], arc: [[180, 560], [320, 650], [480, 650], [620, 555]],
  bg() { sky(['#8ecbff', '#d7f3ff', '#fff4d2']); x.fillStyle = '#67a85a'; x.beginPath(); x.moveTo(0, 720); x.quadraticCurveTo(400, 660, 800, 730); x.lineTo(800, 800); x.lineTo(0, 800); x.fill(); },
  fg(t) {
    const kite = (px, py, k, i) => {
      const drift = Math.sin(W8 * t + i * 1.3) * 8;
      x.strokeStyle = 'rgba(40, 50, 70, .45)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(px + drift, py - 46 * k); x.lineTo(px, py - 4); x.stroke();
      x.save(); x.translate(px + drift, py - 54 * k); x.rotate(Math.sin(W8 * 2 * t + i) * 0.08);
      const col = ['#e23d3d', '#f2b134', '#3aa0e0', '#7a4cc2'][i % 4];
      x.fillStyle = col; x.beginPath(); x.moveTo(0, -34 * k); x.lineTo(26 * k, 0); x.lineTo(0, 34 * k); x.lineTo(-26 * k, 0); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, -34 * k); x.lineTo(0, 34 * k); x.moveTo(-26 * k, 0); x.lineTo(26 * k, 0); x.stroke();
      x.fillStyle = col; x.globalAlpha = .7; x.beginPath(); x.moveTo(0, 34 * k); x.lineTo(6 * k, 48 * k); x.lineTo(-4 * k, 60 * k); x.lineTo(-8 * k, 46 * k); x.closePath(); x.fill();
      x.restore(); x.globalAlpha = 1;
    };
    // A small kite in the gutter. The local time, the date and the wordmark stay clear.
    ROWS.forEach((r, i) => { const k = 0.48; kite(r.x - r.w / 2 - 16, r.y + 54 * k, k, i + 1); });
  },
  vars: { '--sc-brand': 'accent' }
};

// 21 Glasshouse: iron ribs and a clay pot under each city. Not a garden of butterflies.
SC.glasshouse = {
  name: 'Glasshouse', hero: 1.2, light: true, loc: [400, 270], arc: [[190, 545], [325, 640], [475, 640], [610, 545]],
  bg() {
    sky(['#e7f6ee', '#f7f3e4', '#cfe3d4']);
    x.strokeStyle = 'rgba(64, 88, 74, .28)'; x.lineWidth = 2.4;
    for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(400 + i * 86, 820); x.quadraticCurveTo(400 + i * 28, 260, 400 + i * 8, 30); x.stroke(); }
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(40, 560); x.quadraticCurveTo(400, 520, 760, 570); x.stroke();
  },
  fg(t) {
    const pot = (px, py, k, i) => {
      const sway = Math.sin(W8 * t + i) * 2.5;
      x.save(); x.translate(px + sway, py + 4);
      x.fillStyle = '#c56b45';
      x.beginPath(); x.moveTo(-18 * k, 6 * k); x.lineTo(18 * k, 6 * k); x.lineTo(13 * k, 20 * k); x.lineTo(-13 * k, 20 * k); x.closePath(); x.fill();
      x.fillStyle = '#6b4a32'; x.fillRect(-20 * k, 4 * k, 40 * k, 4 * k);
      const leaf = ['#21784a', '#3c9a5c', '#145c3a', '#5aaa6e'][i % 4];
      x.fillStyle = leaf;
      x.beginPath(); x.ellipse(0, -2 * k, 16 * k, 8 * k, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(-10 * k, -14 * k, 8 * k, 14 * k, -.5, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(9 * k, -16 * k, 7 * k, 13 * k, .45, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-4 * k, -18 * k, 3 * k, 2 * k, 0, 0, TAU); x.fill();
      x.restore();
    };
    // Pots sit in the gutter beside each city so the leaves never cover the time or the wordmark.
    ROWS.forEach((r, i) => pot(r.x - r.w / 2 - 26, r.y, 0.5, i + 1));
  },
  vars: { '--sc-brand': 'accent' }
};

export const SCENE_IDS = Object.keys(SC);
export const sceneInfo = id => SC[id] && { name: SC[id].name, light: SC[id].light };
export const isScene = id => !!SC[id];

// ---------- painting ----------
const theme = () => {   // the active theme's own colours, read from the page; scene skies stay as drawn
  const cs = getComputedStyle(document.documentElement), c = document.createElement('canvas').getContext('2d');
  const hex = (name, fb) => { c.fillStyle = '#000'; c.fillStyle = (cs.getPropertyValue(name) || '').trim() || fb; const v = c.fillStyle; if (v[0] === '#') return v; const m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(v); return m ? '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('') : fb; };
  const lum = h => { const [r, g, b] = hexRGB(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const accent = hex('--accent', '#e0632a'), text = hex('--text', '#3b2414'), card = hex('--card', '#f6ead2'), bg = hex('--bg', '#f6ead2');
  // the brand over a light sky needs a dark enough colour: the accent when it has the contrast, else a darkened accent
  const brandLight = lum(accent) < .3 ? accent : '#' + hexRGB(accent).map(v => Math.round(v * .45).toString(16).padStart(2, '0')).join('');
  return { accent, brandLight, ink: lum(text) < .22 ? text : '#3b2414', paper: lum(card) > .55 ? card : '#f6ead2', dark: lum(bg) < .25 };
};

function paintScene(ctx, id, t, o) {   // o: { px (canvas pixels), th, rows, loc, still }
  const d = SC[id], s = o.px / (2 * R);
  x = ctx; STILL = !!o.still; TH = o.th; ROWS = o.rows; LOC = o.loc; PACK = ROWS.length > 4; OX = o.ox || []; OY = o.oy || []; VARS = o.vars || {};
  ctx.setTransform(s, 0, 0, s, -(CX - R) * s, -(CY - R) * s);
  ctx.clearRect(0, 0, W, W); ctx.save();
  if (!o.round) { ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.clip(); }   // the live canvas is rounded by CSS: a clip on every draw is the costly way
  if (d.bg) { if (o.bgc) { const key = o.bgKey; if (o.bgc.key !== key) { const b = o.bgc.getContext('2d'); b.setTransform(s, 0, 0, s, -(CX - R) * s, -(CY - R) * s); b.clearRect(0, 0, W, W); x = b; d.bg(); x = ctx; o.bgc.key = key; } ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(o.bgc, 0, 0); ctx.restore(); } else d.bg(); }
  d.fg(t);
  x = ctx;
  ctx.fillStyle = rgrad(CX, CY, R * .7, R, ['rgba(0,0,0,0)', 'rgba(0,0,0,.28)']); ctx.fillRect(0, 0, W, W);   // sits under every row
  ctx.restore();
}

// a still picture for the layout picker: the scene as it looks with four cities, rows as plain pills (no text)
export function paintThumb(canvas, id) {
  const d = SC[id]; if (!d) return false;
  const px = canvas.width, ctx = canvas.getContext('2d'), th = theme(), sl = slotsFor(id, 4, [.9, 5.9, 14.9, 16.9]);
  const rows = sl.others.map((o, i) => ({ ...o, i, hour: [.9, 5.9, 14.9, 16.9][i] }));
  paintScene(ctx, id, d.hero || 0, { px, th, rows, loc: sl.loc, still: true });
  const s = px / (2 * R); ctx.save(); ctx.setTransform(s, 0, 0, s, -(CX - R) * s, -(CY - R) * s);
  const pill = (b, a) => { ctx.fillStyle = `rgba(${d.light ? '255,250,240' : '20,20,30'},${a})`; ctx.beginPath(); ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, Math.min(b.w, b.h) / 4); ctx.fill(); ctx.fillStyle = d.light ? 'rgba(60,35,15,.7)' : 'rgba(255,255,255,.8)'; ctx.fillRect(b.x - b.w * .3, b.y + b.h * .05, b.w * .6, b.h * .13); ctx.fillRect(b.x - b.w * .3, b.y - b.h * .25, b.w * .35, b.h * .1); };
  rows.forEach(r => pill(r, .55));
  ctx.fillStyle = d.light ? 'rgba(60,35,15,.8)' : 'rgba(255,255,255,.9)'; ctx.fillRect(sl.loc.x - 90, sl.loc.y - 22, 180, 44); ctx.restore();
  return true;
}

// ---------- the live canvas ----------
const host = { cv: null, cx: null, bgc: null, disc: null, get: null, vis: true, raf: 0, last: 0, t0: 0, id: '', px: 0, u: 1, rows: [], loc: null, key: '', set: {}, offs: [], run: false, minimized: false };

export function mountScenes(disc, getState) {
  if (host.cv) return;
  const cv = document.createElement('canvas');
  cv.className = 'scene-cv'; cv.setAttribute('aria-hidden', 'true');
  disc.insertBefore(cv, disc.firstChild);
  Object.assign(host, { cv, cx: cv.getContext('2d'), disc, get: getState, bgc: document.createElement('canvas') });
  if (typeof IntersectionObserver === 'function') new IntersectionObserver(es => { host.vis = es[es.length - 1].isIntersecting; wake(); }).observe(cv);
  document.addEventListener('visibilitychange', wake);
  // the desktop wrapper reports a minimize (WM_SIZE) in case the web view does not raise visibilitychange for it
  window.tpWindowVisible = v => { host.minimized = !v; wake(); };
  const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq && mq.addEventListener) mq.addEventListener('change', () => syncScenes());
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => syncScenes()).observe(disc);
  // Moved to a monitor with another pixel density: the canvas is drawn again at the new size (one listener at a time)
  const watchDpr = () => {
    if (!window.matchMedia) return;
    const m = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    if (m.addEventListener) m.addEventListener('change', () => { syncScenes(); watchDpr(); }, { once: true });
  };
  watchDpr();
}

// Whether the loop may run: a scene is on, Animate layout is on, motion is not reduced, the page is showing,
// the canvas is on screen and the window is not hidden or minimized. Locked is not a reason to pause.
function mayRun() {
  const st = host.state;
  return !!(st && host.id && st.animate && !st.reduced && !document.hidden && !host.minimized && host.vis);
}
function wake() {
  if (!host.cv) return;
  if (mayRun()) { if (!host.raf) { host.last = 0; host.raf = requestAnimationFrame(loop); } }
  else if (host.raf) { cancelAnimationFrame(host.raf); host.raf = 0; }
}
function loop(now) {
  host.raf = 0;
  if (!mayRun()) return;
  host.raf = requestAnimationFrame(loop);
  if (now - host.last < 1000 / FPS - 2) return;   // 30 fps cap: skip the frames in between
  host.last = now; if (!host.t0) host.t0 = now;
  draw(((now - host.t0) / 1000) % 8, false);
}

// read the rows back from the DOM, in art units, so containers drawn in the canvas sit exactly under their text
function measure() {
  const st = host.state, D = host.disc.clientWidth || 1, u = D / (2 * R), rows = [];
  let loc = null;
  const place = (r, i) => {
    const el = r.el, w = el.offsetWidth / u, h = el.offsetHeight / u;
    const dx = parseFloat(el.style.getPropertyValue('--dx')) || 0, dy = parseFloat(el.style.getPropertyValue('--dy')) || 0;
    return { x: CX - R + (el.offsetLeft + el.offsetWidth / 2 + dx) / u, y: CY - R + (el.offsetTop + el.offsetHeight / 2 + dy) / u, w, h, s: w / PW, i, hour: r.hour || 0, el };
  };
  (st.rows || []).forEach(r => { if (r.local) loc = place(r, -1); else rows.push(place(r, rows.length)); });
  if (!loc) loc = slotsFor(host.id, rows.length, rows.map(r => r.hour)).loc;
  host.rows = rows; host.loc = loc;
}

function draw(t, still) {
  const d = SC[host.id]; if (!d || !host.loc) return;
  const oy = [], ox = [], vars = {};
  const sig = host.rows.map(r => [r.x, r.y, r.w, r.h].map(Math.round).join(',')).join(';') + '|' + Math.round(host.loc.x) + ',' + Math.round(host.loc.y) + ',' + Math.round(host.loc.w) + ',' + Math.round(host.loc.h);
  paintScene(host.cx, host.id, t, { round: true, px: host.px, th: host.th, rows: host.rows, loc: host.loc, still, ox, oy, vars, bgc: host.bgc, bgKey: host.id + '|' + host.px + '|' + sig + '|' + host.th.accent + host.th.ink });
  host.reviewTime = t;
  // DOM offsets the scene wants (bobbing pills, planets), written only when they moved
  host.rows.forEach((r, i) => {
    const a = (ox[i] || 0) * host.u, b = (oy[i] || 0) * host.u, p = host.offs[i];
    if (!p || p[2] !== r.el || Math.abs(p[0] - a) > .15 || Math.abs(p[1] - b) > .15) { host.offs[i] = [a, b, r.el]; r.el.style.setProperty('--ox', a.toFixed(2) + 'px'); r.el.style.setProperty('--oy', b.toFixed(2) + 'px'); }
  });
  Object.keys(vars).forEach(k => { if (host.set[k] !== vars[k]) { host.set[k] = vars[k]; host.disc.style.setProperty(k, vars[k]); } });
}

// Everything that can change what the canvas shows funnels through here: the layout, Animate layout, reduced
// motion, a new size, a theme, new rows. It repaints once and starts or stops the loop.
export function syncScenes() {
  if (!host.cv) return;
  const st = host.get(); host.state = st;
  const id = isScene(st.id) ? st.id : '';
  const root = document.documentElement;
  root.dataset.anim = id ? '1' : '0';
  if (id !== host.id) { host.id = id; host.offs = []; host.set = {}; host.t0 = 0; host.key = ''; }
  host.cv.hidden = !id;
  if (!id) { wake(); return; }
  const D = host.disc.clientWidth; if (!D) return;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), px = Math.round(D * dpr);
  if (host.cv.width !== px) { host.cv.width = host.cv.height = px; host.bgc.width = host.bgc.height = px; host.bgc.key = ''; }
  host.px = px; host.u = D / (2 * R); host.th = theme();
  const d = SC[id], ds = host.disc.style;
  ds.setProperty('--sc-accent', host.th.accent); ds.setProperty('--sc-ink', host.th.ink); ds.setProperty('--sc-paper', host.th.paper);
  ds.setProperty('--sc-brand', d.vars && d.vars['--sc-brand'] !== 'accent' ? d.vars['--sc-brand'] : host.th.brandLight);
  delete host.set['--sc-brand'];   // draw() keeps its own copy of the variables it wrote; the one just set above must not be skipped as unchanged
  host.disc.dataset.light = d.light ? '1' : '0';
  measure();
  const live = st.animate && !st.reduced;
  draw(live && host.t0 ? ((performance.now() - host.t0) / 1000) % 8 : d.hero || 0, !live);
  wake();
}

// ---------- placing the DOM rows ----------
// rows: [{ el, hour, local }]; positions in px inside the square clock box (the disc). Returns nothing: the box fills the disc.
export function placeSceneRows(id, container, rows) {
  const D = container.clientWidth || 360, u = D / (2 * R), others = rows.filter(r => !r.local), sl = slotsFor(id, others.length, others.map(r => r.hour));
  container.style.setProperty('--k', u.toFixed(4) + 'px');
  // Below this disc the scenic slots are too small for a readable time. Cities become a clear
  // column over the same art. At the default width and above, they keep their places in the scene.
  // Lanterns, kites and the glasshouse always use that column: their type grows with the disc,
  // and a scenic pill at the default width was too small to match the classic rows.
  const roomy = id === 'lanterns' || id === 'kites' || id === 'glasshouse';
  const scenic = roomy ? false : D >= 400;
  if (!scenic) {
    const n = others.length;
    let gap = 4;
    const k = D / 744;
    let lw, lh, localTop, top, rh, rw;
    if (roomy) {
      const timePx = Math.min(30, Math.max(15, k * 48));
      const localTime = Math.min(52, Math.max(26, k * 72));
      lh = localTime + 32;
      localTop = D * 0.09 + 36;
      lw = Math.min(D * 0.66, 360);
      rw = D * 0.72;
      gap = D < 340 ? 2 : 4;
      top = localTop + lh + 2;
      // The last row has to stay inside the circle. 0.80 of the disc is inside a pill this wide.
      const room = Math.max(0, D * 0.80 - top);
      const share = n ? (room - gap * (n - 1)) / n : 0;
      rh = n ? Math.min(Math.max(timePx + 4, share), D * 0.12) : 0;
      if (n && top + n * rh + gap * (n - 1) > D * 0.80) rh = Math.max(timePx + 2, share);
    } else {
      lw = Math.min(D * 0.70, 260); lh = Math.min(64, Math.max(52, D * 0.20));
      localTop = D * 0.20;
      top = D * 0.42;
      const avail = D * 0.78 - top;
      rh = n ? Math.max(22, Math.min(34, (avail - gap * (n - 1)) / n)) : 0;
      rw = D * 0.72;
    }
    let i = 0;
    rows.forEach(r => {
      const el = r.el;
      el.dataset.stack = '1';
      el.dataset.dn = r.hour > 6 && r.hour < 18 ? 'day' : 'night';
      el.style.setProperty('--rs', '1');
      if (r.local) {
        el.style.width = lw.toFixed(1) + 'px'; el.style.height = lh.toFixed(1) + 'px';
        el.style.left = ((D - lw) / 2).toFixed(1) + 'px'; el.style.top = localTop.toFixed(1) + 'px';
      } else {
        el.dataset.i = i;
        el.style.width = rw.toFixed(1) + 'px'; el.style.height = rh.toFixed(1) + 'px';
        el.style.left = ((D - rw) / 2).toFixed(1) + 'px';
        el.style.top = (top + i * (rh + gap)).toFixed(1) + 'px';
        i++;
      }
    });
    return;
  }
  const set = (r, b) => {
    const el = r.el;
    el.removeAttribute('data-stack');
    el.style.width = (b.w * u).toFixed(1) + 'px'; el.style.height = (b.h * u).toFixed(1) + 'px';
    el.style.left = ((b.x - b.w / 2 - (CX - R)) * u).toFixed(1) + 'px'; el.style.top = ((b.y - b.h / 2 - (CY - R)) * u).toFixed(1) + 'px';
    el.style.setProperty('--rs', (b.s || 1).toFixed(3));
    el.dataset.dn = r.hour > 6 && r.hour < 18 ? 'day' : 'night';
  };
  let k = 0;
  rows.forEach(r => { if (r.local) set(r, { ...sl.loc, s: 1 }); else { r.el.dataset.i = k; set(r, sl.others[k++]); } });
}

// demo geometry for tests and the perf script: the scene's rows for n cities, no DOM
export function demoRows(id, n) {
  const hours = Array.from({ length: n }, (_, i) => [.9, 5.9, 14.9, 16.9, 9, 20, 3, 12, 22, 7, 17, 1][i % 12]), sl = slotsFor(id, n, hours);
  return { rows: sl.others.map((o, i) => ({ ...o, i, hour: hours[i] })), loc: sl.loc };
}
// paints one frame of a scene onto any 2D canvas (the perf script, the thumbnails)
export function paintFrame(canvas, id, t, o = {}) {
  const { rows, loc } = demoRows(id, o.n || 4);
  paintScene(canvas.getContext('2d'), id, t, { round: !!o.round, px: canvas.width, th: o.th || theme(), rows, loc, still: !!o.still, ox: [], oy: [], vars: {}, bgc: o.bgc, bgKey: id + canvas.width });
}

// Landing-page only: repaint the same frame into a magnified crop. Not used by the app.
export function reviewDetail(canvas, roi) {
  if (!host.loc || !host.id || !SC[host.id] || !roi || !roi.width) return;
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / roi.width;
  const proxy = new Proxy(ctx, {
    get(target, key) {
      if (key === 'setTransform') return (a, b, c, d, e, f) => target.setTransform(a, b, c, d, e - roi.x * scale, f - roi.y * scale);
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const live = host.state && host.state.animate && !host.state.reduced;
  const t = host.reviewTime != null ? host.reviewTime : (SC[host.id].hero || 0);
  paintScene(proxy, host.id, t, { px: host.disc.clientWidth * scale, round: false, th: host.th, rows: host.rows, loc: host.loc, still: !live });
  return t;
}
