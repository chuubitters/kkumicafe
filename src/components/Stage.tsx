import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Item, Tip } from '../types';
import { Layout, drawItems, itemBox, itemMatrix, proj, unproj } from '../render/cake';
import { onImageLoad } from '../lib/images';
import { mkItem } from '../lib/defaults';
import { play } from '../lib/sound';

export const STAGE = 1000;

export interface StageApi { clientToPlane: (x: number, y: number) => { x: number; y: number } | null; canvas: HTMLCanvasElement | null }

interface Props {
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, excludeId?: string) => Layout;
  photos?: Record<string, string>;
  redrawKey: unknown[];
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onItems: (items: Item[], mode: 'live' | 'commit') => void;
  piping?: { tip: Tip; color: string; size: number } | null;
  api?: MutableRefObject<StageApi | null>;
  interactive?: boolean;
}

type Drag =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number; pts?: number[] }
  | { kind: 'rotate'; id: string; cx: number; cy: number; a0: number; r0: number }
  | { kind: 'scale'; id: string; cx: number; cy: number; d0: number; s0: number }
  | { kind: 'pinch'; id: string; d0: number; a0: number; s0: number; r0: number }
  | { kind: 'pipe'; id: string; pts: number[] };

function handles(it: Item, L: Layout) {
  if (it.kind === 'piping') return null;
  const m = itemMatrix(it, L);
  const { w, h } = itemBox(it, L);
  const c = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
  const center = m.transformPoint(new DOMPoint(0, 0));
  const topMid = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
  const dx = topMid.x - center.x, dy = topMid.y - center.y, d = Math.hypot(dx, dy) || 1;
  const rot = { x: topMid.x + (dx / d) * 40, y: topMid.y + (dy / d) * 40 };
  return { corners: c, center, rot, scale: c[2], topMid };
}

function pipingPts(it: Item, L: Layout) {
  const a = it.points || [], out: { x: number; y: number }[] = [];
  for (let i = 0; i < a.length; i += 2) out.push(proj(L, a[i], a[i + 1]));
  return out;
}

export default function Stage({ draw, redrawKey, items, selectedId, onSelect, onItems, piping, api, interactive = true, photos = {} }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = useRef<Layout | null>(null);
  const itemsRef = useRef(items); itemsRef.current = items;
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const raf = useRef(0);
  const drawRef = useRef(draw); drawRef.current = draw;
  const selRef = useRef(selectedId); selRef.current = selectedId;
  const wrap = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(300);
  useLayoutEffect(() => {
    const w = wrap.current; if (!w) return;
    const fit = () => setSide(Math.max(200, Math.floor(Math.min(w.clientWidth, w.clientHeight))));
    fit(); const ro = new ResizeObserver(fit); ro.observe(w); return () => ro.disconnect();
  }, []);

  // Gesture fast-path: while dragging/piping, the untouched scene is cached in an
  // offscreen canvas and only the moving item is redrawn — no React re-render per move.
  const live = useRef<{ item: Item; isNew: boolean } | null>(null);
  const baseCache = useRef<HTMLCanvasElement | null>(null);
  const photosRef = useRef(photos); photosRef.current = photos;

  const drawOverlay = (ctx: CanvasRenderingContext2D, it: Item, lay: Layout) => {
    ctx.save();
    ctx.strokeStyle = '#c8203a'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    if (it.kind === 'piping') {
      const pts = pipingPts(it, lay);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      const pad = (it.size || 10) * lay.k * 1.4;
      ctx.strokeRect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2);
    } else {
      const h = handles(it, lay)!;
      ctx.beginPath(); h.corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(h.topMid.x, h.topMid.y); ctx.lineTo(h.rot.x, h.rot.y); ctx.stroke();
      const knob = (x: number, y: number, icon: 'rot' | 'scale') => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c8203a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath();
        if (icon === 'rot') { ctx.arc(x, y, 7, -0.5, Math.PI * 1.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x + 7, y - 1); ctx.lineTo(x + 1, y - 3); ctx.stroke(); }
        else { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + 6, y); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x, y + 6); ctx.stroke(); }
      };
      knob(h.rot.x, h.rot.y, 'rot'); knob(h.scale.x, h.scale.y, 'scale');
    }
    ctx.restore();
  };

  const render = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      const sc = c.width / STAGE;
      const lv = live.current;
      if (lv && baseCache.current && L.current) {
        ctx.drawImage(baseCache.current, 0, 0);
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        drawItems(ctx, [lv.item], L.current, photosRef.current, 0);
        if (!lv.isNew) drawOverlay(ctx, lv.item, L.current);
        return;
      }
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      const lay = drawRef.current(ctx, STAGE, STAGE);
      L.current = lay;
      const it = itemsRef.current.find((i) => i.id === selRef.current);
      if (it && interactive) drawOverlay(ctx, it, lay);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const startLive = (item: Item, isNew: boolean) => {
    const c = ref.current; if (!c) return;
    let b = baseCache.current;
    if (!b) b = baseCache.current = document.createElement('canvas');
    if (b.width !== c.width) { b.width = c.width; b.height = c.height; }
    const bctx = b.getContext('2d')!;
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, b.width, b.height);
    const sc = c.width / STAGE; bctx.setTransform(sc, 0, 0, sc, 0, 0);
    L.current = drawRef.current(bctx, STAGE, STAGE, isNew ? undefined : item.id);
    live.current = { item, isNew };
    render();
  };
  const commitLive = () => {
    const lv = live.current; if (!lv) return;
    live.current = null;
    if (lv.isNew) onItems([...itemsRef.current, lv.item], 'commit');
    else onItems(itemsRef.current.map((i) => (i.id === lv.item.id ? lv.item : i)), 'commit');
    render();
  };

  // keep canvas resolution matched to its displayed size
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.max(500, Math.min(1600, Math.round(c.clientWidth * dpr)));
      if (c.width !== px) { c.width = px; c.height = px; render(); }
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c);
    return () => ro.disconnect();
  }, [render]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { render(); }, [...redrawKey, items, selectedId, render]);
  useEffect(() => onImageLoad(render), [render]);

  const toLocal = (clientX: number, clientY: number) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * STAGE, y: ((clientY - r.top) / r.height) * STAGE };
  };

  useEffect(() => {
    if (!api) return;
    api.current = {
      canvas: ref.current,
      clientToPlane: (x, y) => {
        const c = ref.current; if (!c || !L.current) return null;
        const r = c.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
        const p = toLocal(x, y); return unproj(L.current, p.x, p.y);
      },
    };
  });

  const hit = (x: number, y: number): Item | null => {
    const lay = L.current; if (!lay) return null;
    const list = itemsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      if (it.kind === 'piping') {
        const r = (it.size || 10) * lay.k + 8;
        if (pipingPts(it, lay).some((p) => Math.hypot(p.x - x, p.y - y) < r)) return it;
        continue;
      }
      const m = itemMatrix(it, lay).inverse();
      const q = m.transformPoint(new DOMPoint(x, y));
      const { w, h } = itemBox(it, lay);
      if (Math.abs(q.x) <= w / 2 + 6 && Math.abs(q.y) <= h / 2 + 6) return it;
    }
    return null;
  };

  const update = (_id: string, fn: (it: Item) => Item) => { if (!live.current) return; live.current.item = fn(live.current.item); render(); };

  const onDown = (e: React.PointerEvent) => {
    if (!interactive || !L.current) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    const lay = L.current;

    if (pointers.current.size === 2 && selRef.current) {
      const it = itemsRef.current.find((i) => i.id === selRef.current);
      const [a, b] = [...pointers.current.values()];
      if (it && it.kind !== 'piping') {
        const cur = live.current && !live.current.isNew && live.current.item.id === it.id ? live.current.item : it;
        if (live.current?.isNew || (live.current && live.current.item.id !== it.id)) live.current = null; // drop a stroke started by the 1st finger
        drag.current = { kind: 'pinch', id: it.id, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: cur.scale, r0: cur.rot };
        if (!live.current) startLive(cur, false);
      }
      return;
    }
    if (pointers.current.size > 1) return;

    if (piping) {
      const q = unproj(lay, p.x, p.y);
      const it = mkItem('piping', 0, 0, { points: [q.x, q.y], tip: piping.tip, color: piping.color, size: piping.size });
      drag.current = { kind: 'pipe', id: it.id, pts: [q.x, q.y] };
      startLive(it, true);
      onSelect(null);
      return;
    }
    const sel = itemsRef.current.find((i) => i.id === selRef.current);
    if (sel && sel.kind !== 'piping') {
      const h = handles(sel, lay)!;
      if (Math.hypot(p.x - h.rot.x, p.y - h.rot.y) < 22) {
        startLive(sel, false); drag.current = { kind: 'rotate', id: sel.id, cx: h.center.x, cy: h.center.y, a0: Math.atan2(p.y - h.center.y, p.x - h.center.x), r0: sel.rot }; return;
      }
      if (Math.hypot(p.x - h.scale.x, p.y - h.scale.y) < 22) {
        startLive(sel, false); drag.current = { kind: 'scale', id: sel.id, cx: h.center.x, cy: h.center.y, d0: Math.hypot(p.x - h.center.x, p.y - h.center.y), s0: sel.scale }; return;
      }
    }
    const it = hit(p.x, p.y);
    if (it) {
      onSelect(it.id);
      selRef.current = it.id;
      startLive(it, false);
      drag.current = { kind: 'move', id: it.id, sx: p.x, sy: p.y, ox: it.x, oy: it.y, pts: it.points?.slice() };
    } else onSelect(null);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !L.current) return;
    const p = toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    const d = drag.current; if (!d) return;
    const lay = L.current;
    if (d.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      update(d.id, (it) => ({ ...it, scale: Math.max(0.15, Math.min(5, d.s0 * (dist / d.d0))), rot: d.r0 + (ang - d.a0) }));
    } else if (d.kind === 'pipe') {
      const q = unproj(lay, p.x, p.y);
      const lx = d.pts[d.pts.length - 2], ly = d.pts[d.pts.length - 1];
      if (Math.hypot(q.x - lx, q.y - ly) < 2.5) return;
      d.pts.push(q.x, q.y);
      update(d.id, (it) => ({ ...it, points: d.pts.slice() }));
    } else if (d.kind === 'move') {
      const dx = (p.x - d.sx) / lay.k, dy = (p.y - d.sy) / (lay.k * lay.tilt);
      update(d.id, (it) => it.kind === 'piping' && d.pts
        ? { ...it, points: d.pts.map((v, i) => v + (i % 2 ? dy : dx)) }
        : { ...it, x: d.ox + dx, y: d.oy + dy });
    } else if (d.kind === 'rotate') {
      const a = Math.atan2(p.y - d.cy, p.x - d.cx);
      update(d.id, (it) => ({ ...it, rot: d.r0 + (a - d.a0) }));
    } else if (d.kind === 'scale') {
      const dist = Math.hypot(p.x - d.cx, p.y - d.cy);
      update(d.id, (it) => ({ ...it, scale: Math.max(0.15, Math.min(5, (d.s0 * dist) / Math.max(1, d.d0))) }));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pinch' && pointers.current.size > 0) return;
    drag.current = null;
    if (d.kind === 'pipe') play('squish');
    commitLive();
  };

  return (
    <div ref={wrap} className="flex h-full w-full items-center justify-center">
      <div style={{ width: side, height: side }} className="relative">
        <canvas ref={ref} width={1000} height={1000}
          className="block h-full w-full select-none"
          style={{ touchAction: 'none', cursor: piping ? 'crosshair' : 'default' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      </div>
    </div>
  );
}
