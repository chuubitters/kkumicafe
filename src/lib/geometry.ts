export interface Pt { x: number; y: number }

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function chaikin(pts: Pt[], iter: number): Pt[] {
  let p = pts;
  for (let k = 0; k < iter; k++) {
    const out: Pt[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    p = out;
  }
  return p;
}

export function resample(pts: Pt[], n: number, closed = true): Pt[] {
  const segs: number[] = [];
  let total = 0;
  const m = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push(d); total += d;
  }
  if (total === 0) return pts.slice(0, 1);
  const out: Pt[] = [];
  const step = total / (closed ? n : Math.max(1, n - 1));
  let si = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
    const a = pts[si], b = pts[(si + 1) % pts.length];
    const t = segs[si] ? Math.min(1, (target - acc) / segs[si]) : 0;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** Resample an open polyline at fixed spacing (in its own units). */
export function spaceAlong(pts: Pt[], spacing: number): Pt[] {
  if (pts.length < 2) return pts.slice();
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const n = Math.max(2, Math.round(total / Math.max(0.5, spacing)) + 1);
  return resample(pts, n, false);
}

export type ShapeName = 'round' | 'square' | 'heart' | 'oval' | 'star' | 'circle' | 'scallop' | 'rect';

const cache = new Map<string, Pt[]>();

/** Outline of a shape in plane units, centred at 0, oriented with positive signed area (screen-clockwise). */
export function outline(shape: ShapeName, r: number, n = 240, aspect = 1): Pt[] {
  const key = `${shape}|${r}|${n}|${aspect}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let raw: Pt[] = [];
  const N = 360;
  if (shape === 'round' || shape === 'circle') {
    for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; raw.push({ x: Math.cos(t) * r, y: Math.sin(t) * r }); }
  } else if (shape === 'oval') {
    for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; raw.push({ x: Math.cos(t) * r * 1.2, y: Math.sin(t) * r * 0.86 }); }
  } else if (shape === 'square' || shape === 'rect') {
    const ax = shape === 'rect' ? r * 1.22 : r * 0.9, ay = shape === 'rect' ? r * 0.88 : r * 0.9;
    const e = 2 / 9;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      raw.push({ x: Math.sign(c) * Math.pow(Math.abs(c), e) * ax, y: Math.sign(s) * Math.pow(Math.abs(s), e) * ay });
    }
  } else if (shape === 'heart') {
    const s = r / 15.2;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      raw.push({ x: x * s, y: (y - 2.5) * s });
    }
  } else if (shape === 'star') {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const t = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? r * 1.12 : r * 0.62;
      pts.push({ x: Math.cos(t) * rr, y: Math.sin(t) * rr + r * 0.06 });
    }
    raw = chaikin(pts, 4);
  } else if (shape === 'scallop') {
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const rr = r * (0.88 + 0.12 * Math.abs(Math.cos(t * 6)));
      raw.push({ x: Math.cos(t) * rr, y: Math.sin(t) * rr });
    }
  }
  if (aspect !== 1) raw = raw.map((p) => ({ x: p.x * aspect, y: p.y }));
  // orientation
  let a = 0;
  for (let i = 0; i < raw.length; i++) { const p = raw[i], q = raw[(i + 1) % raw.length]; a += p.x * q.y - q.x * p.y; }
  if (a < 0) raw.reverse();
  const out = resample(raw, n, true);
  cache.set(key, out);
  return out;
}

export function normals(pts: Pt[]): Pt[] {
  return pts.map((_, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b.x - a.x, ty = b.y - a.y, d = Math.hypot(tx, ty) || 1;
    return { x: ty / d, y: -tx / d };
  });
}

export function pathFrom(ctx: CanvasRenderingContext2D | Path2D, pts: Pt[]) {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function bbox(pts: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Rotate a closed outline so it starts at its back-most (min y) point. */
export function startAtBack<T extends Pt>(pts: T[]): number {
  let mi = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].y < pts[mi].y) mi = i;
  return mi;
}

/** Lower envelope (max y per x column) for clipping "above the front rim". */
export function lowerEnvelope(pts: Pt[], cols = 120): Pt[] {
  const b = bbox(pts);
  const out: Pt[] = [];
  for (let c = 0; c <= cols; c++) {
    const x = b.x0 + (b.w * c) / cols;
    let best = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p.x - x) * (q.x - x) <= 0 && p.x !== q.x) {
        const t = (x - p.x) / (q.x - p.x);
        best = Math.max(best, p.y + (q.y - p.y) * t);
      }
    }
    if (best > -Infinity) out.push({ x, y: best });
  }
  return out;
}

export function pointInPoly(x: number, y: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
