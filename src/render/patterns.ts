import { darken, lighten, rgba } from '../lib/color';
import { rng } from '../lib/geometry';
import type { PatternSpec, PatternType } from '../types';
import { heartPath } from './assets';

export const PATTERNS: { id: PatternType; label: string }[] = [
  { id: 'gingham', label: 'Gingham' },
  { id: 'plaid', label: 'Pastel Plaid' },
  { id: 'tartan', label: 'Tartan' },
  { id: 'vstripes', label: 'Vertical Stripes' },
  { id: 'hstripes', label: 'Horizontal Stripes' },
  { id: 'polka', label: 'Polka Dots' },
  { id: 'flowers', label: 'Tiny Flowers' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'floral', label: 'Vintage Floral' },
  { id: 'solid', label: 'Solid' },
];

export const PATTERN_PRESETS: { label: string; spec: Partial<PatternSpec> }[] = [
  { label: 'Pink Gingham', spec: { type: 'gingham', bg: '#ffffff', c1: '#f08aa6', c2: '#f08aa6' } },
  { label: 'Red Gingham', spec: { type: 'gingham', bg: '#fff8ef', c1: '#c8203a', c2: '#c8203a' } },
  { label: 'Blue Gingham', spec: { type: 'gingham', bg: '#ffffff', c1: '#7fb2e5', c2: '#7fb2e5' } },
  { label: 'Lavender Gingham', spec: { type: 'gingham', bg: '#ffffff', c1: '#b49ae0', c2: '#b49ae0' } },
  { label: 'Yellow Gingham', spec: { type: 'gingham', bg: '#ffffff', c1: '#f5cf4f', c2: '#f5cf4f' } },
  { label: 'Blue + Yellow Plaid', spec: { type: 'plaid', bg: '#fdf6dc', c1: '#8db8e8', c2: '#f5cf4f' } },
  { label: 'Strawberry Plaid', spec: { type: 'plaid', bg: '#fff1f4', c1: '#f08aa6', c2: '#c8203a' } },
  { label: 'Cherry Tartan', spec: { type: 'tartan', bg: '#9e1b32', c1: '#2d3b6b', c2: '#f5cf4f' } },
  { label: 'Candy Stripe', spec: { type: 'vstripes', bg: '#ffffff', c1: '#f4a7b9', c2: '#f4a7b9' } },
  { label: 'Cocoa Dots', spec: { type: 'polka', bg: '#f6c9d3', c1: '#5a3426', c2: '#ffffff' } },
  { label: 'Ditsy Flowers', spec: { type: 'flowers', bg: '#fdf2e0', c1: '#e98aa3', c2: '#f5cf4f' } },
  { label: 'Tea Rose', spec: { type: 'floral', bg: '#f7efe2', c1: '#e98aa3', c2: '#8fb08a' } },
];

const tileCache = new Map<string, HTMLCanvasElement>();

function addPaperNoise(ctx: CanvasRenderingContext2D, T: number, seed = 1) {
  const R = rng(seed);
  for (let i = 0; i < T * T * 0.02; i++) {
    ctx.fillStyle = R() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(60,30,20,0.05)';
    ctx.fillRect(R() * T, R() * T, 1, 1);
  }
}

export function patternTile(spec: PatternSpec): HTMLCanvasElement {
  const key = JSON.stringify([spec.type, spec.bg, spec.c1, spec.c2, spec.weight]);
  const hit = tileCache.get(key);
  if (hit) return hit;
  const T = spec.type === 'floral' ? 128 : spec.type === 'tartan' || spec.type === 'plaid' ? 96 : 48;
  const c = document.createElement('canvas'); c.width = T; c.height = T;
  const ctx = c.getContext('2d')!;
  const { bg, c1, c2 } = spec;
  const w = Math.max(0.2, Math.min(1, spec.weight));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, T, T);
  switch (spec.type) {
    case 'gingham': {
      const b = (T / 2) * w;
      ctx.fillStyle = rgba(c1, 0.5); ctx.fillRect(0, 0, b, T); ctx.fillRect(0, 0, T, b);
      ctx.fillStyle = rgba(c2, 0.45); ctx.fillRect(0, 0, b, b);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      for (let i = -T; i < T * 2; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + T, T); ctx.stroke(); }
      break;
    }
    case 'plaid': {
      ctx.fillStyle = rgba(c1, 0.45); ctx.fillRect(0, T * 0.1, T, T * 0.3 * w); ctx.fillRect(T * 0.1, 0, T * 0.3 * w, T);
      ctx.fillStyle = rgba(c2, 0.4); ctx.fillRect(0, T * 0.62, T, T * 0.12 * w); ctx.fillRect(T * 0.62, 0, T * 0.12 * w, T);
      ctx.fillStyle = rgba('#ffffff', 0.6); ctx.fillRect(0, T * 0.85, T, 2); ctx.fillRect(T * 0.85, 0, 2, T);
      ctx.fillStyle = rgba(c1, 0.6); ctx.fillRect(0, T * 0.5, T, 1.5); ctx.fillRect(T * 0.5, 0, 1.5, T);
      break;
    }
    case 'tartan': {
      ctx.fillStyle = rgba(c1, 0.6); ctx.fillRect(0, T * 0.15, T, T * 0.32 * w); ctx.fillRect(T * 0.15, 0, T * 0.32 * w, T);
      ctx.fillStyle = rgba(darken(c1, 0.3), 0.5); ctx.fillRect(0, T * 0.27, T, T * 0.08); ctx.fillRect(T * 0.27, 0, T * 0.08, T);
      ctx.fillStyle = rgba(c2, 0.9); ctx.fillRect(0, T * 0.72, T, 2.5); ctx.fillRect(T * 0.72, 0, 2.5, T);
      ctx.fillStyle = rgba('#ffffff', 0.5); ctx.fillRect(0, T * 0.6, T, 1); ctx.fillRect(T * 0.6, 0, 1, T);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      for (let i = -T; i < T * 2; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + T, T); ctx.stroke(); }
      break;
    }
    case 'vstripes': ctx.fillStyle = c1; ctx.fillRect(0, 0, (T / 2) * w * 1.2, T); break;
    case 'hstripes': ctx.fillStyle = c1; ctx.fillRect(0, 0, T, (T / 2) * w * 1.2); break;
    case 'polka': {
      const r = T * 0.13 * (0.5 + w);
      ctx.fillStyle = c1;
      for (const [x, y] of [[T * 0.25, T * 0.25], [T * 0.75, T * 0.75]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'checker': ctx.fillStyle = c1; ctx.fillRect(0, 0, T / 2, T / 2); ctx.fillRect(T / 2, T / 2, T / 2, T / 2); break;
    case 'hearts': {
      ctx.fillStyle = c1;
      for (const [x, y, a] of [[T * 0.25, T * 0.28, -0.2], [T * 0.75, T * 0.78, 0.2]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fill(heartPath(T * 0.36 * (0.6 + w * 0.6))); ctx.restore();
      }
      break;
    }
    case 'flowers': {
      const fl = (x: number, y: number, r: number) => {
        ctx.fillStyle = c1;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
      };
      const r = T * 0.06 * (0.6 + w);
      fl(T * 0.25, T * 0.3, r); fl(T * 0.75, T * 0.8, r);
      ctx.fillStyle = '#8fb08a';
      ctx.beginPath(); ctx.ellipse(T * 0.72, T * 0.3, r * 1.2, r * 0.5, 0.6, 0, Math.PI * 2); ctx.ellipse(T * 0.2, T * 0.75, r * 1.2, r * 0.5, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'floral': {
      const rose = (x: number, y: number, r: number) => {
        ctx.fillStyle = c2;
        for (const a of [0.6, 2.4, 4.2]) { ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, r * 0.9, r * 0.4, a, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = darken(c1, 0.25); ctx.lineWidth = 1.2;
        ctx.beginPath(); for (let i = 0; i < 24; i++) { const t = i / 24, a = t * Math.PI * 4, rr = r * 0.85 * t; i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.strokeStyle = lighten(c1, 0.5); ctx.beginPath(); ctx.arc(x, y, r * 0.95, 3.6, 5.4); ctx.stroke();
      };
      const r = T * 0.09 * (0.6 + w * 0.6);
      rose(T * 0.28, T * 0.3, r); rose(T * 0.78, T * 0.75, r * 0.85); rose(T * 0.82, T * 0.18, r * 0.5);
      ctx.fillStyle = rgba(c1, 0.6);
      for (const [x, y] of [[T * 0.55, T * 0.5], [T * 0.1, T * 0.85], [T * 0.4, T * 0.92]]) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'solid': break;
  }
  addPaperNoise(ctx, T, T);
  tileCache.set(key, c);
  return c;
}

export function makePattern(ctx: CanvasRenderingContext2D, spec: PatternSpec, m: DOMMatrix) {
  const pat = ctx.createPattern(patternTile(spec), 'repeat')!;
  pat.setTransform(m.rotate(spec.rotation).scale(spec.scale));
  return pat;
}
