import { darken, lighten, rgba } from '../lib/color';
import { Pt, spaceAlong } from '../lib/geometry';
import type { Tip, BorderStyle } from '../types';

type Ctx = CanvasRenderingContext2D;

/** A soft, shaded dollop of buttercream. */
export function creamDab(ctx: Ctx, x: number, y: number, r: number, col: string, shadow = true) {
  if (shadow) {
    ctx.fillStyle = 'rgba(70,25,20,0.13)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.38, r * 1.02, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, lighten(col, 0.55));
  g.addColorStop(0.45, col);
  g.addColorStop(1, darken(col, 0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function dirAt(pts: Pt[], i: number) {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

function tube(ctx: Ctx, pts: Pt[], r: number, col: string) {
  if (pts.length === 1) { creamDab(ctx, pts[0].x, pts[0].y, r, col); return; }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (ox: number, oy: number, w: number, s: string) => {
    ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + ox, p.y + oy) : ctx.moveTo(p.x + ox, p.y + oy)));
    ctx.stroke();
  };
  line(r * 0.15, r * 0.45, r * 2.1, 'rgba(70,25,20,0.14)');
  line(0, 0, r * 2, darken(col, 0.18));
  line(-r * 0.1, -r * 0.12, r * 1.6, col);
  line(-r * 0.25, -r * 0.35, r * 0.75, lighten(col, 0.35));
  line(-r * 0.32, -r * 0.48, r * 0.25, rgba('#ffffff', 0.7));
}

function starDrop(ctx: Ctx, x: number, y: number, r: number, col: string, ang: number) {
  creamDab(ctx, x, y, r, col);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    ctx.strokeStyle = rgba(darken(col, 0.35), 0.45); ctx.lineWidth = Math.max(0.8, r * 0.12);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
    ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.6, Math.sin(a + 0.3) * r * 0.6, Math.cos(a + 0.5) * r * 0.95, Math.sin(a + 0.5) * r * 0.95);
    ctx.stroke();
    ctx.strokeStyle = rgba(lighten(col, 0.6), 0.55); ctx.lineWidth = Math.max(0.6, r * 0.07);
    ctx.beginPath(); ctx.moveTo(Math.cos(a + 0.25) * r * 0.2, Math.sin(a + 0.25) * r * 0.2);
    ctx.quadraticCurveTo(Math.cos(a + 0.55) * r * 0.6, Math.sin(a + 0.55) * r * 0.6, Math.cos(a + 0.75) * r * 0.9, Math.sin(a + 0.75) * r * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function shell(ctx: Ctx, x: number, y: number, r: number, col: string, d: Pt) {
  const ang = Math.atan2(d.y, d.x);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = 'rgba(70,25,20,0.14)';
  ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.45, r * 1.5, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  const p = new Path2D();
  p.moveTo(r * 1.9, 0);
  p.bezierCurveTo(r * 1.2, -r * 0.5, r * 0.2, -r * 1.05, -r * 0.55, -r * 0.75);
  p.bezierCurveTo(-r * 1.2, -r * 0.4, -r * 1.2, r * 0.45, -r * 0.55, r * 0.75);
  p.bezierCurveTo(r * 0.2, r * 1.05, r * 1.2, r * 0.5, r * 1.9, 0);
  const g = ctx.createRadialGradient(-r * 0.5, -r * 0.5, r * 0.1, -r * 0.1, 0, r * 1.5);
  g.addColorStop(0, lighten(col, 0.55)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.22));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  for (let k = -2; k <= 2; k++) {
    ctx.strokeStyle = rgba(darken(col, 0.35), 0.4); ctx.lineWidth = Math.max(0.7, r * 0.1);
    ctx.beginPath(); ctx.moveTo(r * 1.9, 0); ctx.quadraticCurveTo(r * 0.4, k * r * 0.28, -r * 1.0, k * r * 0.42); ctx.stroke();
    ctx.strokeStyle = rgba(lighten(col, 0.7), 0.5); ctx.lineWidth = Math.max(0.5, r * 0.06);
    ctx.beginPath(); ctx.moveTo(r * 1.9, 0); ctx.quadraticCurveTo(r * 0.4, k * r * 0.28 - r * 0.1, -r * 1.0, k * r * 0.42 - r * 0.12); ctx.stroke();
  }
  ctx.restore(); ctx.restore();
}

function leaf(ctx: Ctx, x: number, y: number, r: number, col: string, d: Pt, side: number) {
  const ang = Math.atan2(d.y, d.x) + side * 0.6;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const p = new Path2D();
  p.moveTo(-r * 0.2, 0);
  p.quadraticCurveTo(r * 0.8, -r * 0.75, r * 1.9, 0);
  p.quadraticCurveTo(r * 0.8, r * 0.75, -r * 0.2, 0);
  ctx.fillStyle = 'rgba(40,40,20,0.15)'; ctx.translate(r * 0.1, r * 0.3); ctx.fill(p); ctx.translate(-r * 0.1, -r * 0.3);
  const g = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
  g.addColorStop(0, lighten(col, 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.25));
  ctx.fillStyle = g; ctx.fill(p);
  ctx.strokeStyle = rgba(darken(col, 0.4), 0.6); ctx.lineWidth = Math.max(0.7, r * 0.1);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.7, 0); ctx.stroke();
  ctx.restore();
}

function ruffle(ctx: Ctx, pts: Pt[], r: number, col: string) {
  pts.forEach((p, i) => {
    const d = dirAt(pts, i);
    const nx = -d.y, ny = d.x;
    const wob = Math.sin(i * 1.3) * r * 0.25;
    ctx.save(); ctx.translate(p.x + nx * wob, p.y + ny * wob); ctx.rotate(Math.atan2(ny, nx));
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    const c = i % 2 ? col : lighten(col, 0.12);
    g.addColorStop(0, darken(c, 0.2)); g.addColorStop(0.35, lighten(c, 0.4)); g.addColorStop(1, darken(c, 0.15));
    ctx.fillStyle = 'rgba(70,25,20,0.1)';
    ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.3, r * 1.1, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(darken(c, 0.3), 0.35); ctx.lineWidth = Math.max(0.5, r * 0.06);
    ctx.stroke();
    ctx.restore();
  });
}

function rosette(ctx: Ctx, x: number, y: number, r: number, col: string, seed: number) {
  ctx.fillStyle = 'rgba(70,25,20,0.15)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.35, r * 1.15, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  const spiral: Pt[] = [];
  const turns = 1.6, steps = 40, a0 = seed % 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + t * turns * Math.PI * 2;
    const rr = r * (0.15 + 0.72 * t);
    spiral.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  spiral.reverse();
  tube(ctx, spiral, r * 0.34, col);
  ctx.save();
  ctx.strokeStyle = rgba(darken(col, 0.35), 0.35); ctx.lineWidth = Math.max(0.6, r * 0.06);
  ctx.beginPath(); spiral.forEach((p, i) => (i ? ctx.lineTo(p.x + 1, p.y + 1) : ctx.moveTo(p.x + 1, p.y + 1))); ctx.stroke();
  ctx.restore();
}

/** Render a piped stroke (screen space). */
export function drawPiping(ctx: Ctx, raw: Pt[], tip: Tip, r: number, col: string, seed = 1) {
  if (!raw.length) return;
  const spacing: Record<Tip, number> = { round: r * 0.4, star: r * 0.62, shell: r * 1.35, leaf: r * 1.25, ruffle: r * 0.32, rosette: r * 2.0 };
  const pts = raw.length > 1 ? spaceAlong(raw, spacing[tip]) : raw;
  switch (tip) {
    case 'round': tube(ctx, pts, r, col); break;
    case 'star': pts.forEach((p, i) => starDrop(ctx, p.x, p.y, r, col, i * 0.7)); break;
    case 'shell': pts.forEach((p, i) => shell(ctx, p.x, p.y, r, col, dirAt(pts, i))); break;
    case 'leaf': pts.forEach((p, i) => leaf(ctx, p.x, p.y, r, col, dirAt(pts, i), i % 2 ? 1 : -1)); break;
    case 'ruffle': ruffle(ctx, pts, r, col); break;
    case 'rosette': pts.forEach((p, i) => rosette(ctx, p.x, p.y, r, col, seed + i)); break;
  }
}

/** Border along an ordered list of screen points (already a closed/partial loop). */
export function drawBorder(ctx: Ctx, pts: Pt[], style: BorderStyle, r: number, col: string, closed: boolean) {
  if (style === 'none' || pts.length < 2) return;
  const loop = closed ? [...pts, pts[0]] : pts;
  switch (style) {
    case 'beads': {
      const s = spaceAlong(loop, r * 1.7);
      s.forEach((p) => creamDab(ctx, p.x, p.y, r, col));
      break;
    }
    case 'shell': drawPiping(ctx, loop, 'shell', r * 0.85, col); break;
    case 'ruffle': drawPiping(ctx, loop, 'ruffle', r, col); break;
    case 'rosettes': {
      const s = spaceAlong(loop, r * 2.1);
      s.forEach((p, i) => rosette(ctx, p.x, p.y, r, col, i));
      break;
    }
    case 'star': drawPiping(ctx, loop, 'star', r, col); break;
  }
}
