// The refined watch (concept A): a brushed metal case with a bevel, metal pushers at the rim
// angles with their names engraved on the ring, the Lock as a knurled crown at 3 o'clock, and a
// sunray dial with a minute track. Drawn in one SVG from the theme's own colors, in units of the
// approved mockup: the case outer edge is 262 from the center, so the disc (the dial and ring) is
// 524 wide and the SVG, 640 wide, overhangs it by 58 on every side for the pushers.
export const CASE = { C: 320, RO: 262, RI: 238, RD: 234, SW: 1.5 };
export const PUSHERS = [
  ['openQuiz', 'train', 'Train', 'T', -58], ['openPlan', 'plan', 'Plan', 'P', -28], ['lockBtn', 'lock', 'Lock', 'L', 0],
  ['openNotes', 'notes', 'Notes', 'N', 28], ['openSettings', 'settings', 'Settings', 'S', 58],
  ['topBtn', 'front', 'In front', '', 94], ['widgetQuit', 'quit', 'Quit', '', -90],
];
const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)); const r = /rgba?\(([^)]+)\)/.exec(c || ''); return r ? r[1].split(',').slice(0, 3).map(Number) : [128, 128, 128]; };
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lum = c => { const [r, g, b] = hex(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const rad = d => d * Math.PI / 180;
const { C, RO, RI, RD, SW } = CASE;
const pt = (a, r) => [+(C + r * Math.cos(rad(a))).toFixed(2), +(C + r * Math.sin(rad(a))).toFixed(2)];
const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
const arcCcw = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0} ${y0}A${r} ${r} 0 ${a0 - a1 > 180 ? 1 : 0} 0 ${x1} ${y1}`; };

export function casePalette(cs) {
  const v = n => cs.getPropertyValue(n).trim();
  const bg = v('--bg') || '#f4e9d3', text = v('--text') || '#3b2a20', acc = v('--accent') || '#d9622b';
  const dark = lum(bg) < 0.45;
  // Light themes get a warm brass from their accent and secondary, dark themes a steel lifted toward the ink.
  const gold = mix(acc, v('--secondary') || acc, 0.5);
  const m = dark ? [0.55, 0.35, 0.17, 0.07].map(t => mix(bg, text, t))
    : [mix(bg, '#ffffff', 0.4), mix(bg, gold, 0.2), mix(bg, gold, 0.62), mix(gold, text, 0.4)];
  return { m0: m[0], m1: m[1], m2: m[2], m3: m[3], bg, bg2: mix(bg, text, dark ? 0.05 : 0.035), text, dark };
}

export function caseSvg(T, ruby) {
  let d = `<defs>
<linearGradient id="wcBrush" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.m0}"/><stop offset=".28" stop-color="${T.m1}"/><stop offset=".5" stop-color="${T.m2}"/><stop offset=".72" stop-color="${T.m1}"/><stop offset="1" stop-color="${T.m3}"/></linearGradient>
<linearGradient id="wcPush" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.m0}"/><stop offset=".5" stop-color="${T.m1}"/><stop offset="1" stop-color="${T.m3}"/></linearGradient>
<radialGradient id="wcDial" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${T.bg}"/><stop offset="1" stop-color="${T.bg2}"/></radialGradient>
<radialGradient id="wcRub" cx="35%" cy="30%"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".5" stop-color="#c0182c"/><stop offset="1" stop-color="#5e0612"/></radialGradient>
</defs>`;
  let push = '', crown = '', labs = '';
  PUSHERS.forEach(([btn, id, name, key, a]) => {
    const big = id === 'lock', L = big ? 24 : 15, W = big ? 34 : 20, [x, y] = pt(a, RO - 2);
    let g = `<g class="wc-n" id="wc-${id}" data-btn="${btn}" style="--dx:${(-Math.cos(rad(a)) * 4).toFixed(2)}px;--dy:${(-Math.sin(rad(a)) * 4).toFixed(2)}px"><g transform="translate(${x} ${y}) rotate(${a})">`;
    g += `<rect x="-2" y="${-W / 2 + 4}" width="6" height="${W - 8}" fill="${T.m3}"/>`;
    g += `<rect x="3" y="${-W / 2}" width="${L}" height="${W}" rx="${big ? 5 : 4}" fill="url(#wcPush)" stroke="${T.text}" stroke-width="${SW}"/>`;
    if (big) for (let i = 0; i < 6; i++) g += `<line x1="${7 + i * 3.2}" y1="${-W / 2 + 3}" x2="${7 + i * 3.2}" y2="${W / 2 - 3}" stroke="${T.text}" stroke-opacity=".3" stroke-width="1"/>`;
    g += `<rect x="${3 + L - 4}" y="${-W / 2 + 3}" width="2" height="${W - 6}" rx="1" fill="${T.text}" opacity=".35"/>`;
    if (big) g += `<g class="wc-ruby${ruby ? ' opt' : ''}"><circle cx="15" cy="0" r="7" fill="url(#wcRub)" stroke="${T.text}" stroke-width="1"/><circle cx="13" cy="-2.2" r="2" fill="#fff" opacity=".8"/></g>`;
    g += '</g></g>';
    if (big) crown = g; else push += g;
    // Each name runs along the ring on its own arc, centered exactly on its pusher's angle
    // (startOffset 50% with a middle anchor), large and solid so it reads at a glance.
    const RL = (RO + RI) / 2, flip = a > 0 && a < 180, FS = 16, half = 52;
    const r = flip ? RL + FS * 0.36 : RL - FS * 0.36;
    const pth = flip ? arcCcw(a + half, a - half, r) : arc(a - half, a + half, r);
    const txt = name.toUpperCase() + (key ? ' \u00b7 ' + key : '');
    labs += `<path id="wcl-${id}" d="${pth}" fill="none"/><text class="wc-lab" data-for="${id}" text-anchor="middle" font-weight="800" font-size="${FS}" letter-spacing="0.35" fill="${T.text}" stroke="${T.dark ? T.bg : T.m0}" xml:space="preserve"><textPath href="#wcl-${id}" startOffset="50%">${txt}</textPath></text>`;
  });
  let ring = `<circle cx="${C}" cy="${C}" r="${RO}" fill="url(#wcBrush)" stroke="${T.text}" stroke-width="${SW}"/>`;
  for (let i = 0; i < 90; i++) { const a = i * 4; ring += `<path d="${arc(a, a + 2, (RO + RI) / 2)}" stroke="#fff" stroke-opacity="${(0.04 + 0.05 * Math.abs(Math.sin(rad(a * 2)))).toFixed(3)}" stroke-width="${RO - RI - 6}" fill="none"/>`; }
  ring += `<path d="${arc(196, 300, RO - 2.5)}" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  ring += `<path d="${arc(16, 120, RO - 2.5)}" stroke="${T.text}" stroke-opacity=".22" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  ring += `<circle cx="${C}" cy="${C}" r="${RI}" fill="none" stroke="${T.text}" stroke-width="${SW}"/><circle cx="${C}" cy="${C}" r="${RI + 2}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`;
  let dial = `<circle cx="${C}" cy="${C}" r="${RD}" fill="url(#wcDial)"/>`;
  for (let i = 0; i < 120; i++) { const a = i * 3, [x0, y0] = pt(a, 40), [x1, y1] = pt(a, RD); dial += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${T.text}" stroke-opacity=".018" stroke-width="1"/>`; }
  dial += `<circle cx="${C}" cy="${C}" r="${RD - 6}" fill="none" stroke="${T.text}" stroke-opacity=".28" stroke-width="1"/>`;
  for (let i = 0; i < 60; i++) { const a = i * 6, h = i % 5 === 0, [x0, y0] = pt(a, RD - 6), [x1, y1] = pt(a, RD - (h ? 16 : 10)); dial += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${T.text}" stroke-opacity="${h ? 0.6 : 0.4}" stroke-width="${h ? SW : 1}" stroke-linecap="round"/>`; }
  // The case body fades on Lock; the crown and the In front and Notes pushers stay, faint.
  const keepRe = /<g class="wc-n" id="wc-(notes|front)"[\s\S]*?<\/g><\/g>/g;
  return d + `<g class="wc-keep">${(push.match(keepRe) || []).join('')}</g>`
    + `<g class="wc-body">${push.replace(keepRe, '')}${ring}<g class="wc-labs">${labs}</g>${dial}</g>`
    + `<g class="wc-keep">${crown}</g>`;
}
