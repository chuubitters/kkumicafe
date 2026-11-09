import { darken, lighten, mix, rgba } from '../lib/color';
import { outline, pathFrom, rng } from '../lib/geometry';
import type { Item, ItemKind } from '../types';
import { creamDab } from './cream';
import { getImage } from '../lib/images';

type Ctx = CanvasRenderingContext2D;

export interface AssetMeta {
  label: string;
  base: number; // size in plane units at scale 1
  flat: boolean; // lies on the surface (squashed by perspective)
  w: number; h: number; // selection box multipliers of size
  color?: string;
  color2?: string;
}

export const ASSETS: Record<Exclude<ItemKind, 'piping'>, AssetMeta> = {
  strawberry: { label: 'Strawberry', base: 40, flat: false, w: 0.8, h: 1.05 },
  cherry: { label: 'Cherry', base: 40, flat: false, w: 0.7, h: 1.05 },
  blueberry: { label: 'Blueberry', base: 18, flat: false, w: 1, h: 1 },
  raspberry: { label: 'Raspberry', base: 24, flat: false, w: 1, h: 1 },
  peach: { label: 'Peach Slice', base: 44, flat: true, w: 1.05, h: 0.75 },
  kiwi: { label: 'Kiwi Slice', base: 40, flat: true, w: 1.05, h: 1.05 },
  sprinkles: { label: 'Sprinkles', base: 110, flat: false, w: 1, h: 1 },
  rose: { label: 'Buttercream Rose', base: 46, flat: false, w: 1, h: 0.9, color: '#f4a7b9' },
  daisy: { label: 'Daisy', base: 40, flat: true, w: 1, h: 1, color: '#ffffff' },
  blossom: { label: 'Cherry Blossom', base: 34, flat: true, w: 1, h: 1, color: '#f9c6d3' },
  heart: { label: 'Fondant Heart', base: 36, flat: false, w: 1, h: 0.95, color: '#e33b57' },
  star: { label: 'Gold Star', base: 36, flat: false, w: 1, h: 1, color: '#e9b729' },
  bow: { label: 'Satin Bow', base: 60, flat: false, w: 1.05, h: 0.85, color: '#f3a6bd' },
  ribbon: { label: 'Ribbon Curl', base: 80, flat: true, w: 1.05, h: 0.5, color: '#e05a7a' },
  candle: { label: 'Candle', base: 80, flat: false, w: 0.35, h: 1.2, color: '#f07fa0' },
  numberCandle: { label: 'Number Candle', base: 70, flat: false, w: 0.7, h: 1.25, color: '#f4a7b9' },
  bear: { label: 'Teddy Figure', base: 64, flat: false, w: 0.9, h: 1.05 },
  bunny: { label: 'Bunny Figure', base: 64, flat: false, w: 0.8, h: 1.15 },
  topperBirthday: { label: 'Birthday Topper', base: 170, flat: false, w: 1.05, h: 0.75, color: '#d9a62c' },
  topperHeart: { label: 'Heart Topper', base: 70, flat: false, w: 0.9, h: 1.3, color: '#d9a62c' },
  bunting: { label: 'Bunting', base: 170, flat: false, w: 1.05, h: 0.75 },
  chocShard: { label: 'Chocolate Shard', base: 54, flat: false, w: 0.8, h: 1.05 },
  truffle: { label: 'Truffle', base: 30, flat: false, w: 1, h: 1 },
  chocCurl: { label: 'Chocolate Curl', base: 46, flat: false, w: 1, h: 0.5 },
  macaron: { label: 'Macaron', base: 42, flat: false, w: 1, h: 0.85, color: '#f7b6c8' },
  label: { label: 'Bakery Label', base: 150, flat: true, w: 1.05, h: 0.65, color: '#7a1f2b' },
  stamp: { label: 'Postage Stamp', base: 80, flat: true, w: 0.85, h: 1.05, color: '#c8203a' },
  stickerCherry: { label: 'Cherry Sticker', base: 60, flat: true, w: 1, h: 1 },
  stickerHeart: { label: 'Heart Sticker', base: 56, flat: true, w: 1, h: 1, color: '#e33b57' },
  stickerStar: { label: 'Star Sticker', base: 56, flat: true, w: 1, h: 1, color: '#f3c34a' },
  stickerFlower: { label: 'Flower Sticker', base: 56, flat: true, w: 1, h: 1, color: '#f4a7b9' },
  tag: { label: 'Gift Tag', base: 90, flat: true, w: 0.7, h: 1.05, color: '#f6c9d3' },
  text: { label: 'Text', base: 40, flat: true, w: 1, h: 1, color: '#c8203a' },
  photo: { label: 'Photo', base: 170, flat: true, w: 1, h: 1 },
};

function shadowEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.2) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(60,20,15,${a})`); g.addColorStop(1, 'rgba(60,20,15,0)');
  ctx.save(); ctx.fillStyle = g; ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, a = 0.75) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function heartPath(s: number) {
  const p = new Path2D();
  p.moveTo(0, s * 0.42);
  p.bezierCurveTo(-s * 0.62, s * 0.02, -s * 0.55, -s * 0.48, -s * 0.24, -s * 0.44);
  p.bezierCurveTo(-s * 0.08, -s * 0.42, 0, -s * 0.3, 0, -s * 0.22);
  p.bezierCurveTo(0, -s * 0.3, s * 0.08, -s * 0.42, s * 0.24, -s * 0.44);
  p.bezierCurveTo(s * 0.55, -s * 0.48, s * 0.62, s * 0.02, 0, s * 0.42);
  return p;
}

export function starPath(ro: number, ri: number, n = 5) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : ro;
    if (i) p.lineTo(Math.cos(a) * r, Math.sin(a) * r); else p.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  p.closePath();
  return p;
}

function strawberry(ctx: Ctx, s: number, seed: number) {
  shadowEllipse(ctx, s * 0.05, s * 0.42, s * 0.4, s * 0.12, 0.28);
  const body = new Path2D();
  body.moveTo(0, s * 0.5);
  body.bezierCurveTo(-s * 0.2, s * 0.45, -s * 0.44, s * 0.1, -s * 0.4, -s * 0.18);
  body.bezierCurveTo(-s * 0.36, -s * 0.38, -s * 0.12, -s * 0.36, 0, -s * 0.3);
  body.bezierCurveTo(s * 0.12, -s * 0.36, s * 0.36, -s * 0.38, s * 0.4, -s * 0.18);
  body.bezierCurveTo(s * 0.44, s * 0.1, s * 0.2, s * 0.45, 0, s * 0.5);
  const g = ctx.createRadialGradient(-s * 0.14, -s * 0.12, s * 0.02, 0, s * 0.02, s * 0.55);
  g.addColorStop(0, '#ff7b7f'); g.addColorStop(0.35, '#e8273d'); g.addColorStop(0.8, '#b3122a'); g.addColorStop(1, '#7c0a1b');
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  const R = rng(seed);
  for (let row = 0; row < 7; row++) {
    const y = -s * 0.22 + row * s * 0.1;
    const half = s * 0.4 * (1 - Math.max(0, (y - s * 0.05) / (s * 0.48)) * 0.9);
    const cnt = Math.max(1, Math.round(half / (s * 0.09)));
    for (let c = -cnt; c <= cnt; c++) {
      const x = (c + (row % 2) * 0.5) * s * 0.09 + (R() - 0.5) * s * 0.02;
      if (!ctx.isPointInPath(body, x, y)) continue;
      ctx.fillStyle = 'rgba(90,0,10,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.028, s * 0.036, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3d36b';
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.006, s * 0.012, s * 0.02, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  gloss(ctx, -s * 0.18, -s * 0.08, s * 0.12, s * 0.2, 0.3, 0.55);
  // calyx
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5;
    ctx.save(); ctx.translate(0, -s * 0.3); ctx.rotate(a + Math.PI / 2);
    const lg = ctx.createLinearGradient(0, 0, 0, -s * 0.24);
    lg.addColorStop(0, '#2f7d32'); lg.addColorStop(1, '#7cc35a');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(-s * 0.05, 0); ctx.quadraticCurveTo(-s * 0.06, -s * 0.15, 0, -s * 0.24); ctx.quadraticCurveTo(s * 0.06, -s * 0.15, s * 0.05, 0); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#3d7a2c'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.32); ctx.quadraticCurveTo(s * 0.02, -s * 0.44, s * 0.06, -s * 0.5); ctx.stroke();
}

export function cherry(ctx: Ctx, s: number) {
  shadowEllipse(ctx, s * 0.04, s * 0.42, s * 0.33, s * 0.1, 0.3);
  ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, s * 0.0); ctx.bezierCurveTo(s * 0.02, -s * 0.2, s * 0.1, -s * 0.38, s * 0.2, -s * 0.5); ctx.stroke();
  ctx.strokeStyle = '#8fa84a'; ctx.lineWidth = s * 0.018;
  ctx.beginPath(); ctx.moveTo(s * 0.01, -s * 0.02); ctx.bezierCurveTo(s * 0.03, -s * 0.2, s * 0.1, -s * 0.36, s * 0.19, -s * 0.48); ctx.stroke();
  const cy = s * 0.18, r = s * 0.3;
  const g = ctx.createRadialGradient(-r * 0.4, cy - r * 0.45, r * 0.05, 0, cy, r * 1.05);
  g.addColorStop(0, '#ff6b7c'); g.addColorStop(0.3, '#d61434'); g.addColorStop(0.75, '#8a0019'); g.addColorStop(1, '#4b000c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, cy - r * 0.78);
  ctx.bezierCurveTo(r * 0.5, cy - r * 1.05, r * 1.08, cy - r * 0.6, r * 1.0, cy + r * 0.1);
  ctx.bezierCurveTo(r * 0.92, cy + r * 0.85, r * 0.35, cy + r * 1.02, 0, cy + r * 1.0);
  ctx.bezierCurveTo(-r * 0.35, cy + r * 1.02, -r * 0.92, cy + r * 0.85, -r * 1.0, cy + r * 0.1);
  ctx.bezierCurveTo(-r * 1.08, cy - r * 0.6, -r * 0.5, cy - r * 1.05, 0, cy - r * 0.78);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,0,10,0.5)'; ctx.beginPath(); ctx.ellipse(0, cy - r * 0.72, r * 0.15, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  gloss(ctx, -r * 0.42, cy - r * 0.35, r * 0.28, r * 0.16, -0.6, 0.95);
  gloss(ctx, r * 0.55, cy + r * 0.45, r * 0.18, r * 0.08, -0.9, 0.35);
}

function blueberry(ctx: Ctx, s: number) {
  const r = s * 0.46;
  shadowEllipse(ctx, s * 0.05, r * 0.85, r, r * 0.3, 0.3);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#8d9bd0'); g.addColorStop(0.4, '#4b5a9a'); g.addColorStop(1, '#1f2350');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(210,220,245,0.22)'; ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.1, r * 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(r * 0.05, -r * 0.2); ctx.fillStyle = '#20193a'; ctx.fill(starPath(r * 0.28, r * 0.12)); ctx.restore();
  gloss(ctx, -r * 0.4, -r * 0.35, r * 0.25, r * 0.15, -0.5, 0.45);
}

function raspberry(ctx: Ctx, s: number) {
  const R = s * 0.48;
  shadowEllipse(ctx, s * 0.05, R * 0.85, R, R * 0.3, 0.3);
  const pts: { x: number; y: number }[] = [];
  for (let ring = 0; ring < 4; ring++) {
    const rr = R * (0.78 - ring * 0.24), cnt = Math.max(1, 12 - ring * 4);
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2 + ring * 0.4;
      pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.9 - ring * R * 0.05 });
    }
  }
  pts.sort((a, b) => a.y - b.y);
  for (const p of pts) {
    const r = R * 0.27;
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.05, p.x, p.y, r);
    g.addColorStop(0, '#ff8fb0'); g.addColorStop(0.45, '#d81b60'); g.addColorStop(1, '#6d0a2c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }
}

function peach(ctx: Ctx, s: number) {
  const p = new Path2D();
  p.arc(0, s * 0.28, s * 0.52, Math.PI * 1.1, Math.PI * 1.9);
  p.arc(0, s * 0.42, s * 0.36, Math.PI * 1.85, Math.PI * 1.15, true);
  p.closePath();
  ctx.save(); ctx.translate(s * 0.03, s * 0.05); ctx.fillStyle = 'rgba(80,30,10,0.18)'; ctx.fill(p); ctx.restore();
  const g = ctx.createLinearGradient(0, -s * 0.25, 0, s * 0.1);
  g.addColorStop(0, '#f2873a'); g.addColorStop(0.25, '#f9b14d'); g.addColorStop(1, '#fde08a');
  ctx.fillStyle = g; ctx.fill(p);
  ctx.strokeStyle = '#e0542f'; ctx.lineWidth = s * 0.05;
  ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.5, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  gloss(ctx, -s * 0.1, -s * 0.12, s * 0.18, s * 0.05, -0.2, 0.6);
}

function kiwi(ctx: Ctx, s: number, seed: number) {
  const r = s * 0.5;
  ctx.fillStyle = 'rgba(40,30,10,0.2)'; ctx.beginPath(); ctx.ellipse(r * 0.06, r * 0.1, r, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5a2e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.95);
  g.addColorStop(0, '#f4f7d0'); g.addColorStop(0.3, '#b5d84a'); g.addColorStop(0.85, '#6fae2a'); g.addColorStop(1, '#4f8a1d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(240,250,200,0.35)'; ctx.lineWidth = Math.max(0.6, s * 0.012);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3); ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); ctx.stroke(); }
  ctx.fillStyle = '#fbfbe8'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.17, 0.3, 0, Math.PI * 2); ctx.fill();
  const R = rng(seed);
  ctx.fillStyle = '#1b130c';
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + R() * 0.1, rr = r * (0.3 + R() * 0.1);
    ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.035, s * 0.016, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  gloss(ctx, -r * 0.35, -r * 0.4, r * 0.35, r * 0.12, -0.6, 0.35);
}

const RAINBOW = ['#f48fb1', '#fff176', '#81d4fa', '#a5d6a7', '#ce93d8', '#ffffff', '#ffb74d', '#ef5350'];
const CHOC = ['#3e2216', '#5a3426', '#2a160e', '#6d4230'];

function sprinkles(ctx: Ctx, s: number, item: Item, k: number, tilt: number) {
  const R = rng(item.seed);
  const radius = s * 0.5;
  const n = Math.round(70 * item.scale * item.scale + 20);
  const v = item.variant || 'rainbow';
  const cos = Math.cos(item.rot), sin = Math.sin(item.rot);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * radius;
    let px = Math.cos(a) * d, py = Math.sin(a) * d;
    // undo the item's rotation and apply perspective manually so each sprinkle stays upright
    const rx = px * cos - py * sin, ry = px * sin + py * cos;
    px = rx; py = ry * tilt;
    const ang = R() * Math.PI;
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    if (v === 'rainbow' || v === 'chocolate') {
      const c = v === 'rainbow' ? RAINBOW[Math.floor(R() * RAINBOW.length)] : CHOC[Math.floor(R() * CHOC.length)];
      const L = 9 * k, W = 3 * k;
      ctx.fillStyle = 'rgba(60,20,15,0.18)'; roundRect(ctx, -L / 2 + 1, -W / 2 + 1.5, L, W, W / 2); ctx.fill();
      ctx.fillStyle = c; roundRect(ctx, -L / 2, -W / 2, L, W, W / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(ctx, -L / 2 + W * 0.4, -W / 2 + W * 0.15, L - W * 0.8, W * 0.3, W * 0.15); ctx.fill();
    } else if (v === 'hearts') {
      const c = ['#e33b57', '#f48fb1', '#ffffff', '#c2185b'][Math.floor(R() * 4)];
      ctx.rotate(-ang + (R() - 0.5) * 0.8);
      const hs = 9 * k;
      ctx.fillStyle = c; ctx.fill(heartPath(hs));
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-hs * 0.2, -hs * 0.18, hs * 0.08, 0, Math.PI * 2); ctx.fill();
    } else if (v === 'stars') {
      const c = ['#f3c34a', '#ffffff', '#f48fb1', '#e9b729'][Math.floor(R() * 4)];
      ctx.fillStyle = darken(c, 0.15); ctx.fill(starPath(5.5 * k, 2.4 * k));
      ctx.fillStyle = c; ctx.translate(-0.5, -0.5); ctx.fill(starPath(5 * k, 2.2 * k));
    } else {
      const c = ['#ffffff', '#fdf3f6', '#f7d9e3', '#efe6d0'][Math.floor(R() * 4)];
      const r = (2.6 + R() * 1.6) * k;
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, c); g.addColorStop(1, darken(c, 0.3));
      ctx.fillStyle = 'rgba(60,20,15,0.2)'; ctx.beginPath(); ctx.arc(r * 0.2, r * 0.4, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function roundRect(ctx: Ctx | Path2D, x: number, y: number, w: number, h: number, r: number) {
  if ('beginPath' in ctx) ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function rose(ctx: Ctx, s: number, col: string) {
  shadowEllipse(ctx, s * 0.04, s * 0.2, s * 0.5, s * 0.2, 0.28);
  ctx.save(); ctx.scale(1, 0.82);
  const rings = [{ r: s * 0.46, n: 6, off: 0 }, { r: s * 0.34, n: 5, off: 0.5 }, { r: s * 0.23, n: 4, off: 0.2 }];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const a = ring.off + (i / ring.n) * Math.PI * 2;
      const c = mix(col, darken(col, 0.25), ri * 0.15);
      const g = ctx.createRadialGradient(0, 0, ring.r * 0.4, 0, 0, ring.r);
      g.addColorStop(0, darken(c, 0.25)); g.addColorStop(0.7, c); g.addColorStop(1, lighten(c, 0.4));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, ring.r, a - 0.75, a + 0.75); ctx.arc(Math.cos(a) * ring.r * 0.18, Math.sin(a) * ring.r * 0.18, ring.r * 0.62, a + 0.95, a - 0.95, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = lighten(c, 0.55); ctx.lineWidth = Math.max(0.8, s * 0.025);
      ctx.beginPath(); ctx.arc(0, 0, ring.r * 0.98, a - 0.7, a + 0.7); ctx.stroke();
    }
  });
  ctx.strokeStyle = darken(col, 0.35); ctx.lineWidth = Math.max(1, s * 0.03);
  const g = ctx.createRadialGradient(-s * 0.04, -s * 0.04, 0, 0, 0, s * 0.14);
  g.addColorStop(0, lighten(col, 0.3)); g.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 3.2, r = s * 0.02 + t * s * 0.11; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.stroke();
  ctx.restore();
}

function daisy(ctx: Ctx, s: number, col: string) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = 'rgba(60,40,20,0.15)'; ctx.beginPath(); ctx.ellipse(s * 0.27 + 1, 2, s * 0.22, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(0, -s * 0.07, 0, s * 0.07);
    g.addColorStop(0, lighten(col, 0.5)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.15));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s * 0.27, 0, s * 0.22, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(-s * 0.04, -s * 0.05, 0, 0, 0, s * 0.13);
  g.addColorStop(0, '#fff2a0'); g.addColorStop(0.6, '#f5c228'); g.addColorStop(1, '#c98b0f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,90,10,0.5)';
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = Math.sqrt(i / 14) * s * 0.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s * 0.012, 0, Math.PI * 2); ctx.fill(); }
}

function blossom(ctx: Ctx, s: number, col: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.rotate(a);
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(s * 0.15, -s * 0.2, s * 0.45, -s * 0.18, s * 0.46, -s * 0.03);
    p.lineTo(s * 0.4, 0);
    p.lineTo(s * 0.46, s * 0.03);
    p.bezierCurveTo(s * 0.45, s * 0.18, s * 0.15, s * 0.2, 0, 0);
    ctx.save(); ctx.translate(1.5, 2); ctx.fillStyle = 'rgba(80,30,40,0.15)'; ctx.fill(p); ctx.restore();
    const g = ctx.createRadialGradient(0, 0, 0, s * 0.2, 0, s * 0.3);
    g.addColorStop(0, darken(col, 0.2)); g.addColorStop(0.5, col); g.addColorStop(1, lighten(col, 0.5));
    ctx.fillStyle = g; ctx.fill(p);
    ctx.restore();
  }
  ctx.strokeStyle = '#c2185b'; ctx.lineWidth = Math.max(0.6, s * 0.015);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12); ctx.stroke();
    ctx.fillStyle = '#f5c228'; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12, s * 0.02, 0, Math.PI * 2); ctx.fill();
  }
}

function fondantHeart(ctx: Ctx, s: number, col: string) {
  shadowEllipse(ctx, s * 0.05, s * 0.4, s * 0.42, s * 0.12, 0.3);
  const p = heartPath(s);
  ctx.save(); ctx.translate(s * 0.02, s * 0.04); ctx.fillStyle = darken(col, 0.4); ctx.fill(p); ctx.restore();
  const g = ctx.createRadialGradient(-s * 0.15, -s * 0.2, s * 0.02, 0, 0, s * 0.55);
  g.addColorStop(0, lighten(col, 0.45)); g.addColorStop(0.45, col); g.addColorStop(1, darken(col, 0.3));
  ctx.fillStyle = g; ctx.fill(p);
  gloss(ctx, -s * 0.22, -s * 0.22, s * 0.12, s * 0.06, -0.6, 0.9);
  gloss(ctx, s * 0.18, s * 0.1, s * 0.07, s * 0.03, -0.9, 0.35);
}

function goldStar(ctx: Ctx, s: number, col: string) {
  shadowEllipse(ctx, s * 0.05, s * 0.4, s * 0.4, s * 0.1, 0.25);
  const ro = s * 0.5, ri = s * 0.22;
  for (let i = 0; i < 10; i++) {
    const a1 = -Math.PI / 2 + (i * Math.PI) / 5, a2 = -Math.PI / 2 + ((i + 1) * Math.PI) / 5;
    const r1 = i % 2 ? ri : ro, r2 = (i + 1) % 2 ? ri : ro;
    ctx.fillStyle = i % 2 ? darken(col, 0.18) : lighten(col, 0.35);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = darken(col, 0.3); ctx.lineWidth = Math.max(0.6, s * 0.02); ctx.stroke(starPath(ro, ri));
  gloss(ctx, -s * 0.1, -s * 0.15, s * 0.12, s * 0.06, -0.5, 0.8);
}

export function satinBow(ctx: Ctx, s: number, col: string) {
  shadowEllipse(ctx, s * 0.04, s * 0.32, s * 0.45, s * 0.1, 0.22);
  const tail = (side: number) => {
    const g = ctx.createLinearGradient(side * s * 0.05, 0, side * s * 0.3, s * 0.4);
    g.addColorStop(0, darken(col, 0.2)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(side * s * 0.03, s * 0.02);
    ctx.quadraticCurveTo(side * s * 0.18, s * 0.2, side * s * 0.22, s * 0.44);
    ctx.lineTo(side * s * 0.3, s * 0.36); ctx.lineTo(side * s * 0.36, s * 0.43);
    ctx.quadraticCurveTo(side * s * 0.28, s * 0.15, side * s * 0.1, s * 0.0); ctx.closePath(); ctx.fill();
  };
  tail(-1); tail(1);
  const loop = (side: number) => {
    const g = ctx.createRadialGradient(side * s * 0.28, -s * 0.06, s * 0.02, side * s * 0.25, 0, s * 0.3);
    g.addColorStop(0, lighten(col, 0.5)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * s * 0.2, -s * 0.32, side * s * 0.52, -s * 0.28, side * s * 0.48, -s * 0.04);
    ctx.bezierCurveTo(side * s * 0.46, s * 0.14, side * s * 0.2, s * 0.12, 0, 0); ctx.fill();
    ctx.strokeStyle = rgba(darken(col, 0.4), 0.45); ctx.lineWidth = Math.max(0.6, s * 0.015);
    ctx.beginPath(); ctx.moveTo(side * s * 0.06, -s * 0.02); ctx.quadraticCurveTo(side * s * 0.25, -s * 0.12, side * s * 0.4, -s * 0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side * s * 0.06, s * 0.02); ctx.quadraticCurveTo(side * s * 0.25, s * 0.02, side * s * 0.38, s * 0.06); ctx.stroke();
  };
  loop(-1); loop(1);
  const kg = ctx.createRadialGradient(-s * 0.02, -s * 0.03, 0, 0, 0, s * 0.09);
  kg.addColorStop(0, lighten(col, 0.4)); kg.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
}

function ribbonCurl(ctx: Ctx, s: number, col: string) {
  const n = 40, amp = s * 0.18, w = s * 0.07;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const x0 = (t0 - 0.5) * s, x1 = (t1 - 0.5) * s;
    const y0 = Math.sin(t0 * Math.PI * 3) * amp, y1 = Math.sin(t1 * Math.PI * 3) * amp;
    const tw0 = Math.cos(t0 * Math.PI * 6) * w, tw1 = Math.cos(t1 * Math.PI * 6) * w;
    const shade = (Math.cos(t0 * Math.PI * 6) + 1) / 2;
    ctx.fillStyle = mix(darken(col, 0.3), lighten(col, 0.4), shade);
    ctx.beginPath(); ctx.moveTo(x0, y0 - tw0); ctx.lineTo(x1 + 0.5, y1 - tw1); ctx.lineTo(x1 + 0.5, y1 + tw1); ctx.lineTo(x0, y0 + tw0); ctx.closePath(); ctx.fill();
  }
}

function flame(ctx: Ctx, x: number, y: number, s: number, t: number) {
  const f = 1 + Math.sin(t * 20) * 0.08;
  const glow = ctx.createRadialGradient(x, y - s * 0.6, 0, x, y - s * 0.6, s * 2.2);
  glow.addColorStop(0, 'rgba(255,220,120,0.55)'); glow.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y - s * 0.6, s * 2.2, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x, y - s * 0.35, 0, x, y - s * 0.5, s * 0.9);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#fff3a0'); g.addColorStop(0.7, '#ffa726'); g.addColorStop(1, 'rgba(255,90,30,0.7)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.35 * f);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.6, x + s * 0.35, y, x, y);
  ctx.bezierCurveTo(x - s * 0.35, y, x - s * 0.45, y - s * 0.6, x, y - s * 1.35 * f); ctx.fill();
}

function candle(ctx: Ctx, s: number, col: string, t: number) {
  const w = s * 0.14, h = s * 0.82, top = -s * 0.36, bottom = top + h;
  shadowEllipse(ctx, w * 0.3, bottom, w * 1.6, w * 0.5, 0.25);
  const body = new Path2D(); roundRect(body, -w / 2, top, w, h, w * 0.2);
  ctx.fillStyle = '#fffaf2'; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = col;
  for (let y = top - w * 2; y < bottom + w; y += w * 1.3) {
    ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y - w * 0.9); ctx.lineTo(w, y - w * 0.4); ctx.lineTo(-w, y + w * 0.5); ctx.closePath(); ctx.fill();
  }
  const sh = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.15)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sh; ctx.fillRect(-w, top, w * 2, h);
  ctx.restore();
  ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, top - s * 0.06); ctx.stroke();
  flame(ctx, 0, top - s * 0.05, s * 0.1, t);
}

function numberCandle(ctx: Ctx, s: number, col: string, text: string, t: number) {
  const fs = s * 0.85;
  ctx.font = `700 ${fs}px Fredoka, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = s * 0.12;
  shadowEllipse(ctx, 0, y + fs * 0.4, fs * 0.35, fs * 0.08, 0.25);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = darken(col, 0.35); ctx.lineWidth = s * 0.08; ctx.strokeText(text, s * 0.015, y + s * 0.02);
  const g = ctx.createLinearGradient(-fs * 0.3, y - fs / 2, fs * 0.3, y + fs / 2);
  g.addColorStop(0, lighten(col, 0.4)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = g; ctx.fillText(text, 0, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = s * 0.02; ctx.setLineDash([s * 0.02, s * 0.05]); ctx.strokeText(text, 0, y); ctx.setLineDash([]);
  const top = y - fs * 0.38;
  ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, top - s * 0.06); ctx.stroke();
  flame(ctx, 0, top - s * 0.05, s * 0.09, t);
}

function bear(ctx: Ctx, s: number) {
  const fur = '#a8754a', dark = '#6e4426', light = '#d9ab7c';
  shadowEllipse(ctx, 0, s * 0.45, s * 0.35, s * 0.08, 0.3);
  const ball = (x: number, y: number, r: number, c: string) => {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, lighten(c, 0.3)); g.addColorStop(0.6, c); g.addColorStop(1, darken(c, 0.3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  ball(0, s * 0.22, s * 0.25, fur);
  ball(-s * 0.2, s * 0.38, s * 0.1, fur); ball(s * 0.2, s * 0.38, s * 0.1, fur);
  ball(0, s * 0.27, s * 0.13, light);
  ball(-s * 0.17, -s * 0.33, s * 0.1, fur); ball(s * 0.17, -s * 0.33, s * 0.1, fur);
  ball(-s * 0.17, -s * 0.33, s * 0.05, light); ball(s * 0.17, -s * 0.33, s * 0.05, light);
  ball(0, -s * 0.15, s * 0.24, fur);
  ball(0, -s * 0.08, s * 0.1, light);
  ctx.fillStyle = '#2b1810';
  ctx.beginPath(); ctx.ellipse(0, -s * 0.11, s * 0.035, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-s * 0.09, -s * 0.18, s * 0.025, 0, Math.PI * 2); ctx.arc(s * 0.09, -s * 0.18, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.8, s * 0.015);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.085); ctx.quadraticCurveTo(-s * 0.03, -s * 0.05, -s * 0.05, -s * 0.06); ctx.moveTo(0, -s * 0.085); ctx.quadraticCurveTo(s * 0.03, -s * 0.05, s * 0.05, -s * 0.06); ctx.stroke();
  ctx.fillStyle = 'rgba(240,120,140,0.45)';
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.1, s * 0.04, s * 0.025, 0, 0, Math.PI * 2); ctx.ellipse(s * 0.15, -s * 0.1, s * 0.04, s * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(0, s * 0.03); ctx.scale(0.45, 0.45); satinBow(ctx, s * 0.6, '#e33b57'); ctx.restore();
}

function bunny(ctx: Ctx, s: number) {
  const fur = '#fbf6f1';
  shadowEllipse(ctx, 0, s * 0.45, s * 0.32, s * 0.08, 0.3);
  const ball = (x: number, y: number, rx: number, ry: number, c: string, rot = 0) => {
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 1, x, y, Math.max(rx, ry));
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, c); g.addColorStop(1, darken(c, 0.18));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  };
  ball(-s * 0.1, -s * 0.38, s * 0.07, s * 0.2, fur, -0.15); ball(s * 0.1, -s * 0.38, s * 0.07, s * 0.2, fur, 0.15);
  ctx.fillStyle = '#f7b6c8';
  ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.37, s * 0.03, s * 0.13, -0.15, 0, Math.PI * 2); ctx.ellipse(s * 0.1, -s * 0.37, s * 0.03, s * 0.13, 0.15, 0, Math.PI * 2); ctx.fill();
  ball(0, s * 0.24, s * 0.23, s * 0.22, fur);
  ball(-s * 0.15, s * 0.4, s * 0.08, s * 0.06, fur); ball(s * 0.15, s * 0.4, s * 0.08, s * 0.06, fur);
  ball(0, -s * 0.08, s * 0.22, s * 0.19, fur);
  ctx.fillStyle = '#2b1810';
  ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.1, s * 0.022, 0, Math.PI * 2); ctx.arc(s * 0.08, -s * 0.1, s * 0.022, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f48fb1'; ctx.beginPath(); ctx.ellipse(0, -s * 0.04, s * 0.025, s * 0.018, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244,143,177,0.5)';
  ctx.beginPath(); ctx.ellipse(-s * 0.13, -s * 0.03, s * 0.035, s * 0.022, 0, 0, Math.PI * 2); ctx.ellipse(s * 0.13, -s * 0.03, s * 0.035, s * 0.022, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(0, s * 0.24); ctx.scale(0.55, 0.55); fondantHeart(ctx, s * 0.4, '#e33b57'); ctx.restore();
}

function goldGrad(ctx: Ctx, y0: number, y1: number, col: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(col, 0.55)); g.addColorStop(0.45, col); g.addColorStop(0.55, darken(col, 0.15)); g.addColorStop(1, lighten(col, 0.25));
  return g;
}

function glitter(ctx: Ctx, path: Path2D, s: number, seed: number) {
  ctx.save(); ctx.clip(path);
  const R = rng(seed);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = R() > 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(120,70,0,0.35)';
    ctx.fillRect((R() - 0.5) * s, (R() - 0.5) * s * 1.4, s * 0.012, s * 0.012);
  }
  ctx.restore();
}

function topperBirthday(ctx: Ctx, s: number, col: string, text: string) {
  ctx.fillStyle = goldGrad(ctx, 0, s * 0.35, col);
  ctx.fillRect(-s * 0.28, -s * 0.02, s * 0.018, s * 0.38); ctx.fillRect(s * 0.27, -s * 0.02, s * 0.018, s * 0.38);
  const lines = (text || 'Happy Birthday').split(/\s+/);
  const mid = Math.ceil(lines.length / 2);
  const l1 = lines.slice(0, mid).join(' '), l2 = lines.slice(mid).join(' ');
  const fs = s * 0.2;
  ctx.font = `${fs}px Pacifico, cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const draw = (t: string, y: number) => {
    ctx.lineJoin = 'round'; ctx.strokeStyle = darken(col, 0.45); ctx.lineWidth = s * 0.03; ctx.strokeText(t, 2, y + 2);
    ctx.strokeStyle = darken(col, 0.2); ctx.lineWidth = s * 0.02; ctx.strokeText(t, 0, y);
    ctx.fillStyle = goldGrad(ctx, y - fs / 2, y + fs / 2, col); ctx.fillText(t, 0, y);
  };
  if (l2) { draw(l1, -s * 0.25); draw(l2, -s * 0.06); } else draw(l1, -s * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const R = rng(7);
  for (let i = 0; i < 25; i++) ctx.fillRect((R() - 0.5) * s * 0.9, -s * 0.35 + R() * s * 0.35, 1.2, 1.2);
}

function topperHeart(ctx: Ctx, s: number, col: string, seed: number) {
  ctx.fillStyle = goldGrad(ctx, 0, s * 0.6, col);
  ctx.fillRect(-s * 0.012, s * 0.05, s * 0.025, s * 0.55);
  ctx.save(); ctx.translate(0, -s * 0.22);
  const outer = heartPath(s * 0.75);
  ctx.fillStyle = goldGrad(ctx, -s * 0.3, s * 0.3, col); ctx.fill(outer);
  glitter(ctx, outer, s * 0.75, seed);
  ctx.save(); ctx.scale(0.72, 0.72); ctx.translate(0, s * 0.02);
  ctx.globalCompositeOperation = 'destination-out'; ctx.fill(heartPath(s * 0.75)); ctx.restore();
  ctx.restore();
}

function bunting(ctx: Ctx, s: number, seed: number) {
  ctx.fillStyle = '#e8d7c0';
  ctx.fillRect(-s * 0.4, -s * 0.3, s * 0.02, s * 0.6); ctx.fillRect(s * 0.38, -s * 0.3, s * 0.02, s * 0.6);
  ctx.strokeStyle = '#7a1f2b'; ctx.lineWidth = Math.max(1, s * 0.006);
  ctx.beginPath(); ctx.moveTo(-s * 0.39, -s * 0.27); ctx.quadraticCurveTo(0, -s * 0.05, s * 0.39, -s * 0.27); ctx.stroke();
  const cols = ['#f4a7b9', '#fbe7a1', '#bcd9f0', '#c8203a', '#cdbbe8', '#bfe3cf'];
  const n = 7; const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -s * 0.39 + t * s * 0.78;
    const y = (1 - t) * (1 - t) * -s * 0.27 + 2 * (1 - t) * t * -s * 0.05 + t * t * -s * 0.27;
    const c = cols[(i + Math.floor(R() * 2)) % cols.length];
    ctx.fillStyle = 'rgba(60,20,15,0.15)';
    ctx.beginPath(); ctx.moveTo(x - s * 0.045 + 1, y + 1.5); ctx.lineTo(x + s * 0.045 + 1, y + 1.5); ctx.lineTo(x + 1, y + s * 0.13 + 1.5); ctx.fill();
    const g = ctx.createLinearGradient(x - s * 0.04, 0, x + s * 0.04, 0);
    g.addColorStop(0, lighten(c, 0.3)); g.addColorStop(1, darken(c, 0.1));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - s * 0.045, y); ctx.lineTo(x + s * 0.045, y); ctx.lineTo(x, y + s * 0.13); ctx.fill();
  }
}

function chocShard(ctx: Ctx, s: number, seed: number) {
  const R = rng(seed);
  const pts: [number, number][] = [[-0.22, -0.45], [0.18, -0.4], [0.3, 0.05], [0.22, 0.42], [-0.15, 0.45], [-0.3, 0.0]].map(([x, y]) => [(x + (R() - 0.5) * 0.06) * s, (y + (R() - 0.5) * 0.06) * s]);
  shadowEllipse(ctx, 0, s * 0.42, s * 0.3, s * 0.08, 0.3);
  const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
  ctx.save(); ctx.translate(s * 0.03, s * 0.02); ctx.fillStyle = '#1e0f08'; ctx.fill(p); ctx.restore();
  const g = ctx.createLinearGradient(-s * 0.3, -s * 0.4, s * 0.3, s * 0.4);
  g.addColorStop(0, '#7a4a33'); g.addColorStop(0.4, '#4a2a1b'); g.addColorStop(1, '#2a160e');
  ctx.fillStyle = g; ctx.fill(p);
  gloss(ctx, -s * 0.08, -s * 0.18, s * 0.16, s * 0.04, -1.2, 0.35);
  ctx.save(); ctx.clip(p);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = '#e9c46a'; ctx.fillRect((R() - 0.5) * s * 0.5, (R() - 0.5) * s * 0.8, s * 0.025, s * 0.018); }
  ctx.restore();
}

function truffle(ctx: Ctx, s: number, seed: number) {
  const r = s * 0.45;
  shadowEllipse(ctx, s * 0.05, r * 0.85, r, r * 0.3, 0.35);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#8a5a40'); g.addColorStop(0.5, '#4a2a1b'); g.addColorStop(1, '#1e0f08');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  const R = rng(seed);
  ctx.strokeStyle = 'rgba(255,240,220,0.85)'; ctx.lineWidth = Math.max(0.8, s * 0.035); ctx.lineCap = 'round';
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const y = -r * 0.6 + i * r * 0.3 + (R() - 0.5) * r * 0.1; ctx.moveTo(-r, y); ctx.quadraticCurveTo(0, y + r * 0.25, r, y - r * 0.05); } ctx.stroke();
  ctx.restore();
  gloss(ctx, -r * 0.35, -r * 0.4, r * 0.25, r * 0.14, -0.6, 0.5);
}

function chocCurl(ctx: Ctx, s: number) {
  shadowEllipse(ctx, 0, s * 0.18, s * 0.45, s * 0.07, 0.3);
  const w = s * 0.9, h = s * 0.22;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#3a2014'); g.addColorStop(0.3, '#8a5a40'); g.addColorStop(0.55, '#5a3426'); g.addColorStop(1, '#1e0f08');
  ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(30,15,8,0.6)'; ctx.lineWidth = Math.max(0.6, s * 0.015);
  for (let i = 1; i < 6; i++) { const x = -w / 2 + (i * w) / 6; ctx.beginPath(); ctx.moveTo(x - h * 0.2, -h / 2); ctx.lineTo(x + h * 0.2, h / 2); ctx.stroke(); }
  ctx.fillStyle = '#2a160e'; ctx.beginPath(); ctx.ellipse(w / 2 - h * 0.3, 0, h * 0.25, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a40'; ctx.beginPath(); ctx.arc(w / 2 - h * 0.3, 0, h * 0.2, 0, Math.PI * 1.6); ctx.stroke();
}

function macaron(ctx: Ctx, s: number, col: string) {
  shadowEllipse(ctx, 0, s * 0.3, s * 0.45, s * 0.1, 0.3);
  const shellP = (y: number, top: boolean) => {
    const g = ctx.createLinearGradient(0, y - s * 0.15, 0, y + s * 0.12);
    g.addColorStop(0, lighten(col, top ? 0.4 : 0.15)); g.addColorStop(0.6, col); g.addColorStop(1, darken(col, 0.25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, y, s * 0.45, top ? s * 0.17 : s * 0.12, 0, top ? Math.PI : 0, top ? Math.PI * 2 : Math.PI); ctx.lineTo(-s * 0.45, y); ctx.fill();
    ctx.fillStyle = darken(col, 0.1);
    for (let i = 0; i < 18; i++) { const x = -s * 0.43 + (i * s * 0.86) / 17; ctx.beginPath(); ctx.arc(x, y + (top ? s * 0.025 : -s * 0.025), s * 0.028, 0, Math.PI * 2); ctx.fill(); }
  };
  shellP(s * 0.12, false);
  ctx.fillStyle = '#fff6ee'; roundRect(ctx, -s * 0.4, -s * 0.03, s * 0.8, s * 0.11, s * 0.05); ctx.fill();
  shellP(-s * 0.06, true);
  gloss(ctx, -s * 0.15, -s * 0.15, s * 0.15, s * 0.04, -0.1, 0.5);
}

function label(ctx: Ctx, s: number, col: string, text: string) {
  const w = s, h = s * 0.6;
  ctx.fillStyle = 'rgba(60,20,15,0.18)'; ctx.beginPath(); ctx.ellipse(2, 3, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.015; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.46, h * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([s * 0.012, s * 0.02]); ctx.beginPath(); ctx.ellipse(0, 0, w * 0.43, h * 0.37, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${s * 0.045}px "Playfair Display", serif`; ctx.fillText('— EST. 2026 —', 0, -h * 0.22);
  ctx.font = `${s * 0.12}px Pacifico, cursive`; ctx.fillText(text || 'Kkumi Cafe', 0, 0);
  ctx.font = `italic ${s * 0.05}px "Playfair Display", serif`; ctx.fillText('handmade café', 0, h * 0.22);
}

function stamp(ctx: Ctx, s: number, col: string) {
  const w = s * 0.8, h = s;
  ctx.fillStyle = 'rgba(60,20,15,0.18)'; ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  const r = s * 0.035;
  for (let x = -w / 2; x <= w / 2; x += r * 2.6) { ctx.beginPath(); ctx.arc(x, -h / 2, r, 0, Math.PI * 2); ctx.arc(x, h / 2, r, 0, Math.PI * 2); ctx.fill(); }
  for (let y = -h / 2; y <= h / 2; y += r * 2.6) { ctx.beginPath(); ctx.arc(-w / 2, y, r, 0, Math.PI * 2); ctx.arc(w / 2, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = lighten(col, 0.75); ctx.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.8);
  ctx.save(); ctx.translate(0, h * 0.02); cherry(ctx, s * 0.45); ctx.restore();
  ctx.fillStyle = col; ctx.font = `700 ${s * 0.12}px Fredoka, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('25¢', -w * 0.36, -h * 0.37);
  ctx.font = `${s * 0.09}px Pacifico, cursive`; ctx.textAlign = 'center'; ctx.fillText('Kkumi', 0, h * 0.2);
}

function sticker(ctx: Ctx, s: number, draw: () => void) {
  ctx.save();
  ctx.shadowColor = 'rgba(60,20,15,0.25)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.03;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  draw();
}

function tag(ctx: Ctx, s: number, col: string, text: string) {
  const w = s * 0.62, h = s * 0.95;
  const p = new Path2D();
  p.moveTo(-w / 2, -h / 2 + w * 0.3); p.lineTo(0, -h / 2); p.lineTo(w / 2, -h / 2 + w * 0.3); p.lineTo(w / 2, h / 2); p.lineTo(-w / 2, h / 2); p.closePath();
  ctx.save(); ctx.translate(2, 3); ctx.fillStyle = 'rgba(60,20,15,0.2)'; ctx.fill(p); ctx.restore();
  ctx.fillStyle = col; ctx.fill(p);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
  ctx.save(); ctx.scale(0.88, 0.9); ctx.stroke(p); ctx.restore(); ctx.setLineDash([]);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -h / 2 + w * 0.3, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darken(col, 0.6); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${s * 0.14}px Caveat, cursive`;
  const words = (text || 'with love').split(' ');
  words.slice(0, 3).forEach((wd, i) => ctx.fillText(wd, 0, i * s * 0.15));
}

export function drawPhoto(ctx: Ctx, s: number, item: Item, photos: Record<string, string>) {
  const frame = (item.variant || 'circle') as 'circle' | 'square' | 'heart' | 'oval' | 'scallop';
  const shapeName = frame === 'circle' ? 'round' : frame;
  const pts = outline(shapeName, s * 0.5, 200);
  const p = new Path2D(); pathFrom(p, pts);
  ctx.save(); ctx.translate(2, 4); ctx.fillStyle = 'rgba(60,20,15,0.15)'; ctx.fill(p); ctx.restore();
  ctx.fillStyle = '#fffaf2'; ctx.fill(p);
  const src = item.photoId ? photos[item.photoId] : undefined;
  const img = src ? getImage(src) : undefined;
  ctx.save(); ctx.clip(p);
  if (img && img.complete && img.naturalWidth) {
    const crop = item.crop || { zoom: 1, px: 0, py: 0 };
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const box = s * 1.25;
    const sc = Math.max(box / iw, box / ih) * crop.zoom;
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, -dw / 2 + crop.px * s * 0.5, -dh / 2 + crop.py * s * 0.5, dw, dh);
    // edible-print look: soft sugar sheen + slight warmth
    ctx.fillStyle = 'rgba(255,240,235,0.12)'; ctx.fillRect(-s, -s, s * 2, s * 2);
    const g = ctx.createLinearGradient(-s * 0.5, -s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,60,40,0.12)');
    ctx.fillStyle = g; ctx.fillRect(-s, -s, s * 2, s * 2);
  } else {
    ctx.fillStyle = '#f6e7e4'; ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.fillStyle = '#c99'; ctx.font = `${s * 0.09}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('your photo', 0, 0);
  }
  ctx.restore();
  if (item.border !== false) {
    const col = item.borderColor || '#ffffff';
    const n = Math.max(18, Math.round(s / 9));
    const bp = outline(shapeName, s * 0.5, n);
    const r = Math.max(2.5, s * 0.045);
    for (const q of bp) creamDab(ctx, q.x, q.y, r, col);
  }
}

export function drawText(ctx: Ctx, item: Item, s: number) {
  const col = item.color || '#c8203a';
  const fs = s;
  ctx.font = `${fs}px ${item.font || 'Pacifico'}, cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = (item.text || 'Happy Birthday').split('\n');
  const lh = fs * 1.15;
  lines.forEach((ln, i) => {
    const y = (i - (lines.length - 1) / 2) * lh;
    ctx.fillStyle = 'rgba(60,20,15,0.25)'; ctx.fillText(ln, fs * 0.04, y + fs * 0.07);
    ctx.fillStyle = lighten(col, 0.55); ctx.fillText(ln, -fs * 0.02, y - fs * 0.03);
    ctx.fillStyle = col; ctx.fillText(ln, 0, y);
  });
}

export function textWidth(ctx: Ctx, item: Item, s: number) {
  ctx.save();
  ctx.font = `${s}px ${item.font || 'Pacifico'}, cursive`;
  const lines = (item.text || 'Happy Birthday').split('\n');
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
  ctx.restore();
  return { w: w + s * 0.3, h: lines.length * s * 1.2 + s * 0.2 };
}

/** Draw a decoration centred at (0,0). s = on-screen size in px. */
export function drawAsset(ctx: Ctx, item: Item, s: number, o: { k: number; tilt: number; t: number; photos: Record<string, string> }) {
  const meta = ASSETS[item.kind as Exclude<ItemKind, 'piping'>];
  const col = item.color || meta?.color || '#f4a7b9';
  switch (item.kind) {
    case 'strawberry': return strawberry(ctx, s, item.seed);
    case 'cherry': return cherry(ctx, s);
    case 'blueberry': return blueberry(ctx, s);
    case 'raspberry': return raspberry(ctx, s);
    case 'peach': return peach(ctx, s);
    case 'kiwi': return kiwi(ctx, s, item.seed);
    case 'sprinkles': return sprinkles(ctx, s, item, o.k, o.tilt);
    case 'rose': return rose(ctx, s, col);
    case 'daisy': return daisy(ctx, s, col);
    case 'blossom': return blossom(ctx, s, col);
    case 'heart': return fondantHeart(ctx, s, col);
    case 'star': return goldStar(ctx, s, col);
    case 'bow': return satinBow(ctx, s, col);
    case 'ribbon': return ribbonCurl(ctx, s, col);
    case 'candle': return candle(ctx, s, col, o.t);
    case 'numberCandle': return numberCandle(ctx, s, col, item.text || '1', o.t);
    case 'bear': return bear(ctx, s);
    case 'bunny': return bunny(ctx, s);
    case 'topperBirthday': return topperBirthday(ctx, s, col, item.text || 'Happy Birthday');
    case 'topperHeart': return topperHeart(ctx, s, col, item.seed);
    case 'bunting': return bunting(ctx, s, item.seed);
    case 'chocShard': return chocShard(ctx, s, item.seed);
    case 'truffle': return truffle(ctx, s, item.seed);
    case 'chocCurl': return chocCurl(ctx, s);
    case 'macaron': return macaron(ctx, s, col);
    case 'label': return label(ctx, s, col, item.text || 'Kkumi Cafe');
    case 'stamp': return stamp(ctx, s, col);
    case 'stickerCherry': return sticker(ctx, s, () => { ctx.save(); ctx.scale(0.8, 0.8); cherry(ctx, s); ctx.restore(); });
    case 'stickerHeart': return sticker(ctx, s, () => { ctx.save(); ctx.scale(0.75, 0.75); fondantHeart(ctx, s, col); ctx.restore(); });
    case 'stickerStar': return sticker(ctx, s, () => { ctx.save(); ctx.scale(0.75, 0.75); goldStar(ctx, s, col); ctx.restore(); });
    case 'stickerFlower': return sticker(ctx, s, () => { ctx.save(); ctx.scale(0.8, 0.8); blossom(ctx, s, col); ctx.restore(); });
    case 'tag': return tag(ctx, s, col, item.text || 'with love');
    case 'text': return drawText(ctx, item, s);
    case 'photo': return drawPhoto(ctx, s, item, o.photos);
  }
}
