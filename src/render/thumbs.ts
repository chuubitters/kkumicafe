import type { BoxState, CakeState, Item, ItemKind, Tip } from '../types';
import { drawAsset } from './assets';
import { drawPiping } from './cream';
import { cakeLayout, renderCake } from './cake';
import { boxLayout, renderBox } from './box';
import { patternTile } from './patterns';
import type { PatternSpec } from '../types';

const cache = new Map<string, string>();

export function assetThumb(kind: ItemKind, extra: Partial<Item> = {}, size = 120): string {
  const key = JSON.stringify([kind, extra, size]);
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const item: Item = { id: 't', kind, x: 0, y: 0, rot: 0, scale: kind === 'sprinkles' ? 0.6 : 1, seed: 7, ...extra };
  ctx.translate(size / 2, size / 2);
  const s = kind === 'sprinkles' ? size * 0.9 : kind === 'text' ? size * 0.28 : size * 0.72;
  drawAsset(ctx, item, s, { k: size / 120, tilt: 0.8, t: 0, photos: {} });
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function tipThumb(tip: Tip, color = '#ffffff', size = 96) {
  const key = `tip|${tip}|${color}|${size}`;
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f6c9d3'; ctx.beginPath(); ctx.roundRect(4, 4, size - 8, size - 8, 16); ctx.fill();
  const pts = Array.from({ length: 20 }, (_, i) => ({ x: size * 0.18 + (i / 19) * size * 0.64, y: size * 0.5 + Math.sin(i / 3) * size * 0.08 }));
  drawPiping(ctx, tip === 'rosette' ? [{ x: size / 2, y: size / 2 }] : pts, tip, tip === 'rosette' ? size * 0.2 : size * 0.08, color, 3);
  const url = c.toDataURL(); cache.set(key, url); return url;
}

export function cakeThumb(cake: CakeState, size = 360, tilt = 0.55): string {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  renderCake(ctx, cake, cakeLayout(cake, size, size, 1.05, tilt));
  return c.toDataURL('image/png');
}

export function boxThumb(box: BoxState, cake: CakeState, size = 300): string {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  renderBox(ctx, box, cake, boxLayout(cake, size, size, 1.05, 0.5), { lid: null, showCake: true });
  return c.toDataURL('image/png');
}

export function patternSwatch(spec: PatternSpec, size = 64) {
  const key = 'pat|' + JSON.stringify(spec) + size;
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const p = ctx.createPattern(patternTile(spec), 'repeat')!;
  p.setTransform(new DOMMatrix().scale(0.5));
  ctx.fillStyle = p; ctx.fillRect(0, 0, size, size);
  const url = c.toDataURL(); cache.set(key, url); return url;
}
