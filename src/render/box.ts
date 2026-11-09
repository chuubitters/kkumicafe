import { darken, lighten, rgba } from '../lib/color';
import { Pt, bbox, lowerEnvelope, normals, outline, pathFrom } from '../lib/geometry';
import type { BoxState, CakeState } from '../types';
import { satinBow } from './assets';
import { Layout, SIZE_F, cakeHeight, cylinderShade, drawItems, extrusionPath, proj, renderCake } from './cake';
import { makePattern } from './patterns';

type Ctx = CanvasRenderingContext2D;

export const BOX_R = 250;
export const LID_DEPTH = 46;

export function boxOutline(shape: BoxState['shape']) {
  switch (shape) {
    case 'square': return outline('square', 262, 240);
    case 'rect': return outline('rect', 240, 240);
    case 'heart': return outline('heart', 262, 240);
    case 'round': return outline('round', 238, 240);
  }
}

export const boxHeight = (cake: CakeState) => cakeHeight(cake.layers) + 55;

export function boxLayout(cake: CakeState, W: number, H: number, zoom = 1, tilt = 0.5): Layout {
  const sf = SIZE_F[cake.size] / 0.92;
  const k = ((Math.min(W, H) * 0.28) / BOX_R) * zoom * (0.85 + sf * 0.15);
  const sideF = Math.sqrt(Math.max(0, 1 - tilt * tilt));
  const hpx = boxHeight(cake) * k * sideF;
  return { cx: W / 2, cy: H * 0.56 - hpx / 2, k, tilt, sideF };
}

function windowPath(kind: BoxState['window']): Pt[] | null {
  if (kind === 'none') return null;
  if (kind === 'circle') return outline('round', 120, 120);
  if (kind === 'heart') return outline('heart', 130, 120);
  return outline('rect', 115, 120);
}

function frontPointAlong(pts: Pt[], dir: Pt): Pt {
  let best: Pt = pts[0], score = -Infinity;
  for (const p of pts) {
    const cross = Math.abs(p.x * dir.y - p.y * dir.x);
    if (cross < 8 && p.y > score) { score = p.y; best = p; }
  }
  return best;
}

function satin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, col: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, darken(col, 0.25)); g.addColorStop(0.3, lighten(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, darken(col, 0.3));
  return g;
}

export interface BoxRenderOpts {
  lid?: { dx: number; dy: number; scale: number; alpha: number; behind: boolean } | null; // null = closed
  cakeRise?: number; // px
  t?: number;
  showCake?: boolean;
}

function drawLid(ctx: Ctx, box: BoxState, cake: CakeState, L: Layout, o: BoxRenderOpts, withHole: boolean) {
  const lidPts = boxOutline(box.shape).map((p) => ({ x: p.x * 1.03, y: p.y * 1.03 }));
  const top = lidPts.map((p) => proj(L, p.x, p.y));
  const depth = LID_DEPTH * L.k * L.sideF;
  const m0 = new DOMMatrix().translate(L.cx, L.cy).scale(L.k, L.k * L.tilt).scale(0.5);
  const side = box.lid;
  // band
  if (depth > 0.5) {
    const band = extrusionPath(top, depth);
    const b = bbox(top);
    ctx.save(); ctx.clip(band);
    ctx.fillStyle = makePattern(ctx, side, new DOMMatrix().translate(L.cx, L.cy).scale(L.k * 0.5));
    ctx.fillRect(b.x0 - 4, b.y0 - 4, b.w + 8, b.h + depth + 8);
    cylinderShade(ctx, b.x0, b.x1, b.y0, b.y1 + depth, 1);
    const lg = ctx.createLinearGradient(0, b.y1, 0, b.y1 + depth);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(60,20,15,0.12)');
    ctx.fillStyle = lg; ctx.fillRect(b.x0, b.y0, b.w, b.h + depth);
    ctx.restore();
  }
  const lp = new Path2D(); pathFrom(lp, top);
  const win = withHole ? windowPath(box.window) : null;
  const winScreen = win?.map((p) => proj(L, p.x, p.y));
  const topPath = new Path2D(); pathFrom(topPath, top);
  if (winScreen) pathFrom(topPath, winScreen.slice().reverse());
  ctx.save();
  ctx.fillStyle = makePattern(ctx, box.lid, m0);
  ctx.fill(topPath, 'evenodd');
  ctx.clip(topPath, 'evenodd');
  const b = bbox(top);
  const rg = ctx.createRadialGradient(b.x0 + b.w * 0.3, b.y0 + b.h * 0.25, 0, L.cx, L.cy, Math.max(b.w, b.h) * 0.75);
  rg.addColorStop(0, 'rgba(255,255,255,0.3)'); rg.addColorStop(0.7, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(60,20,15,0.12)');
  ctx.fillStyle = rg; ctx.fillRect(b.x0, b.y0, b.w, b.h);
  // ribbons on lid top
  if (box.ribbon !== 'none') {
    const rw = 36;
    const dirs = box.ribbon === 'cross' ? [0, 90] : box.ribbon === 'single' ? [90] : [45, -45];
    for (const d of dirs) {
      ctx.save();
      ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix().translate(L.cx, L.cy).scale(L.k, L.k * L.tilt).rotate(d)));
      ctx.fillStyle = satin(ctx, 0, -rw / 2, 0, rw / 2, box.ribbonColor);
      ctx.fillRect(-400, -rw / 2, 800, rw);
      ctx.strokeStyle = rgba(darken(box.ribbonColor, 0.4), 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-400, -rw / 2 + 3); ctx.lineTo(400, -rw / 2 + 3); ctx.moveTo(-400, rw / 2 - 3); ctx.lineTo(400, rw / 2 - 3); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.stroke(lp);
  if (winScreen) {
    const wp = new Path2D(); pathFrom(wp, winScreen);
    const wb = bbox(winScreen);
    const g = ctx.createLinearGradient(wb.x0, wb.y0, wb.x1, wb.y1);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.3, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(0.6, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = g; ctx.fill(wp);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke(wp);
    ctx.strokeStyle = 'rgba(60,20,15,0.25)'; ctx.lineWidth = 1; ctx.stroke(wp);
  }
  // ribbon down the lid band
  if (box.ribbon !== 'none' && depth > 0.5) {
    const dirs = box.ribbon === 'cross' ? [{ x: 0, y: 1 }] : box.ribbon === 'single' ? [{ x: 0, y: 1 }] : [{ x: 0.707, y: 0.707 }, { x: -0.707, y: 0.707 }];
    for (const d of dirs) {
      const f0 = frontPointAlong(lidPts, d); const fp = proj(L, f0.x, f0.y);
      const w = 36 * L.k;
      ctx.fillStyle = satin(ctx, fp.x - w / 2, 0, fp.x + w / 2, 0, box.ribbonColor);
      ctx.fillRect(fp.x - w / 2, fp.y - 1, w, depth + 1);
    }
  }
  drawItems(ctx, box.items, L, cake.photos, o.t || 0);
  if (box.bow) {
    const p = proj(L, 0, 0);
    ctx.save(); ctx.translate(p.x, p.y - 8 * L.k);
    satinBow(ctx, 170 * L.k, box.ribbonColor);
    ctx.restore();
  }
}

export function renderBox(ctx: Ctx, box: BoxState, cake: CakeState, L: Layout, o: BoxRenderOpts = {}) {
  const base = boxOutline(box.shape);
  const Hb = boxHeight(cake);
  const Hpx = Hb * L.k * L.sideF;
  const top = base.map((p) => proj(L, p.x, p.y));
  const b = bbox(top);
  const side = box.sideMatch ? box.lid : box.side;
  const lid = o.lid;
  const isOpen = !!lid;
  const cakeH = cakeHeight(cake.layers);
  const cakeL: Layout = { ...L, cy: L.cy + (Hb - cakeH - 6) * L.k * L.sideF - (o.cakeRise || 0) };

  // ground shadow
  const g = ctx.createRadialGradient(L.cx, b.y1 + Hpx, 0, L.cx, b.y1 + Hpx, b.w * 0.75);
  g.addColorStop(0, 'rgba(60,20,15,0.3)'); g.addColorStop(1, 'rgba(60,20,15,0)');
  ctx.save(); ctx.translate(L.cx, b.y1 + Hpx - 10); ctx.scale(1, 0.3); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.w * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  const lidAt = (behind: boolean) => {
    if (!lid || lid.behind !== behind || lid.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = lid.alpha;
    ctx.translate(L.cx + lid.dx, L.cy + lid.dy); ctx.scale(lid.scale, lid.scale); ctx.translate(-L.cx, -L.cy);
    drawLid(ctx, box, cake, L, o, true);
    ctx.restore();
  };
  lidAt(true);

  // body
  const body = extrusionPath(top, Hpx);
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = makePattern(ctx, side, new DOMMatrix().translate(L.cx, L.cy).scale(L.k * 0.5));
  ctx.fillRect(b.x0 - 4, b.y0 - 4, b.w + 8, b.h + Hpx + 8);
  cylinderShade(ctx, b.x0, b.x1, b.y0, b.y1 + Hpx, 1);
  const bg2 = ctx.createLinearGradient(0, b.y1, 0, b.y1 + Hpx);
  bg2.addColorStop(0, 'rgba(60,20,15,0)'); bg2.addColorStop(1, 'rgba(60,20,15,0.16)');
  ctx.fillStyle = bg2; ctx.fillRect(b.x0, b.y0, b.w, b.h + Hpx);
  // fold creases at corners for square/rect
  if (box.shape === 'square' || box.shape === 'rect') {
    const nrm = normals(base);
    let lastSign = 0;
    base.forEach((p, i) => {
      const s = Math.sign(Math.round(nrm[i].x * 3));
      if (nrm[i].y > 0.2 && s !== lastSign && lastSign !== 0) {
        const q = proj(L, p.x, p.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y + Hpx); ctx.stroke();
      }
      lastSign = s;
    });
  }
  ctx.restore();

  // side ribbon
  if (box.ribbon !== 'none') {
    const dirs = box.ribbon === 'diagonal' ? [{ x: 0.707, y: 0.707 }, { x: -0.707, y: 0.707 }] : [{ x: 0, y: 1 }];
    for (const d of dirs) {
      const fp0 = frontPointAlong(base, d); const fp = proj(L, fp0.x, fp0.y);
      const w = 36 * L.k;
      ctx.save(); ctx.clip(body);
      ctx.fillStyle = satin(ctx, fp.x - w / 2, 0, fp.x + w / 2, 0, box.ribbonColor);
      ctx.fillRect(fp.x - w / 2, fp.y - 2, w, Hpx + 4);
      ctx.restore();
    }
  }

  // side text
  if (box.sideText) {
    const fp0 = frontPointAlong(base, { x: 0, y: 1 }); const fp = proj(L, fp0.x, fp0.y);
    const fs = 34 * L.k;
    ctx.save();
    ctx.font = `${fs}px Pacifico, cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ty = fp.y + (LID_DEPTH * L.k * L.sideF) + (Hpx - LID_DEPTH * L.k * L.sideF) * 0.5;
    const tw = ctx.measureText(box.sideText).width;
    ctx.fillStyle = 'rgba(255,250,240,0.92)';
    ctx.beginPath(); ctx.roundRect(fp.x - tw / 2 - fs * 0.5, ty - fs * 0.7, tw + fs, fs * 1.4, fs * 0.7); ctx.fill();
    ctx.strokeStyle = box.sideTextColor; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.roundRect(fp.x - tw / 2 - fs * 0.38, ty - fs * 0.58, tw + fs * 0.76, fs * 1.16, fs * 0.58); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = box.sideTextColor; ctx.fillText(box.sideText, fp.x, ty + fs * 0.05);
    ctx.restore();
  }

  if (isOpen) {
    // interior
    const tp = new Path2D(); pathFrom(tp, top);
    ctx.save(); ctx.clip(tp);
    const ig = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    ig.addColorStop(0, '#fbf3ea'); ig.addColorStop(0.6, '#eadbc8'); ig.addColorStop(1, '#bfa58c');
    ctx.fillStyle = ig; ctx.fillRect(b.x0, b.y0, b.w, b.h);
    ctx.restore();
    if (o.showCake !== false) {
      const env = lowerEnvelope(top);
      const clip = new Path2D();
      clip.moveTo(env[0].x - 2, -10000);
      env.forEach((p) => clip.lineTo(p.x, p.y));
      clip.lineTo(env[env.length - 1].x + 2, -10000);
      clip.closePath();
      // also allow the full area above the box
      ctx.save(); ctx.clip(clip);
      renderCake(ctx, { ...cake, stand: 'none' }, cakeL, { t: o.t });
      ctx.restore();
    }
    ctx.strokeStyle = lighten(side.bg, 0.4); ctx.lineWidth = 3 * L.k + 1; ctx.stroke(tp);
    ctx.strokeStyle = 'rgba(60,20,15,0.2)'; ctx.lineWidth = 1; ctx.stroke(tp);
  } else {
    // cake visible through the lid window
    const win = windowPath(box.window);
    if (win && o.showCake !== false) {
      const ws = win.map((p) => proj(L, p.x, p.y));
      const wp = new Path2D(); pathFrom(wp, ws);
      ctx.save(); ctx.clip(wp);
      ctx.fillStyle = '#eadbc8'; ctx.fillRect(b.x0, b.y0 - 400, b.w, b.h + 800);
      renderCake(ctx, { ...cake, stand: 'none' }, cakeL, { t: o.t });
      const sg = ctx.createLinearGradient(0, b.y0, 0, b.y1);
      sg.addColorStop(0, 'rgba(60,20,15,0.25)'); sg.addColorStop(0.5, 'rgba(60,20,15,0.05)'); sg.addColorStop(1, 'rgba(60,20,15,0.2)');
      ctx.fillStyle = sg; ctx.fillRect(b.x0, b.y0, b.w, b.h);
      ctx.restore();
    }
    drawLid(ctx, box, cake, L, o, true);
  }
  lidAt(false);
}
