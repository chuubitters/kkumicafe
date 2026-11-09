import type { BoxState, CakeState, ItemKind } from '../types';
import { isPastel, isPink, isPinkOrRed, isLight } from './color';
import { defaultCake, mkItem } from './defaults';

export interface Criterion { label: string; ok: boolean; bonus?: boolean }
export interface Challenge {
  id: string;
  title: string;
  brief: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  requirements: string[];
  accent: string;
  example: CakeState;
  check: (cake: CakeState, box?: BoxState) => Criterion[];
}

const count = (c: CakeState, kinds: ItemKind[]) => c.items.filter((i) => kinds.includes(i.kind)).length;
const sprinkleCount = (c: CakeState, v?: string) => c.items.filter((i) => i.kind === 'sprinkles' && (!v || i.variant === v)).length;
const hasText = (c: CakeState, re?: RegExp) =>
  c.items.some((i) => (i.kind === 'text' || i.kind === 'topperBirthday') && (i.text || (i.kind === 'topperBirthday' ? 'Happy Birthday' : '')).trim().length > 1 && (!re || re.test(i.text || 'Happy Birthday')));
const piped = (c: CakeState) => c.items.some((i) => i.kind === 'piping') || c.borders.top !== 'none' || c.borders.bottom !== 'none';
const flowers = (c: CakeState) => count(c, ['rose', 'daisy', 'blossom']);
const colorsUsed = (c: CakeState) => new Set([c.frosting.color, ...c.items.map((i) => i.color).filter(Boolean)]).size;

function ex(fn: (c: CakeState) => CakeState) { return fn(defaultCake()); }

export const CHALLENGES: Challenge[] = [
  {
    id: 'love', title: 'Love is in the Cake', difficulty: 'Easy', accent: '#e33b57',
    brief: 'Create a romantic anniversary cake using pink, red, hearts and strawberries.',
    requirements: ['Pink or red frosting', 'At least 2 hearts', 'At least 3 strawberries', 'Bonus: heart-shaped cake', 'Bonus: a sweet message'],
    example: ex((c) => ({ ...c, shape: 'heart', frosting: { ...c.frosting, color: '#f4a7b9' }, borders: { ...c.borders, top: 'shell', topColor: '#c8203a', bottomColor: '#c8203a' },
      items: [mkItem('strawberry', -70, -30), mkItem('strawberry', 70, -30), mkItem('strawberry', 0, 60), mkItem('heart', -30, 10), mkItem('heart', 30, 10, { color: '#ffffff' }), mkItem('text', 0, -70, { text: 'Forever', fontSize: 34, color: '#c8203a' })] })),
    check: (c) => [
      { label: 'Pink or red frosting', ok: isPinkOrRed(c.frosting.color) || (c.frosting.drip && isPinkOrRed(c.frosting.dripColor)) },
      { label: 'At least 2 hearts', ok: count(c, ['heart', 'topperHeart']) + sprinkleCount(c, 'hearts') * 2 >= 2 },
      { label: 'At least 3 strawberries', ok: count(c, ['strawberry']) >= 3 },
      { label: 'Heart-shaped cake', ok: c.shape === 'heart', bonus: true },
      { label: 'A sweet message', ok: hasText(c), bonus: true },
    ],
  },
  {
    id: '90s', title: '90s Birthday Party', difficulty: 'Easy', accent: '#7fb2e5',
    brief: 'Create a colorful retro birthday cake with sprinkles and a birthday message.',
    requirements: ['Sprinkles', 'At least 1 candle', 'A birthday message', 'Colorful piping or borders', 'Bonus: 4+ colors'],
    example: ex((c) => ({ ...c, frosting: { ...c.frosting, color: '#bcd9f0' }, borders: { ...c.borders, top: 'star', topColor: '#f4a7b9', bottom: 'star', bottomColor: '#fbe7a1' },
      items: [mkItem('sprinkles', 0, 0, { variant: 'rainbow', scale: 1.8 }), mkItem('numberCandle', 0, -40, { text: '9', color: '#f4a7b9' }), mkItem('candle', -90, -20, { color: '#7fb2e5' }), mkItem('candle', 90, -20, { color: '#f5cf4f' }), mkItem('text', 0, 70, { text: 'Happy Birthday', fontSize: 30, color: '#e33b57' })] })),
    check: (c) => [
      { label: 'Sprinkles', ok: sprinkleCount(c) >= 1 },
      { label: 'At least 1 candle', ok: count(c, ['candle', 'numberCandle']) >= 1 },
      { label: 'A birthday message', ok: hasText(c, /birth|bday|b-day|party|happy/i) },
      { label: 'Colorful piping or borders', ok: piped(c) },
      { label: '4 or more colors', ok: colorsUsed(c) >= 4 || sprinkleCount(c, 'rainbow') > 0, bonus: true },
    ],
  },
  {
    id: 'special', title: 'Someone Special', difficulty: 'Medium', accent: '#b49ae0',
    brief: 'Create a personalized cake with a photo and a meaningful message.',
    requirements: ['Upload a photo', 'A meaningful message', 'Frosting border around the photo', 'Flowers or hearts', 'Bonus: a cake topper'],
    example: ex((c) => ({ ...c, frosting: { ...c.frosting, color: '#fffaf3' }, borders: { ...c.borders, top: 'beads', topColor: '#cdbbe8', bottom: 'beads', bottomColor: '#cdbbe8' },
      items: [mkItem('photo', 0, -10, { variant: 'scallop', scale: 0.9, border: true, borderColor: '#cdbbe8' }), mkItem('text', 0, 100, { text: 'Thank you, Mom', fontSize: 28, color: '#7a1f2b' }), mkItem('blossom', -120, 20), mkItem('blossom', 120, 20)] })),
    check: (c) => {
      const photo = c.items.find((i) => i.kind === 'photo' && i.photoId);
      return [
        { label: 'Upload a photo', ok: !!photo },
        { label: 'A meaningful message', ok: c.items.some((i) => i.kind === 'text' && (i.text || '').trim().length >= 3) },
        { label: 'Frosting border around the photo', ok: !!photo && photo.border !== false },
        { label: 'Flowers or hearts', ok: flowers(c) + count(c, ['heart', 'topperHeart']) >= 1 },
        { label: 'A cake topper', ok: count(c, ['topperBirthday', 'topperHeart', 'bunting']) >= 1, bonus: true },
      ];
    },
  },
  {
    id: 'strawberry', title: 'Strawberry Dream', difficulty: 'Medium', accent: '#f08aa6',
    brief: 'Create a strawberry-themed cake using pink frosting, strawberries and cream.',
    requirements: ['Pink frosting', 'At least 5 strawberries', 'Cream piping (white or cream)', 'Strawberry sponge or jam filling', 'Bonus: drip or rosettes'],
    example: ex((c) => ({ ...c, flavor: 'strawberry', frosting: { ...c.frosting, color: '#f6c9d3', type: 'strawberry' }, borders: { ...c.borders, top: 'rosettes', topColor: '#ffffff' },
      items: [mkItem('strawberry', 0, 0, { scale: 1.2 }), mkItem('strawberry', -80, -40), mkItem('strawberry', 80, -40), mkItem('strawberry', -80, 50), mkItem('strawberry', 80, 50)] })),
    check: (c) => [
      { label: 'Pink frosting', ok: isPink(c.frosting.color) },
      { label: 'At least 5 strawberries', ok: count(c, ['strawberry']) >= 5 },
      { label: 'Cream piping', ok: c.items.some((i) => i.kind === 'piping' && isLight(i.color || '#ffffff')) || (c.borders.top !== 'none' && isLight(c.borders.topColor)) || (c.borders.bottom !== 'none' && isLight(c.borders.bottomColor)) },
      { label: 'Strawberry sponge or jam', ok: c.flavor === 'strawberry' || c.fillings.slice(0, c.layers).includes('strawberry') },
      { label: 'Drip or rosettes', ok: c.frosting.drip || c.borders.top === 'rosettes' || c.items.some((i) => i.tip === 'rosette'), bonus: true },
    ],
  },
  {
    id: 'tea', title: 'Vintage Tea Party', difficulty: 'Hard', accent: '#8fb08a',
    brief: 'Create an elegant vintage cake with flowers, ribbons and pastel colors — and a box to match.',
    requirements: ['Pastel frosting', 'At least 2 flowers', 'A bow or ribbon', 'Vintage piping: top border + garland or bottom border', 'Pastel box with gingham or floral pattern'],
    example: ex((c) => ({ ...c, shape: 'oval', frosting: { ...c.frosting, color: '#cdbbe8' }, borders: { ...c.borders, top: 'beads', garland: true, ribbon: true, ribbonColor: '#f4a7b9' },
      items: [mkItem('rose', -40, -10), mkItem('rose', 40, -10, { color: '#ffffff' }), mkItem('blossom', 0, 60)] })),
    check: (c, box) => [
      { label: 'Pastel frosting', ok: isPastel(c.frosting.color) },
      { label: 'At least 2 flowers', ok: flowers(c) >= 2 },
      { label: 'A bow or ribbon', ok: count(c, ['bow', 'ribbon']) >= 1 || c.borders.ribbon },
      { label: 'Vintage piping', ok: c.borders.top !== 'none' && (c.borders.garland || c.borders.bottom !== 'none') },
      { label: 'Pastel gingham/floral box', ok: !!box && ['gingham', 'plaid', 'floral', 'flowers'].includes(box.lid.type) && (isPastel(box.lid.c1) || isPastel(box.lid.bg)) },
    ],
  },
];

export function evaluate(ch: Challenge, cake: CakeState, box?: BoxState) {
  const crit = ch.check(cake, box);
  const req = crit.filter((c) => !c.bonus);
  const reqOk = req.filter((c) => c.ok).length;
  const bonusOk = crit.filter((c) => c.bonus && c.ok).length;
  const ratio = reqOk / req.length;
  let stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : 1;
  if (stars === 2 && bonusOk > 0 && ratio >= 0.75) stars = 3;
  const messages = {
    3: ['Bakery-window perfect! Customers are lining up already.', 'Three stars! This cake tells a beautiful story.', 'Masterpiece! Even the head baker is taking notes.'],
    2: ['So sweet! A couple more touches and it\'s a showstopper.', 'Lovely work — you\'re nearly there!'],
    1: ['A delicious start! Peek at the checklist and add a few more details.', 'Every great baker starts somewhere — try the missing touches!'],
  } as const;
  const pool = messages[stars as 1 | 2 | 3];
  return { criteria: crit, stars, message: pool[Math.floor(Math.random() * pool.length)] };
}
