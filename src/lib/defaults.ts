import type { BoxState, CakeState, Item, ItemKind, PatternSpec, Postcard, Project } from '../types';
import { uid } from './geometry';

export function mkItem(kind: ItemKind, x = 0, y = 0, extra: Partial<Item> = {}): Item {
  return { id: uid(), kind, x, y, rot: 0, scale: 1, seed: Math.floor(Math.random() * 1e6) + 1, ...extra };
}

export const FROSTING_PRESETS = [
  '#fffaf3', '#fde2e8', '#f6c9d3', '#f4a7b9', '#e98aa3', '#e33b57', '#c8203a',
  '#fbe7a1', '#f8d57e', '#cdbbe8', '#b49ae0', '#bcd9f0', '#bfe3cf', '#a4c46e', '#c98a3a', '#5a3426', '#3a1f14',
];

export const PALETTE = ['#ffffff', '#fffaf3', '#f6c9d3', '#f4a7b9', '#e98aa3', '#e33b57', '#c8203a', '#7a1f2b', '#fbe7a1', '#f5cf4f', '#cdbbe8', '#b49ae0', '#bcd9f0', '#7fb2e5', '#bfe3cf', '#8fb08a', '#c98a3a', '#5a3426', '#2b1810'];

export const BOX_COLORS = [
  { label: 'Baby Pink', c: '#f6c9d3' }, { label: 'Lavender', c: '#cdbbe8' }, { label: 'Butter Yellow', c: '#fbe7a1' },
  { label: 'Cream', c: '#fbf3e4' }, { label: 'Cherry Red', c: '#c8203a' }, { label: 'Chocolate Brown', c: '#5a3426' },
  { label: 'Baby Blue', c: '#bcd9f0' }, { label: 'Mint Green', c: '#bfe3cf' },
];

export function defaultCake(): CakeState {
  return {
    shape: 'round', size: 'regular', layers: 2, flavor: 'vanilla', fillings: ['strawberry', 'vanilla', 'ganache'],
    frosting: { type: 'buttercream', color: '#f6c9d3', color2: '#fffaf3', gradient: false, texture: 'smooth', drip: false, dripColor: '#3a1f14' },
    borders: { top: 'shell', topColor: '#ffffff', bottom: 'beads', bottomColor: '#ffffff', garland: false, garlandColor: '#ffffff', ribbon: false, ribbonColor: '#e98aa3' },
    stand: 'plate', items: [], photos: {},
  };
}

const pat = (p: Partial<PatternSpec>): PatternSpec => ({ type: 'gingham', bg: '#ffffff', c1: '#f08aa6', c2: '#f08aa6', scale: 1, rotation: 0, weight: 0.5, ...p });

export function defaultBox(): BoxState {
  return {
    shape: 'square', lid: pat({}), sideMatch: false, side: pat({ type: 'solid', bg: '#f6c9d3' }),
    ribbon: 'cross', ribbonColor: '#c8203a', bow: true, window: 'none',
    sideText: 'Kkumi Cafe', sideTextColor: '#7a1f2b',
    items: [mkItem('label', -130, 120, { rot: -0.15, scale: 0.75 })],
  };
}

export function defaultPostcard(): Postcard {
  return { to: 'Someone sweet', message: 'Every cake tells a story — this one is for you!', from: 'Me', background: 'parlor' };
}

export function newProject(mode: Project['mode'] = 'free', challengeId?: string): Project {
  return { id: uid(), name: 'My Sweet Cake', mode, challengeId, cake: defaultCake(), box: defaultBox(), postcard: defaultPostcard(), createdAt: Date.now(), updatedAt: Date.now() };
}

function ring(kind: ItemKind, n: number, r: number, extra: Partial<Item> = {}, a0 = 0): Item[] {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return mkItem(kind, Math.cos(a) * r, Math.sin(a) * r, extra);
  });
}

export interface Template { id: string; name: string; cake: CakeState }

export function templates(): Template[] {
  const base = defaultCake();
  return [
    {
      id: 'glitter-heart', name: 'Cherry Glitter Heart', cake: {
        ...base, shape: 'heart', flavor: 'chocolate',
        frosting: { ...base.frosting, color: '#fffaf3', texture: 'smooth' },
        borders: { ...base.borders, top: 'shell', topColor: '#c8203a', bottom: 'shell', bottomColor: '#c8203a', garland: true, garlandColor: '#c8203a' },
        items: [...ring('cherry', 6, 130, { scale: 1.05 }, -Math.PI / 2), mkItem('text', 0, 15, { text: 'Love', color: '#c8203a', fontSize: 48 }), mkItem('candle', 0, -40, { color: '#c8203a' })],
      },
    },
    {
      id: 'pink-canvas', name: 'Pink Canvas Princess', cake: {
        ...base, layers: 3, flavor: 'strawberry',
        frosting: { ...base.frosting, color: '#f4a7b9' },
        borders: { ...base.borders, top: 'ruffle', topColor: '#ffffff', bottom: 'beads', bottomColor: '#ffffff', garland: true, garlandColor: '#ffffff' },
        items: [...ring('cherry', 3, 70, { scale: 1.1 }, -Math.PI / 2), mkItem('bow', 0, 60, { color: '#ffffff', scale: 0.9 })],
      },
    },
    {
      id: 'strawberry-dream', name: 'Strawberry Dream', cake: {
        ...base, flavor: 'vanilla', fillings: ['strawberry', 'strawberry', 'vanilla'],
        frosting: { ...base.frosting, type: 'whipped', color: '#fffaf3', drip: true, dripColor: '#f08aa6' },
        borders: { ...base.borders, top: 'rosettes', topColor: '#ffffff', bottom: 'shell', bottomColor: '#fde2e8' },
        items: [...ring('strawberry', 8, 140, { scale: 0.9 }), mkItem('strawberry', 0, 0, { scale: 1.3 }), mkItem('sprinkles', 0, 0, { variant: 'pearls', scale: 1.5 })],
      },
    },
    {
      id: 'choc-pudding', name: 'Chocolate Pudding', cake: {
        ...base, flavor: 'chocolate', fillings: ['ganache', 'oreo', 'caramel'], stand: 'board',
        frosting: { ...base.frosting, type: 'chocolate', color: '#5a3426', texture: 'swirl', drip: true, dripColor: '#2a160e' },
        borders: { ...base.borders, top: 'rosettes', topColor: '#7a4a33', bottom: 'star', bottomColor: '#7a4a33' },
        items: [...ring('truffle', 5, 80), mkItem('chocShard', -20, -10, { rot: -0.2 }), mkItem('chocShard', 25, 5, { rot: 0.25 }), mkItem('chocCurl', 0, 50, { rot: 0.1 })],
      },
    },
    {
      id: 'butter-amour', name: 'Butter Cherry Amour', cake: {
        ...base, shape: 'square', flavor: 'redvelvet', stand: 'pedestal',
        frosting: { ...base.frosting, color: '#fbe7a1' },
        borders: { ...base.borders, top: 'star', topColor: '#f4a7b9', bottom: 'beads', bottomColor: '#f4a7b9', ribbon: true, ribbonColor: '#f4a7b9' },
        items: [...ring('cherry', 3, 50, {}, -Math.PI / 2), mkItem('bow', 0, 110, { scale: 0.8 })],
      },
    },
    {
      id: 'lavender-tea', name: 'Lavender Tea Party', cake: {
        ...base, shape: 'oval', flavor: 'matcha', fillings: ['blueberry', 'vanilla', 'vanilla'],
        frosting: { ...base.frosting, color: '#cdbbe8', gradient: true, color2: '#fffaf3' },
        borders: { ...base.borders, top: 'beads', topColor: '#ffffff', bottom: 'ruffle', bottomColor: '#ffffff', garland: true, garlandColor: '#ffffff', ribbon: false },
        items: [mkItem('rose', -60, -20, { color: '#f4a7b9' }), mkItem('rose', 0, -40, { color: '#ffffff', scale: 1.1 }), mkItem('rose', 60, -20, { color: '#f4a7b9' }), mkItem('blossom', -110, 50), mkItem('blossom', 110, 50), mkItem('daisy', 0, 70, { scale: 0.8 })],
      },
    },
  ];
}
