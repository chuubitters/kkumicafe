import { darken, lighten, mix, rgba } from '../lib/color';
import { Pt, bbox, lowerEnvelope, normals, outline, pathFrom, rng, startAtBack } from '../lib/geometry';
import type { CakeState, Item, Flavor, Filling } from '../types';
import { ASSETS, drawAsset, textWidth } from './assets';
import { creamDab, drawBorder, drawPiping } from './cream';

type Ctx = CanvasRenderingContext2D;

export const CAKE_R = 200;
export const cakeHeight = (layers: number) => 70 + layers * 45;
export const SIZE_F = { mini: 0.78, regular: 0.92, large: 1.06 } as const;

export interface Layout { cx: number; cy: number; k: number; tilt: number; sideF: number }

export const proj = (L: Layout, x: number, y: number): Pt => ({ x: L.cx + x * L.k, y: L.cy + y * L.k * L.tilt });
export const unproj = (L: Layout, sx: number, sy: number): Pt => ({ x: (sx - L.cx) / L.k, y: (sy - L.cy) / (L.k * L.tilt) });

export function standDepth(stand: CakeState['stand']) {
  return stand === 'pedestal' ? 120 : stand === 'plate' ? 14 : stand === 'board' ? 10 : 0;
}

export function cakeLayout(cake: CakeState, W: number, H: number, zoom = 1, tilt = 0.55): Layout {
  const k = ((Math.min(W, H) * 0.34) / CAKE_R) * SIZE_F[cake.size] * zoom;
  const sideF = Math.sqrt(Math.max(0, 1 - tilt * tilt));
  const hpx = (cakeHeight(cake.layers) + standDepth(cake.stand)) * k * sideF;
  const cy = H * 0.55 - hpx / 2 + CAKE_R * k * tilt * 0.1;
  return { cx: W / 2, cy, k, tilt, sideF };
}

export const FLAVORS: Record<Flavor, { label: string; sponge: string; crumb: string }> = {
  vanilla: { label: 'Vanilla', sponge: '#f2d9a0', crumb: '#e2c27e' },
  chocolate: { label: 'Chocolate', sponge: '#5a3426', crumb: '#3e2216' },
  strawberry: { label: 'Strawberry', sponge: '#f5b4c2', crumb: '#e48ea3' },
  redvelvet: { label: 'Red Velvet', sponge: '#a3243b', crumb: '#7c1528' },
  matcha: { label: 'Matcha', sponge: '#a4c46e', crumb: '#7f9e4c' },
  rainbow: { label: 'Rainbow', sponge: '#f7a8c4', crumb: '#c9a0dc' },
};
export const FILLINGS: Record<Filling, { label: string; color: string; speck?: string }> = {
  strawberry: { label: 'Strawberry Jam', color: '#d6304a', speck: '#8e0f22' },
  ganache: { label: 'Chocolate Ganache', color: '#3a1f14' },
  vanilla: { label: 'Vanilla Cream', color: '#fff3d6' },
  blueberry: { label: 'Blueberry Jam', color: '#4b3a7a', speck: '#2a1f4a' },
  caramel: { label: 'Caramel', color: '#c98a3a' },
  oreo: { label: 'Oreo Cream', color: '#efeae2', speck: '#2a1a14' },
};
const RAINBOW_LAYERS = ['#f7a8c4', '#fbd38d', '#fdf29a', '#b6e3a8', '#a8d4f4', '#cdb4ec'];

function upperEnvelope(pts: Pt[], cols = 160): Pt[] {
  return lowerEnvelope(pts.map((p) => ({ x: p.x, y: -p.y })), cols).map((p) => ({ x: p.x, y: -p.y }));
}

/** Silhouette of a vertically-extruded outline (screen pts at top, depth px). */
export function extrusionPath(top: Pt[], depth: number): Path2D {
  const up = upperEnvelope(top);
  const lo = lowerEnvelope(top).map((p) => ({ x: p.x, y: p.y + depth }));
  const p = new Path2D();
  up.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
  for (let i = lo.length - 1; i >= 0; i--) p.lineTo(lo[i].x, lo[i].y);
  p.closePath();
  return p;
}

export function cylinderShade(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, strength = 1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, `rgba(60,20,15,${0.32 * strength})`);
  g.addColorStop(0.18, `rgba(255,255,255,${0.12 * strength})`);
  g.addColorStop(0.32, `rgba(255,255,255,${0.2 * strength})`);
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.88, `rgba(60,20,15,${0.18 * strength})`);
  g.addColorStop(1, `rgba(60,20,15,${0.4 * strength})`);
  ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0, x1 - x0 + 4, y1 - y0);
}

function drawStand(ctx: Ctx, cake: CakeState, L: Layout, Hpx: number) {
  if (cake.stand === 'none') {
    const b = bbox(outline(cake.shape, CAKE_R));
    const g = ctx.createRadialGradient(L.cx, L.cy + Hpx + b.y1 * L.k * L.tilt * 0.6, 0, L.cx, L.cy + Hpx, b.w * L.k * 0.6);
    g.addColorStop(0, 'rgba(60,20,15,0.28)'); g.addColorStop(1, 'rgba(60,20,15,0)');
    ctx.save(); ctx.fillStyle = g; ctx.translate(L.cx, L.cy + Hpx + 6); ctx.scale(1, Math.max(0.15, L.tilt)); ctx.translate(-L.cx, -(L.cy + Hpx + 6));
    ctx.beginPath(); ctx.arc(L.cx, L.cy + Hpx + 6, b.w * L.k * 0.62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  const b = bbox(outline(cake.shape, CAKE_R));
  const R = Math.max(b.w, b.h) * 0.5 * 1.18;
  const topY = L.cy + Hpx;
  const pr = (rr: number, dy: number) => outline('round', rr, 160).map((p) => ({ x: L.cx + p.x * L.k, y: topY + dy + p.y * L.k * L.tilt }));
  const sh = (rr: number, dy: number, a: number) => {
    const g = ctx.createRadialGradient(L.cx, topY + dy, 0, L.cx, topY + dy, rr * L.k * 1.1);
    g.addColorStop(0, `rgba(60,20,15,${a})`); g.addColorStop(1, 'rgba(60,20,15,0)');
    ctx.save(); ctx.translate(L.cx, topY + dy); ctx.scale(1, Math.max(0.12, L.tilt)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rr * L.k * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  if (cake.stand === 'board') {
    const th = 10 * L.k * L.sideF;
    sh(R, th + 8, 0.3);
    const top = pr(R, 0);
    const path = extrusionPath(top, th);
    ctx.fillStyle = '#b8892d'; ctx.fill(path);
    const p = new Path2D(); pathFrom(p, top);
    const g = ctx.createLinearGradient(L.cx - R * L.k, 0, L.cx + R * L.k, 0);
    g.addColorStop(0, '#c99a3a'); g.addColorStop(0.3, '#f7dc8a'); g.addColorStop(0.55, '#d9ab42'); g.addColorStop(0.8, '#fbe7a1'); g.addColorStop(1, '#b8892d');
    ctx.fillStyle = g; ctx.fill(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke(p);
  } else {
    const plateR = R * 1.05;
    if (cake.stand === 'pedestal') {
      const stemTop = topY + 14 * L.k * L.sideF, foot = topY + 110 * L.k * L.sideF;
      sh(plateR * 0.75, 120 * L.k * L.sideF, 0.35);
      const footPts = pr(plateR * 0.55, 100 * L.k * L.sideF);
      const fp = extrusionPath(footPts, 10 * L.k * L.sideF);
      ctx.fillStyle = '#e98aa3'; ctx.fill(fp);
      const fpTop = new Path2D(); pathFrom(fpTop, footPts);
      ctx.fillStyle = '#f6c9d3'; ctx.fill(fpTop);
      const sw = plateR * 0.12 * L.k;
      const sg = ctx.createLinearGradient(L.cx - sw, 0, L.cx + sw, 0);
      sg.addColorStop(0, '#d5728e'); sg.addColorStop(0.35, '#fbe0e8'); sg.addColorStop(1, '#c9607d');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(L.cx - sw * 0.6, stemTop); ctx.bezierCurveTo(L.cx - sw * 0.3, (stemTop + foot) / 2, L.cx - sw * 1.2, foot - 10, L.cx - sw * 1.8, foot);
      ctx.lineTo(L.cx + sw * 1.8, foot); ctx.bezierCurveTo(L.cx + sw * 1.2, foot - 10, L.cx + sw * 0.3, (stemTop + foot) / 2, L.cx + sw * 0.6, stemTop); ctx.fill();
    } else sh(plateR, 20 * L.k * L.sideF, 0.3);
    const rimPts = outline('scallop', plateR, 200).map((p) => ({ x: L.cx + p.x * L.k, y: topY + p.y * L.k * L.tilt }));
    const ex = extrusionPath(rimPts, 12 * L.k * L.sideF);
    const base = cake.stand === 'pedestal' ? '#f6c9d3' : '#fbf7f2';
    ctx.fillStyle = darken(base, 0.18); ctx.fill(ex);
    const rp = new Path2D(); pathFrom(rp, rimPts);
    const g = ctx.createRadialGradient(L.cx - plateR * L.k * 0.3, topY - plateR * L.k * L.tilt * 0.5, 0, L.cx, topY, plateR * L.k);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, base); g.addColorStop(1, darken(base, 0.1));
    ctx.fillStyle = g; ctx.fill(rp);
    ctx.strokeStyle = cake.stand === 'pedestal' ? '#e98aa3' : '#d8b25a'; ctx.lineWidth = Math.max(1, 2 * L.k);
    const inner = outline('round', plateR * 0.86, 160).map((p) => ({ x: L.cx + p.x * L.k, y: topY + p.y * L.k * L.tilt }));
    ctx.beginPath(); pathFrom(ctx, inner); ctx.stroke();
  }
}

function frostColors(cake: CakeState) {
  const f = cake.frosting;
  const top = f.drip ? f.dripColor : f.color;
  return { top, side: f.color, side2: f.gradient ? f.color2 : f.color };
}

function sideTexture(ctx: Ctx, cake: CakeState, front: { p: Pt; n: Pt }[], depth: number, L: Layout) {
  const f = cake.frosting;
  const base = f.color;
  if (f.texture === 'combed') {
    front.forEach(({ p, n }, i) => {
      if (i % 3) return;
      ctx.strokeStyle = rgba(darken(base, 0.3), 0.25 * Math.max(0.2, n.y)); ctx.lineWidth = 1.6 * L.k;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 3); ctx.lineTo(p.x, p.y + depth - 2); ctx.stroke();
      ctx.strokeStyle = rgba(lighten(base, 0.6), 0.35 * Math.max(0.2, n.y)); ctx.lineWidth = 1 * L.k;
      ctx.beginPath(); ctx.moveTo(p.x + 2 * L.k, p.y + 3); ctx.lineTo(p.x + 2 * L.k, p.y + depth - 2); ctx.stroke();
    });
  } else if (f.texture === 'rustic' || f.texture === 'swirl') {
    const R = rng(11);
    const rows = Math.round(depth / (12 * L.k));
    for (let r = 0; r < rows; r++) {
      const y0 = (r + 0.5) * (depth / rows);
      for (let j = 0; j < front.length; j += 8) {
        const p = front[j].p;
        const len = (20 + R() * 40) * L.k;
        ctx.strokeStyle = rgba(R() > 0.5 ? lighten(base, 0.6) : darken(base, 0.25), f.texture === 'rustic' ? 0.28 : 0.16);
        ctx.lineWidth = (f.texture === 'rustic' ? 3 : 2) * L.k;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + y0); ctx.quadraticCurveTo(p.x + len / 2, p.y + y0 + (R() - 0.5) * 8 * L.k, p.x + len, p.y + y0 + (R() - 0.5) * 4); ctx.stroke();
      }
    }
  }
  if (f.type === 'whipped') {
    const R = rng(5);
    for (let i = 0; i < 160; i++) {
      const j = Math.floor(R() * front.length), p = front[j].p;
      ctx.fillStyle = rgba('#ffffff', 0.22); ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 10, p.y + R() * depth, (2 + R() * 4) * L.k, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (f.type === 'strawberry') {
    const R = rng(9);
    for (let i = 0; i < 220; i++) {
      const j = Math.floor(R() * front.length), p = front[j].p;
      ctx.fillStyle = rgba('#c2185b', 0.35); ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 6, p.y + R() * depth, 0.9 * L.k, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function topTexture(ctx: Ctx, cake: CakeState, L: Layout, col: string) {
  const f = cake.frosting;
  const R = rng(3);
  if (f.drip) {
    // glossy ganache: specular sweep
    const g = ctx.createLinearGradient(L.cx - CAKE_R * L.k, L.cy - CAKE_R * L.k * L.tilt, L.cx + CAKE_R * L.k, L.cy + CAKE_R * L.k * L.tilt);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(L.cx - 300 * L.k, L.cy - 300 * L.k, 600 * L.k, 600 * L.k);
    return;
  }
  if (f.texture === 'swirl') {
    for (let i = 0; i < 14; i++) {
      const rr = (20 + R() * 170) * L.k, a0 = R() * Math.PI * 2;
      ctx.strokeStyle = rgba(i % 2 ? lighten(col, 0.6) : darken(col, 0.18), 0.3); ctx.lineWidth = (2 + R() * 3) * L.k;
      ctx.save(); ctx.translate(L.cx + (R() - 0.5) * 60 * L.k, L.cy); ctx.scale(1, L.tilt);
      ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + 1 + R() * 2); ctx.stroke(); ctx.restore();
    }
  } else if (f.texture === 'combed') {
    for (let rr = 30; rr < 260; rr += 18) {
      ctx.strokeStyle = rgba(darken(col, 0.25), 0.18); ctx.lineWidth = 1.8 * L.k;
      ctx.save(); ctx.translate(L.cx, L.cy); ctx.scale(1, L.tilt); ctx.beginPath(); ctx.arc(0, 0, rr * L.k, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(lighten(col, 0.6), 0.25); ctx.beginPath(); ctx.arc(0, -2, rr * L.k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  } else if (f.texture === 'rustic') {
    for (let i = 0; i < 40; i++) {
      const x = L.cx + (R() - 0.5) * 380 * L.k, y = L.cy + (R() - 0.5) * 380 * L.k * L.tilt;
      ctx.strokeStyle = rgba(R() > 0.5 ? lighten(col, 0.6) : darken(col, 0.2), 0.25); ctx.lineWidth = 3 * L.k;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20 * L.k, y - 6 * L.k * L.tilt, x + 50 * L.k, y + 2); ctx.stroke();
    }
  }
  if (f.type === 'whipped') {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = rgba('#ffffff', 0.18);
      ctx.beginPath(); ctx.ellipse(L.cx + (R() - 0.5) * 380 * L.k, L.cy + (R() - 0.5) * 380 * L.k * L.tilt, (3 + R() * 6) * L.k, (3 + R() * 6) * L.k * L.tilt, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (f.type === 'strawberry') {
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = rgba('#c2185b', 0.3);
      ctx.beginPath(); ctx.arc(L.cx + (R() - 0.5) * 400 * L.k, L.cy + (R() - 0.5) * 400 * L.k * L.tilt, 0.9 * L.k, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export interface RenderOpts { t?: number; selectedId?: string | null; hideItems?: boolean }

/** Area of the cake top where sprinkles may land (slightly inset from the edge). */
export const sprinkleClip = (shape: CakeState['shape']) => outline(shape, CAKE_R * 0.93, 160);

export function itemSize(item: Item, k: number) {
  if (item.kind === 'piping') return (item.size || 10) * k;
  if (item.kind === 'text') return (item.fontSize || 40) * item.scale * k;
  return (ASSETS[item.kind]?.base || 40) * item.scale * k;
}

export function itemMatrix(item: Item, L: Layout) {
  const p = proj(L, item.x, item.y);
  const flat = item.kind !== 'piping' && ASSETS[item.kind]?.flat;
  let m = new DOMMatrix().translate(p.x, p.y);
  if (flat) m = m.scale(1, L.tilt);
  if (item.kind !== 'sprinkles') m = m.rotate((item.rot * 180) / Math.PI);
  return m;
}

const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d')! : (null as unknown as Ctx);

export function itemBox(item: Item, L: Layout) {
  const s = itemSize(item, L.k);
  if (item.kind === 'text') { const t = textWidth(measureCtx, item, s); return { w: t.w, h: t.h }; }
  const m = ASSETS[item.kind as Exclude<Item['kind'], 'piping'>];
  return { w: s * (m?.w || 1), h: s * (m?.h || 1) };
}

export function drawItems(ctx: Ctx, items: Item[], L: Layout, photos: Record<string, string>, t = 0, clip?: Pt[]) {
  for (const it of items) {
    if (it.kind === 'piping') {
      const pts: Pt[] = [];
      const a = it.points || [];
      for (let i = 0; i < a.length; i += 2) pts.push(proj(L, a[i], a[i + 1]));
      drawPiping(ctx, pts, it.tip || 'round', (it.size || 10) * L.k, it.color || '#ffffff', it.seed);
      continue;
    }
    const s = itemSize(it, L.k);
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(itemMatrix(it, L)));
    drawAsset(ctx, it, s, { k: L.k, tilt: L.tilt, t, photos, clip });
    ctx.restore();
  }
}

export function renderCake(ctx: Ctx, cake: CakeState, L: Layout, o: RenderOpts = {}) {
  const t = o.t || 0;
  const H = cakeHeight(cake.layers);
  const Hpx = H * L.k * L.sideF;
  const base = outline(cake.shape, CAKE_R, 240);
  const nrm = normals(base);
  const start = startAtBack(base);
  const ordered = base.map((_, i) => base[(start + i) % base.length]);
  const orderedN = ordered.map((_, i) => nrm[(start + i) % base.length]);
  const top = base.map((p) => proj(L, p.x, p.y));
  const topOrdered = ordered.map((p) => proj(L, p.x, p.y));
  const cols = frostColors(cake);

  drawStand(ctx, cake, L, Hpx);

  // body
  if (Hpx > 0.5) {
    const body = extrusionPath(top, Hpx);
    const b = bbox(top);
    ctx.save(); ctx.clip(body);
    const vg = ctx.createLinearGradient(0, b.y0, 0, b.y1 + Hpx);
    vg.addColorStop(0, cols.side); vg.addColorStop(1, cols.side2);
    ctx.fillStyle = vg; ctx.fillRect(b.x0 - 5, b.y0 - 5, b.w + 10, b.h + Hpx + 10);
    const front = orderedN.map((n, i) => ({ p: topOrdered[i], n })).filter((q) => q.n.y > -0.05);
    sideTexture(ctx, cake, front, Hpx, L);
    if (cake.frosting.type === 'chocolate') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(b.x0 + b.w * 0.2, b.y0, b.w * 0.08, b.h + Hpx);
    }
    cylinderShade(ctx, b.x0, b.x1, b.y0, b.y1 + Hpx, 0.9);
    const bot = ctx.createLinearGradient(0, b.y1 + Hpx - 30 * L.k, 0, b.y1 + Hpx);
    bot.addColorStop(0, 'rgba(60,20,15,0)'); bot.addColorStop(1, 'rgba(60,20,15,0.18)');
    ctx.fillStyle = bot; ctx.fillRect(b.x0 - 5, b.y1 + Hpx - 30 * L.k, b.w + 10, 32 * L.k);
    ctx.restore();

    const frontPts = topOrdered.map((p, i) => ({ p, n: orderedN[i] })).filter((q) => q.n.y > 0.15).map((q) => q.p);

    if (cake.borders.ribbon) {
      const band = 26 * L.k * L.sideF;
      const fb = frontPts;
      if (fb.length > 2) {
        const p = new Path2D();
        fb.forEach((q, i) => (i ? p.lineTo(q.x, q.y + Hpx - band - 4) : p.moveTo(q.x, q.y + Hpx - band - 4)));
        for (let i = fb.length - 1; i >= 0; i--) p.lineTo(fb[i].x, fb[i].y + Hpx - 4);
        p.closePath();
        const rc = cake.borders.ribbonColor;
        ctx.fillStyle = rc; ctx.fill(p);
        ctx.save(); ctx.clip(p);
        const bb = bbox(fb);
        const sg = ctx.createLinearGradient(0, bb.y1 + Hpx - band, 0, bb.y1 + Hpx);
        sg.addColorStop(0, rgba(lighten(rc, 0.6), 0.6)); sg.addColorStop(0.4, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(60,20,15,0.2)');
        ctx.fillStyle = sg; ctx.fillRect(bb.x0, bb.y0 + Hpx - band - 20, bb.w, band + 60 + bb.h);
        cylinderShade(ctx, bb.x0, bb.x1, bb.y0 - 10, bb.y1 + Hpx + 10, 0.7);
        ctx.restore();
      }
    }

    // drips
    if (cake.frosting.drip) {
      const R = rng(42);
      const dc = cake.frosting.dripColor;
      const sp = Math.max(4, Math.round(frontPts.length / 22));
      for (let i = 0; i < frontPts.length; i += sp) {
        const p = frontPts[i];
        const len = Hpx * (0.15 + R() * 0.4);
        const w = (12 + R() * 8) * L.k;
        const g = ctx.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0);
        g.addColorStop(0, darken(dc, 0.25)); g.addColorStop(0.35, lighten(dc, 0.25)); g.addColorStop(1, darken(dc, 0.3));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(p.x - w * 0.9, p.y - 2); ctx.lineTo(p.x - w / 2, p.y + len - w / 2);
        ctx.arc(p.x, p.y + len - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(p.x + w * 0.9, p.y - 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(p.x - w * 0.18, p.y + len - w * 0.6, w * 0.1, w * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = dc; ctx.lineWidth = 10 * L.k; ctx.lineJoin = 'round';
      ctx.beginPath(); frontPts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y + 2) : ctx.moveTo(q.x, q.y + 2))); ctx.stroke();
    }

    if (cake.borders.garland && frontPts.length > 4) {
      const gc = cake.borders.garlandColor;
      const nA = 7;
      const step = (frontPts.length - 1) / nA;
      for (let a = 0; a < nA; a++) {
        const i0 = Math.round(a * step), i1 = Math.round((a + 1) * step);
        const seg: Pt[] = [];
        for (let i = i0; i <= i1; i++) {
          const t2 = (i - i0) / Math.max(1, i1 - i0);
          const sag = Math.sin(t2 * Math.PI) * Hpx * 0.28;
          seg.push({ x: frontPts[i].x, y: frontPts[i].y + Hpx * 0.2 + sag });
        }
        drawPiping(ctx, seg, 'round', 5.5 * L.k, gc);
      }
      for (let a = 0; a <= nA; a++) {
        const p = frontPts[Math.min(frontPts.length - 1, Math.round(a * step))];
        creamDab(ctx, p.x, p.y + Hpx * 0.2, 9 * L.k, gc);
        // little tassel drop
        creamDab(ctx, p.x, p.y + Hpx * 0.2 + 16 * L.k, 5 * L.k, gc);
      }
    }

    if (cake.borders.bottom !== 'none') {
      const bp = frontPts.map((q) => ({ x: q.x, y: q.y + Hpx - 3 }));
      drawBorder(ctx, bp, cake.borders.bottom, 11 * L.k, cake.borders.bottomColor, false);
    }
  }

  // top face
  const tp = new Path2D(); pathFrom(tp, top);
  ctx.fillStyle = cols.top; ctx.fill(tp);
  ctx.save(); ctx.clip(tp);
  topTexture(ctx, cake, L, cols.top);
  const b = bbox(top);
  const rg = ctx.createRadialGradient(b.x0 + b.w * 0.35, b.y0 + b.h * 0.3, 0, L.cx, L.cy, Math.max(b.w, b.h) * 0.7);
  rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(0.6, 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(60,20,15,0.12)');
  ctx.fillStyle = rg; ctx.fillRect(b.x0, b.y0, b.w, b.h);
  ctx.restore();
  ctx.strokeStyle = rgba(lighten(cols.top, 0.7), 0.7); ctx.lineWidth = 2.5 * L.k; ctx.stroke(tp);

  if (cake.borders.top !== 'none') drawBorder(ctx, topOrdered, cake.borders.top, 12 * L.k, cake.borders.topColor, true);

  if (!o.hideItems) drawItems(ctx, cake.items, L, cake.photos, t, sprinkleClip(cake.shape));
}

/** Render cake into its own transparent canvas. */
export function cakeImage(cake: CakeState, size: number, tilt = 0.55, t = 0) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const L = cakeLayout(cake, size, size, 1, tilt);
  renderCake(ctx, cake, L, { t });
  return { canvas: c, L };
}

/** Cross-section slice preview of the cake's sponge & fillings. */
export function drawSlice(ctx: Ctx, cake: CakeState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const x0 = w * 0.12, x1 = w * 0.88, top = h * 0.2, bottom = h * 0.85;
  const fr = cake.frosting.color;
  const layers = cake.layers;
  const totalSponge = layers * 2; // each layer split horizontally with filling
  const fillH = (bottom - top) * 0.07;
  const spongeH = (bottom - top - fillH * (totalSponge - 1) - 10) / totalSponge;
  ctx.fillStyle = 'rgba(60,20,15,0.18)'; ctx.beginPath(); ctx.ellipse(w / 2, bottom + 6, (x1 - x0) / 2 + 8, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fr; ctx.fillRect(x0 - 6, top - 10, x1 - x0 + 12, bottom - top + 12);
  let y = top;
  for (let i = 0; i < totalSponge; i++) {
    const fl = FLAVORS[cake.flavor];
    const sc = cake.flavor === 'rainbow' ? RAINBOW_LAYERS[i % RAINBOW_LAYERS.length] : fl.sponge;
    const g = ctx.createLinearGradient(0, y, 0, y + spongeH);
    g.addColorStop(0, lighten(sc, 0.15)); g.addColorStop(1, darken(sc, 0.08));
    ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, spongeH);
    const R = rng(i + 3);
    for (let k = 0; k < 60; k++) { ctx.fillStyle = rgba(darken(sc, 0.3), 0.35); ctx.beginPath(); ctx.arc(x0 + R() * (x1 - x0), y + R() * spongeH, 0.6 + R() * 1.4, 0, Math.PI * 2); ctx.fill(); }
    y += spongeH;
    if (i < totalSponge - 1) {
      const fi = FILLINGS[cake.fillings[Math.floor(i / 2) % cake.fillings.length] || 'vanilla'];
      const isMid = i % 2 === 0;
      const c = isMid ? fi.color : mix(fr, '#ffffff', 0.2);
      ctx.fillStyle = c; ctx.fillRect(x0, y, x1 - x0, fillH);
      if (isMid && fi.speck) { const R2 = rng(i); for (let k = 0; k < 30; k++) { ctx.fillStyle = fi.speck; ctx.fillRect(x0 + R2() * (x1 - x0), y + R2() * fillH, 2, 1.5); } }
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
      y += fillH;
    }
  }
  ctx.fillStyle = lighten(fr, 0.15); ctx.beginPath(); ctx.ellipse(w / 2, top - 8, (x1 - x0) / 2 + 6, 12, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) creamDab(ctx, x0 + ((i + 0.5) * (x1 - x0)) / 6, top - 14, 8, lighten(fr, 0.3));
}
