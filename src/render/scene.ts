import { darken, rgba } from '../lib/color';
import { rng } from '../lib/geometry';
import type { Postcard, Project } from '../types';
import { cherry, heartPath, satinBow } from './assets';
import { boxHeight, renderBox } from './box';
import { Layout, cakeHeight, renderCake, standDepth } from './cake';
import { makePattern } from './patterns';

type Ctx = CanvasRenderingContext2D;

export const BACKGROUNDS: { id: Postcard['background']; label: string; wall: string; wall2: string }[] = [
  { id: 'parlor', label: 'Pink Parlor', wall: '#f6c9d3', wall2: '#f9dbe2' },
  { id: 'gingham', label: 'Cherry Picnic', wall: '#fbf3e4', wall2: '#f6e7d4' },
  { id: 'tea', label: 'Lavender Tea', wall: '#ddd0f0', wall2: '#e8def6' },
  { id: 'sunshine', label: 'Butter Sunshine', wall: '#fbe7a1', wall2: '#fdf0c4' },
];

export function drawBackground(ctx: Ctx, W: number, H: number, bgId: Postcard['background'], tableY = H * 0.58) {
  const bg = BACKGROUNDS.find((b) => b.id === bgId) || BACKGROUNDS[0];
  ctx.fillStyle = bg.wall; ctx.fillRect(0, 0, W, H);
  // wallpaper
  if (bgId === 'parlor' || bgId === 'sunshine') {
    const sw = W / 18;
    for (let i = 0; i < 18; i += 2) { ctx.fillStyle = bg.wall2; ctx.fillRect(i * sw, 0, sw, tableY); }
    ctx.fillStyle = rgba('#ffffff', 0.5);
    for (let i = 0; i < 18; i += 2) for (let y = sw; y < tableY; y += sw * 2) { ctx.beginPath(); ctx.arc(i * sw + sw / 2, y, sw * 0.08, 0, Math.PI * 2); ctx.fill(); }
  } else if (bgId === 'tea') {
    ctx.fillStyle = makePattern(ctx, { type: 'floral', bg: bg.wall, c1: '#f2b8c8', c2: '#a9c2a2', scale: 1.3 * (W / 1080), rotation: 0, weight: 0.5 }, new DOMMatrix());
    ctx.fillRect(0, 0, W, tableY);
  } else {
    ctx.fillStyle = makePattern(ctx, { type: 'vstripes', bg: bg.wall, c1: '#f3dcc2', c2: '#f3dcc2', scale: 1.6 * (W / 1080), rotation: 0, weight: 0.5 }, new DOMMatrix());
    ctx.fillRect(0, 0, W, tableY);
  }
  // window light
  const g = ctx.createRadialGradient(W * 0.2, H * 0.08, 0, W * 0.2, H * 0.08, W * 0.9);
  g.addColorStop(0, 'rgba(255,255,240,0.55)'); g.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, tableY);
  // chair rail
  ctx.fillStyle = '#fffaf2'; ctx.fillRect(0, tableY - H * 0.05, W, H * 0.012);
  ctx.fillStyle = rgba(darken(bg.wall, 0.3), 0.3); ctx.fillRect(0, tableY - H * 0.038, W, 2);
  // table
  const cloth = bgId === 'gingham' ? { type: 'gingham' as const, bg: '#ffffff', c1: '#c8203a', c2: '#c8203a' }
    : bgId === 'tea' ? { type: 'solid' as const, bg: '#fbf6ee', c1: '#fff', c2: '#fff' }
    : bgId === 'sunshine' ? { type: 'gingham' as const, bg: '#ffffff', c1: '#8fcfae', c2: '#8fcfae' }
    : { type: 'gingham' as const, bg: '#ffffff', c1: '#f08aa6', c2: '#f08aa6' };
  ctx.save();
  ctx.fillStyle = makePattern(ctx, { ...cloth, scale: 1.8 * (W / 1080), rotation: 0, weight: 0.5 }, new DOMMatrix().translate(W / 2, tableY).scale(1, 0.45));
  ctx.fillRect(0, tableY, W, H - tableY);
  const tg = ctx.createLinearGradient(0, tableY, 0, H);
  tg.addColorStop(0, 'rgba(60,20,15,0.18)'); tg.addColorStop(0.15, 'rgba(60,20,15,0)'); tg.addColorStop(1, 'rgba(60,20,15,0.12)');
  ctx.fillStyle = tg; ctx.fillRect(0, tableY, W, H - tableY);
  ctx.restore();
  // lace edge for tea
  if (bgId === 'tea') {
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < W; x += W / 30) { ctx.beginPath(); ctx.arc(x, tableY, W / 60, 0, Math.PI); ctx.fill(); }
  }
}

export function sparkle(ctx: Ctx, x: number, y: number, r: number, a = 1, col = '#ffffff') {
  if (r <= 0 || a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
  g.addColorStop(0, rgba('#fff8d0', 0.8)); g.addColorStop(1, 'rgba(255,248,208,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
  ctx.restore();
}

export function drawPostcard(ctx: Ctx, cx: number, cy: number, w: number, rot: number, pc: Postcard) {
  const h = w * 0.66;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(60,20,15,0.3)'; ctx.shadowBlur = w * 0.05; ctx.shadowOffsetY = w * 0.02;
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  // scalloped lace border
  ctx.fillStyle = '#fffaf0';
  const r = w * 0.018;
  for (let x = -w / 2; x <= w / 2; x += r * 2) { ctx.beginPath(); ctx.arc(x, -h / 2, r, Math.PI, 0); ctx.arc(x, h / 2, r, 0, Math.PI); ctx.fill(); }
  ctx.strokeStyle = '#c8203a'; ctx.lineWidth = w * 0.004; ctx.strokeRect(-w / 2 + w * 0.025, -h / 2 + w * 0.025, w - w * 0.05, h - w * 0.05);
  ctx.setLineDash([w * 0.01, w * 0.01]); ctx.strokeRect(-w / 2 + w * 0.035, -h / 2 + w * 0.035, w - w * 0.07, h - w * 0.07); ctx.setLineDash([]);
  // divider
  ctx.strokeStyle = 'rgba(122,31,43,0.35)'; ctx.beginPath(); ctx.moveTo(w * 0.08, -h * 0.32); ctx.lineTo(w * 0.08, h * 0.38); ctx.stroke();
  // stamp
  ctx.save(); ctx.translate(w * 0.36, -h * 0.24);
  ctx.fillStyle = '#f6c9d3'; ctx.fillRect(-w * 0.06, -w * 0.075, w * 0.12, w * 0.15);
  ctx.strokeStyle = '#fff'; ctx.setLineDash([2, 2]); ctx.strokeRect(-w * 0.055, -w * 0.07, w * 0.11, w * 0.14); ctx.setLineDash([]);
  cherry(ctx, w * 0.09);
  ctx.restore();
  ctx.strokeStyle = 'rgba(122,31,43,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(w * 0.24, -h * 0.2, w * 0.06, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(w * 0.28, -h * 0.25 + i * 8); ctx.bezierCurveTo(w * 0.32, -h * 0.27 + i * 8, w * 0.36, -h * 0.23 + i * 8, w * 0.42, -h * 0.25 + i * 8); ctx.stroke(); }
  ctx.fillStyle = 'rgba(122,31,43,0.6)'; ctx.font = `${w * 0.022}px Fredoka, sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('KKUMI POST', w * 0.24, -h * 0.2 + w * 0.008);
  // left: logo + message
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#c8203a'; ctx.font = `${w * 0.06}px Pacifico, cursive`;
  ctx.fillText('Kkumi Cafe', -w * 0.44, -h * 0.28);
  ctx.fillStyle = '#7a1f2b'; ctx.font = `italic ${w * 0.024}px "Playfair Display", serif`;
  ctx.fillText('Every Cake Tells a Story.', -w * 0.44, -h * 0.19);
  ctx.fillStyle = '#5a3426'; ctx.font = `${w * 0.05}px Caveat, cursive`;
  const words = (pc.message || '').split(/\s+/);
  const lines: string[] = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w * 0.48) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur);
  lines.slice(0, 5).forEach((ln, i) => ctx.fillText(ln, -w * 0.44, -h * 0.05 + i * w * 0.055));
  // right: to/from
  ctx.font = `${w * 0.026}px Fredoka, sans-serif`; ctx.fillStyle = 'rgba(122,31,43,0.7)';
  ctx.fillText('TO', w * 0.11, h * 0.05); ctx.fillText('FROM', w * 0.11, h * 0.24);
  ctx.strokeStyle = 'rgba(122,31,43,0.3)';
  [h * 0.1, h * 0.29].forEach((y) => { ctx.beginPath(); ctx.moveTo(w * 0.11, y + 4); ctx.lineTo(w * 0.45, y + 4); ctx.stroke(); });
  ctx.fillStyle = '#c8203a'; ctx.font = `${w * 0.048}px Caveat, cursive`;
  ctx.fillText(pc.to || '', w * 0.12, h * 0.1); ctx.fillText(pc.from || '', w * 0.12, h * 0.29);
  ctx.save(); ctx.translate(-w * 0.3, h * 0.36); ctx.scale(0.6, 0.6); satinBow(ctx, w * 0.12, '#f4a7b9'); ctx.restore();
  ctx.restore();
}

export function placeCake(p: Project, cx: number, baseY: number, k: number, tilt = 0.5): Layout {
  const sideF = Math.sqrt(1 - tilt * tilt);
  return { cx, cy: baseY - (cakeHeight(p.cake.layers) + standDepth(p.cake.stand)) * k * sideF, k, tilt, sideF };
}
export function placeBox(p: Project, cx: number, baseY: number, k: number, tilt = 0.5): Layout {
  const sideF = Math.sqrt(1 - tilt * tilt);
  return { cx, cy: baseY - boxHeight(p.cake) * k * sideF, k, tilt, sideF };
}

function sparkles(ctx: Ctx, cx: number, cy: number, R: number, t: number, seed = 1, n = 14) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = R * (0.6 + r() * 0.6);
    const ph = r() * Math.PI * 2;
    const s = (0.4 + 0.6 * Math.abs(Math.sin(t * 6 + ph))) * R * (0.05 + r() * 0.05);
    sparkle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, s, 0.9, r() > 0.6 ? '#fff3b0' : '#ffffff');
  }
}

export type Composition = 'full' | 'cakeBox' | 'cakePostcard' | 'cakeOnly';

export function compose(ctx: Ctx, W: number, H: number, p: Project, kind: Composition, t = 0) {
  const sf = W / 1080;
  if (kind === 'cakeOnly') {
    ctx.clearRect(0, 0, W, H);
    const L = placeCake(p, W / 2, H * 0.82, 1.55 * sf * (H / W > 1.1 ? 1 : 0.9));
    renderCake(ctx, p.cake, L, { t });
    return;
  }
  drawBackground(ctx, W, H, p.postcard.background, kind === 'full' ? H * 0.4 : H * 0.56);
  if (kind === 'full') {
    const BL = placeBox(p, W * 0.29, H * 0.6, (p.box.shape === 'heart' || p.box.shape === 'rect' ? 0.74 : 0.86) * sf);
    renderBox(ctx, p.box, p.cake, BL, { lid: { dx: -W * 0.06, dy: -H * 0.075, scale: 0.97, alpha: 1, behind: true }, t, showCake: false });
    const CL = placeCake(p, W * 0.63, H * 0.875, 1.25 * sf);
    renderCake(ctx, p.cake, CL, { t });
    sparkles(ctx, CL.cx, CL.cy - 40 * sf, 360 * sf, t, 3, 10);
    drawPostcard(ctx, W * 0.27, H * 0.87, W * 0.44, -0.08, p.postcard);
  } else if (kind === 'cakeBox') {
    const BL = placeBox(p, W / 2, H * 0.85, 1.25 * sf);
    renderBox(ctx, p.box, p.cake, BL, { lid: { dx: W * 0.1, dy: -H * 0.32, scale: 0.95, alpha: 1, behind: true }, t });
    sparkles(ctx, W / 2, H * 0.45, 420 * sf, t, 5, 12);
  } else {
    const CL = placeCake(p, W / 2, H * 0.68, 1.35 * sf);
    renderCake(ctx, p.cake, CL, { t });
    sparkles(ctx, CL.cx, CL.cy, 360 * sf, t, 7, 10);
    drawPostcard(ctx, W * 0.5, H * 0.83, W * 0.62, 0.03, p.postcard);
  }
  // cake name plate (only when the player has named the cake)
  const title = (p.name || '').trim();
  if (title) {
    ctx.save();
    ctx.font = `${46 * sf}px Pacifico, cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.min(W * 0.8, ctx.measureText(title).width + 90 * sf);
    ctx.fillStyle = 'rgba(255,250,240,0.88)';
    ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, H * 0.06, tw, H * 0.08, H * 0.04); ctx.fill();
    ctx.fillStyle = '#c8203a';
    ctx.fillText(title, W / 2, H * 0.1, W * 0.76);
    ctx.restore();
  }
}

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const backOut = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; x = Math.max(0, Math.min(1, x)); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** One frame of the box-opening reveal animation. t ∈ [0,1]. */
export function animFrame(ctx: Ctx, W: number, H: number, p: Project, t: number, o: { background?: boolean; cx?: number; baseY?: number; scale?: number } = {}) {
  const sf = (W / 1080) * (o.scale ?? 1);
  if (o.background !== false) drawBackground(ctx, W, H, p.postcard.background, H * 0.6);
  else ctx.clearRect(0, 0, W, H);
  const cx = o.cx ?? W / 2, baseY = o.baseY ?? H * 0.9;
  const BL = placeBox(p, cx, baseY, 1.5 * sf);
  // camera zoom toward the cake at the end
  const z = 1 + 0.3 * ease(seg(t, 0.7, 0.95));
  const rise = backOut(seg(t, 0.33, 0.62)) * (boxHeight(p.cake) * BL.k * BL.sideF * 1.05);
  const focusY = BL.cy - rise + 40 * sf;
  ctx.save();
  ctx.translate(cx, focusY); ctx.scale(z, z); ctx.translate(-cx, -focusY);
  // wiggle while closed
  const wig = t < 0.16 ? Math.sin(t * 90) * 0.012 * (1 - t / 0.16) : 0;
  ctx.translate(cx, baseY); ctx.rotate(wig); ctx.translate(-cx, -baseY);
  const u = seg(t, 0.14, 0.42);
  const lid = t < 0.14 ? null : { dx: ease(u) * W * 0.32, dy: -ease(u) * H * 0.6, scale: 1, alpha: 1 - seg(u, 0.55, 1), behind: false };
  renderBox(ctx, p.box, p.cake, BL, { lid, cakeRise: rise, t: t * 4 });
  ctx.restore();
  if (t > 0.5) {
    const a = seg(t, 0.5, 0.6);
    const r = rng(11);
    for (let i = 0; i < 18; i++) {
      const ang = r() * Math.PI * 2, d = (0.3 + r() * 0.7) * 380 * sf * (0.5 + 0.5 * a);
      const s = (10 + r() * 16) * sf * Math.abs(Math.sin(t * 12 + i));
      sparkle(ctx, cx + Math.cos(ang) * d, focusY - 60 * sf + Math.sin(ang) * d * 0.7, s, a, i % 3 ? '#ffffff' : '#fff3b0');
    }
    // floating hearts
    const hr = rng(21);
    for (let i = 0; i < 8; i++) {
      const x = cx + (hr() - 0.5) * W * 0.8, sp = 0.4 + hr() * 0.6;
      const y = H * 0.9 - seg(t, 0.5, 1) * H * 0.9 * sp - hr() * 100 * sf;
      ctx.save(); ctx.globalAlpha = a * 0.85; ctx.translate(x, y); ctx.rotate((hr() - 0.5) * 0.6);
      ctx.fillStyle = ['#e33b57', '#f4a7b9', '#ffffff'][i % 3]; ctx.fill(heartPath((22 + hr() * 18) * sf)); ctx.restore();
    }
  }
  if (t > 0.78 && o.background !== false) {
    const a = seg(t, 0.78, 0.9);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,250,240,0.9)';
    ctx.beginPath(); ctx.roundRect(W * 0.12, H * 0.83, W * 0.76, H * 0.12, H * 0.05); ctx.fill();
    ctx.strokeStyle = '#c8203a'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W * 0.135, H * 0.84, W * 0.73, H * 0.1, H * 0.045); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c8203a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${48 * (W / 1080)}px Pacifico, cursive`;
    ctx.fillText(p.postcard.to ? `For ${p.postcard.to}` : 'Every Cake Tells a Story', W / 2, H * 0.875, W * 0.7);
    ctx.fillStyle = '#7a1f2b'; ctx.font = `${34 * (W / 1080)}px Caveat, cursive`;
    ctx.fillText(p.postcard.message || '', W / 2, H * 0.915, W * 0.7);
    ctx.restore();
  }
}

