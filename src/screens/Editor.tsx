import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Undo2, Redo2, RotateCcw, Save, ZoomIn, ZoomOut, Copy, Trash2, ChevronUp, ChevronDown,
  Cake, Palette, Brush, Cherry, Sparkles, Flower2, Type, ImagePlus, Layers, Crown, Eye, Upload, CheckCircle2, Circle, Hand, BringToFront, SendToBack,
} from 'lucide-react';
import type { CakeState, Filling, Flavor, FrameShape, Item, ItemKind, Project, SprinkleKind, Tip } from '../types';
import { useHistory } from '../lib/useHistory';
import Stage, { StageApi } from '../components/Stage';
import { Chips, Modal, Slider, Swatches, Toggle, toast } from '../components/ui';
import { CAKE_R, FILLINGS, FLAVORS, cakeLayout, drawSlice, renderCake, sprinkleClip } from '../render/cake';
import { ASSETS } from '../render/assets';
import { assetThumb, cakeThumb, tipThumb } from '../render/thumbs';
import { FROSTING_PRESETS, PALETTE, defaultCake, mkItem, templates } from '../lib/defaults';
import { fileToDataUrl } from '../lib/images';
import { uid } from '../lib/geometry';
import { play } from '../lib/sound';
import type { Challenge } from '../lib/challenges';

type Tab = 'cake' | 'flavor' | 'frosting' | 'piping' | 'borders' | 'fruits' | 'sprinkles' | 'decor' | 'text' | 'photo' | 'layers';

const TABS: { id: Tab; label: string; icon: typeof Cake }[] = [
  { id: 'cake', label: 'Cake', icon: Cake },
  { id: 'flavor', label: 'Flavor', icon: Layers },
  { id: 'frosting', label: 'Frosting', icon: Palette },
  { id: 'piping', label: 'Piping', icon: Brush },
  { id: 'borders', label: 'Borders', icon: Crown },
  { id: 'fruits', label: 'Fruits', icon: Cherry },
  { id: 'sprinkles', label: 'Sprinkles', icon: Sparkles },
  { id: 'decor', label: 'Decor', icon: Flower2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'photo', label: 'Photo', icon: ImagePlus },
  { id: 'layers', label: 'Layers', icon: Layers },
];

const FRUITS: ItemKind[] = ['strawberry', 'cherry', 'blueberry', 'raspberry', 'peach', 'kiwi'];
const DECOR: { title: string; kinds: ItemKind[] }[] = [
  { title: 'Flowers', kinds: ['rose', 'daisy', 'blossom'] },
  { title: 'Hearts, stars & bows', kinds: ['heart', 'star', 'bow', 'ribbon'] },
  { title: 'Candles', kinds: ['candle', 'numberCandle'] },
  { title: 'Figures & toppers', kinds: ['bear', 'bunny', 'topperBirthday', 'topperHeart', 'bunting'] },
  { title: 'Chocolate & sweets', kinds: ['chocShard', 'truffle', 'chocCurl', 'macaron'] },
];
const SPRINKLES: { id: SprinkleKind; label: string }[] = [
  { id: 'rainbow', label: 'Rainbow' }, { id: 'chocolate', label: 'Chocolate' }, { id: 'hearts', label: 'Hearts' }, { id: 'stars', label: 'Stars' }, { id: 'pearls', label: 'Sugar Pearls' },
];
const TIPS: { id: Tip; label: string }[] = [
  { id: 'round', label: 'Round' }, { id: 'star', label: 'Star' }, { id: 'shell', label: 'Shell' }, { id: 'leaf', label: 'Leaf' }, { id: 'ruffle', label: 'Ruffle' }, { id: 'rosette', label: 'Rosette' },
];
export const FONTS = ['Pacifico', 'Dancing Script', 'Caveat', 'Shrikhand', 'Playfair Display', 'Fredoka'];
const PRESET_MSGS = ['Happy Birthday', 'Love You', 'Thank You', 'Best Wishes', 'Congratulations'];
const FRAMES: { id: FrameShape; label: string }[] = [
  { id: 'circle', label: 'Circle' }, { id: 'square', label: 'Square' }, { id: 'heart', label: 'Heart' }, { id: 'oval', label: 'Oval' }, { id: 'scallop', label: 'Scalloped' },
];
const COLORABLE: ItemKind[] = ['rose', 'daisy', 'blossom', 'heart', 'star', 'bow', 'ribbon', 'candle', 'numberCandle', 'topperBirthday', 'topperHeart', 'macaron', 'text', 'piping', 'label', 'stamp', 'stickerHeart', 'stickerStar', 'stickerFlower', 'tag'];

export const itemName = (it: Item) =>
  it.kind === 'piping' ? `Piping · ${it.tip}` : it.kind === 'text' ? `“${(it.text || '').slice(0, 16)}”` : it.kind === 'sprinkles' ? `Sprinkles · ${it.variant}` : ASSETS[it.kind]?.label || it.kind;

export function itemIcon(it: Item) {
  if (it.kind === 'piping') return tipThumb(it.tip || 'round', it.color || '#fff', 64);
  if (it.kind === 'photo' || it.kind === 'text') return null;
  return assetThumb(it.kind, { variant: it.variant, color: it.color }, 64);
}

interface Props {
  project: Project;
  onChange: (cake: CakeState) => void;
  onBack: () => void;
  onNext: () => void;
  onSave: (name: string) => Promise<void>;
  challenge?: Challenge;
}

export default function Editor({ project, onChange, onBack, onNext, onSave, challenge }: Props) {
  const H = useHistory<CakeState>(project.cake);
  const cake = H.state;
  const [tab, setTab] = useState<Tab>('cake');
  const [sel, setSel] = useState<string | null>(null);
  const [pipe, setPipe] = useState<{ tip: Tip; color: string; size: number }>({ tip: 'shell', color: '#ffffff', size: 11 });
  const [pipeOn, setPipeOn] = useState(true);
  const [tilt, setTilt] = useState(0.55);
  const [zoom, setZoom] = useState(1);
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [frame, setFrame] = useState<FrameShape>('circle');
  const [customText, setCustomText] = useState('');
  const [fillVariant, setFillVariant] = useState<SprinkleKind>('rainbow');
  const api = useRef<StageApi | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const sliceRef = useRef<HTMLCanvasElement>(null);

  // sync to the app lazily (cheap during rapid slider/drag edits); flushed on navigation & save
  useEffect(() => { const t = setTimeout(() => onChange(cake), 250); return () => clearTimeout(t); }, [cake, onChange]);
  const flush = () => onChange(cake);

  // keyboard shortcuts
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? H.redo() : H.undo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); H.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); removeSel(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && sel) { e.preventDefault(); duplicate(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const piping = tab === 'piping' && pipeOn ? pipe : null;
  const selItem = cake.items.find((i) => i.id === sel) || null;

  const set = (patch: Partial<CakeState> | ((c: CakeState) => CakeState)) => H.set((c) => (typeof patch === 'function' ? patch(c) : { ...c, ...patch }));
  const updItem = (id: string, patch: Partial<Item>, live = false) => H.set((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), live ? 'live' : 'commit');

  const addItem = (kind: ItemKind, extra: Partial<Item> = {}, at?: { x: number; y: number }, atBottom = false) => {
    const r = Math.random() * 60, a = Math.random() * Math.PI * 2;
    const pos = at || { x: Math.cos(a) * r, y: Math.sin(a) * r };
    const it = mkItem(kind, pos.x, pos.y, { color: ASSETS[kind as Exclude<ItemKind, 'piping'>]?.color, ...extra });
    set((c) => ({ ...c, items: atBottom ? [it, ...c.items] : [...c.items, it] }));
    setSel(it.id);
    play('pop');
    return it;
  };

  const duplicate = () => {
    if (!selItem) return;
    const copy: Item = { ...selItem, id: uid(), x: selItem.x + 20, y: selItem.y + 20, points: selItem.points?.map((v, i) => v + (i % 2 ? 20 : 20)) };
    set((c) => ({ ...c, items: [...c.items, copy] })); setSel(copy.id); play('pop');
  };
  const removeSel = () => { if (!sel) return; set((c) => ({ ...c, items: c.items.filter((i) => i.id !== sel) })); setSel(null); play('click'); };
  const moveLayer = (dir: 1 | -1 | 'top' | 'bottom', id = sel) => {
    if (!id) return;
    set((c) => {
      const arr = c.items.slice(); const i = arr.findIndex((x) => x.id === id); if (i < 0) return c;
      const [it] = arr.splice(i, 1);
      const j = dir === 'top' ? arr.length : dir === 'bottom' ? 0 : Math.max(0, Math.min(arr.length, i + dir));
      arr.splice(j, 0, it); return { ...c, items: arr };
    });
  };

  const onUpload = async (f: File | undefined, replaceId?: string) => {
    if (!f) return;
    try {
      const data = await fileToDataUrl(f, 1200);
      const pid = uid();
      if (replaceId) set((c) => ({ ...c, photos: { ...c.photos, [pid]: data }, items: c.items.map((i) => (i.id === replaceId ? { ...i, photoId: pid, crop: { zoom: 1, px: 0, py: 0 } } : i)) }));
      else {
        const it = mkItem('photo', 0, 0, { photoId: pid, variant: frame, border: true, borderColor: '#ffffff', crop: { zoom: 1, px: 0, py: 0 } });
        set((c) => ({ ...c, photos: { ...c.photos, [pid]: data }, items: [...c.items, it] }));
        setSel(it.id);
      }
      play('pop'); toast('Photo printed on edible sugar sheet!');
    } catch (e) { toast((e as Error).message); }
  };

  // drag & drop from the palette (mouse & pen; touch taps add to centre)
  const [ghost, setGhost] = useState<{ x: number; y: number; img: string } | null>(null);
  const startPaletteDrag = (e: React.PointerEvent, kind: ItemKind, extra: Partial<Item>, img: string) => {
    if (e.pointerType === 'touch') return; // touch: tap to add (dragging would fight scrolling)
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      if (moved) setGhost({ x: ev.clientX, y: ev.clientY, img });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      setGhost(null);
      if (moved) {
        const p = api.current?.clientToPlane(ev.clientX, ev.clientY);
        if (p) addItem(kind, extra, p);
      }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const asset = (kind: ItemKind, extra: Partial<Item> = {}, label?: string) => {
    const img = assetThumb(kind, extra);
    return (
      <button key={kind + (extra.variant || '')} className="thumb flex-col p-1" title={label || ASSETS[kind as Exclude<ItemKind, 'piping'>]?.label}
        onPointerDown={(e) => startPaletteDrag(e, kind, extra, img)}
        onClick={() => addItem(kind, extra)}>
        <img src={img} alt="" className="pointer-events-none h-[70%] w-[70%] object-contain" draggable={false} />
        <span className="pointer-events-none text-[10px] font-medium leading-tight text-wine/80">{label || ASSETS[kind as Exclude<ItemKind, 'piping'>]?.label}</span>
      </button>
    );
  };

  useEffect(() => { if (sliceRef.current) drawSlice(sliceRef.current.getContext('2d')!, cake, 260, 170); }, [cake, tab]);

  const draw = (ctx: CanvasRenderingContext2D, W: number, Hh: number, excludeId?: string) => {
    const g = ctx.createRadialGradient(W / 2, Hh * 0.55, 0, W / 2, Hh * 0.55, W * 0.7);
    g.addColorStop(0, '#fff7f2'); g.addColorStop(1, '#f6dfe0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    // faint table gingham
    ctx.fillStyle = 'rgba(232,138,163,0.08)';
    for (let x = 0; x < W; x += 50) ctx.fillRect(x, 0, 25, Hh);
    for (let y = 0; y < Hh; y += 50) ctx.fillRect(0, y, W, 25);
    const L = cakeLayout(cake, W, Hh, zoom, tilt);
    renderCake(ctx, excludeId ? { ...cake, items: cake.items.filter((i) => i.id !== excludeId) } : cake, L);
    if (piping) {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#7a1f2b'; ctx.font = '22px Fredoka'; ctx.textAlign = 'center';
      ctx.fillText('Draw on the cake to pipe frosting', W / 2, Hh - 24); ctx.restore();
    }
    return L;
  };

  const checklist = challenge ? challenge.check(cake) : null;

  const panel = () => {
    switch (tab) {
      case 'cake': return (
        <>
          <span className="label">Shape</span>
          <Chips value={cake.shape} onChange={(v) => set({ shape: v })} cols={3} options={(['round', 'square', 'heart', 'oval', 'star'] as const).map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1), img: shapeIcon(s) }))} />
          <span className="label">Size</span>
          <Chips value={cake.size} onChange={(v) => set({ size: v })} options={[{ id: 'mini', label: 'Mini' }, { id: 'regular', label: 'Regular' }, { id: 'large', label: 'Large' }]} />
          <span className="label">Layers</span>
          <Chips value={cake.layers} onChange={(v) => set({ layers: v })} options={[{ id: 1, label: 'Single' }, { id: 2, label: 'Double' }, { id: 3, label: 'Triple' }]} />
          <span className="label">Cake stand</span>
          <Chips value={cake.stand} onChange={(v) => set({ stand: v })} options={[{ id: 'none', label: 'None' }, { id: 'board', label: 'Gold board' }, { id: 'plate', label: 'Lace plate' }, { id: 'pedestal', label: 'Pink pedestal' }]} />
          <span className="label">Start from a bakery classic</span>
          <div className="grid grid-cols-2 gap-2">
            {templates().map((t) => (
              <TemplateBtn key={t.id} name={t.name} cake={t.cake} onPick={() => { set({ ...t.cake, photos: cake.photos }); setSel(null); play('chime'); }} />
            ))}
          </div>
        </>
      );
      case 'flavor': return (
        <>
          <div className="lace mx-auto my-2 w-fit rounded bg-cream"><canvas ref={sliceRef} width={260} height={170} className="h-[150px] w-[230px]" /></div>
          <p className="text-center font-hand text-lg text-wine/70">a peek inside your cake</p>
          <span className="label">Sponge flavor</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FLAVORS) as Flavor[]).map((f) => (
              <button key={f} onClick={() => set({ flavor: f })} className={`chip flex flex-col items-center gap-1 rounded-2xl ${cake.flavor === f ? 'chip-on' : ''}`}>
                <span className="h-7 w-12 rounded-md" style={{ background: f === 'rainbow' ? 'linear-gradient(#f7a8c4,#fbd38d,#fdf29a,#b6e3a8,#a8d4f4,#cdb4ec)' : `linear-gradient(${FLAVORS[f].sponge}, ${FLAVORS[f].crumb})`, boxShadow: 'inset 0 -3px 0 #0001' }} />
                <span className="text-xs">{FLAVORS[f].label}</span>
              </button>
            ))}
          </div>
          {Array.from({ length: cake.layers }, (_, i) => (
            <div key={i}>
              <span className="label">Filling · layer {i + 1}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(FILLINGS) as Filling[]).map((f) => (
                  <button key={f} onClick={() => set({ fillings: cake.fillings.map((x, j) => (j === i ? f : x)) })} className={`chip flex items-center gap-1.5 px-2 text-[11px] ${cake.fillings[i] === f ? 'chip-on' : ''}`}>
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white" style={{ background: FILLINGS[f].color }} />{FILLINGS[f].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      );
      case 'frosting': return (
        <>
          <span className="label">Frosting type</span>
          <Chips value={cake.frosting.type} onChange={(v) => {
            const defaults = { buttercream: '#f6c9d3', whipped: '#fffaf3', chocolate: '#5a3426', strawberry: '#f4a7b9' } as const;
            set({ frosting: { ...cake.frosting, type: v, color: defaults[v] } });
          }} options={[{ id: 'buttercream', label: 'Buttercream' }, { id: 'whipped', label: 'Whipped Cream' }, { id: 'chocolate', label: 'Chocolate Cream' }, { id: 'strawberry', label: 'Strawberry Cream' }]} />
          <span className="label">Color</span>
          <Swatches value={cake.frosting.color} colors={FROSTING_PRESETS} onChange={(c) => set({ frosting: { ...cake.frosting, color: c } })} />
          <span className="label">Texture</span>
          <Chips value={cake.frosting.texture} onChange={(v) => set({ frosting: { ...cake.frosting, texture: v } })} options={[{ id: 'smooth', label: 'Smooth' }, { id: 'swirl', label: 'Spatula swirls' }, { id: 'combed', label: 'Combed' }, { id: 'rustic', label: 'Rustic' }]} />
          <div className="mt-3 space-y-2">
            <Toggle label="Ombré gradient sides" value={cake.frosting.gradient} onChange={(v) => set({ frosting: { ...cake.frosting, gradient: v } })} />
            {cake.frosting.gradient && <Swatches value={cake.frosting.color2} colors={FROSTING_PRESETS} onChange={(c) => set({ frosting: { ...cake.frosting, color2: c } })} />}
            <Toggle label="Glossy drip & glaze" value={cake.frosting.drip} onChange={(v) => set({ frosting: { ...cake.frosting, drip: v } })} />
            {cake.frosting.drip && <Swatches value={cake.frosting.dripColor} colors={['#3a1f14', '#5a3426', '#c98a3a', '#f08aa6', '#c8203a', '#ffffff', '#cdbbe8', '#a4c46e']} onChange={(c) => set({ frosting: { ...cake.frosting, dripColor: c } })} />}
          </div>
        </>
      );
      case 'piping': return (
        <>
          <div className="mt-1 flex gap-2">
            <button className={`chip flex-1 ${pipeOn ? 'chip-on' : ''}`} onClick={() => setPipeOn(true)}><Brush size={14} className="mr-1 inline" />Pipe</button>
            <button className={`chip flex-1 ${!pipeOn ? 'chip-on' : ''}`} onClick={() => setPipeOn(false)}><Hand size={14} className="mr-1 inline" />Move</button>
          </div>
          <span className="label">Piping tip</span>
          <div className="grid grid-cols-3 gap-2">
            {TIPS.map((t) => (
              <button key={t.id} onClick={() => { setPipe({ ...pipe, tip: t.id }); setPipeOn(true); }} className={`chip flex flex-col items-center gap-1 rounded-2xl px-1 ${pipe.tip === t.id ? 'chip-on' : ''}`}>
                <img src={tipThumb(t.id, pipe.color)} className="h-12 w-12 rounded-xl" alt="" /><span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
          <span className="label">Cream color</span>
          <Swatches value={pipe.color} colors={FROSTING_PRESETS} onChange={(c) => setPipe({ ...pipe, color: c })} />
          <div className="mt-3"><Slider label="Piping size" min={4} max={26} step={0.5} value={pipe.size} onChange={(v) => setPipe({ ...pipe, size: v })} fmt={(v) => v.toFixed(0)} /></div>
          <p className="mt-3 rounded-2xl bg-butter/60 p-3 text-sm text-wine/80">Drag across the cake to pipe. Short taps make dots &amp; rosettes; long strokes make borders, swags and lettering. Each stroke stays editable — switch to <b>Move</b> to select one.</p>
        </>
      );
      case 'borders': return (
        <>
          <span className="label">Top edge border</span>
          <BorderPick value={cake.borders.top} onChange={(v) => set({ borders: { ...cake.borders, top: v } })} />
          <div className="mt-2"><Swatches value={cake.borders.topColor} colors={PALETTE} onChange={(c) => set({ borders: { ...cake.borders, topColor: c } })} /></div>
          <span className="label">Bottom border</span>
          <BorderPick value={cake.borders.bottom} onChange={(v) => set({ borders: { ...cake.borders, bottom: v } })} />
          <div className="mt-2"><Swatches value={cake.borders.bottomColor} colors={PALETTE} onChange={(c) => set({ borders: { ...cake.borders, bottomColor: c } })} /></div>
          <div className="mt-3 space-y-2">
            <Toggle label="Vintage garland swags" value={cake.borders.garland} onChange={(v) => set({ borders: { ...cake.borders, garland: v } })} />
            {cake.borders.garland && <Swatches value={cake.borders.garlandColor} colors={PALETTE} onChange={(c) => set({ borders: { ...cake.borders, garlandColor: c } })} />}
            <Toggle label="Satin ribbon band" value={cake.borders.ribbon} onChange={(v) => set({ borders: { ...cake.borders, ribbon: v } })} />
            {cake.borders.ribbon && <Swatches value={cake.borders.ribbonColor} colors={PALETTE} onChange={(c) => set({ borders: { ...cake.borders, ribbonColor: c } })} />}
          </div>
        </>
      );
      case 'fruits': return (<><span className="label">Tap to add · drag onto the cake</span><div className="grid grid-cols-3 gap-2">{FRUITS.map((k) => asset(k))}</div></>);
      case 'sprinkles': return (
        <>
          <span className="label">Tap to scatter a handful</span>
          <div className="grid grid-cols-3 gap-2">{SPRINKLES.map((s) => asset('sprinkles', { variant: s.id, scale: 1 }, s.label))}</div>
          <span className="label">Cover the whole top</span>
          <div className="flex flex-wrap gap-1.5">{SPRINKLES.map((s) => <button key={s.id} className={`chip ${fillVariant === s.id ? 'chip-on' : ''}`} onClick={() => setFillVariant(s.id)}>{s.label}</button>)}</div>
          <button className="btn-cream mt-2 w-full" onClick={() => addItem('sprinkles', { variant: fillVariant, scale: 3.4, fill: true }, { x: 0, y: 0 }, true)}><Sparkles size={16} />Sprinkle the whole top</button>
          <p className="mt-2 text-sm text-wine/70">Sprinkles follow your cake's shape — a heart cake gets a heart of sprinkles, and handfuls never spill off the edge. The whole-top layer sits under your other decorations.</p>
        </>
      );
      case 'decor': return (<>{DECOR.map((g) => (<div key={g.title}><span className="label">{g.title}</span><div className="grid grid-cols-3 gap-2">{g.kinds.map((k) => asset(k))}</div></div>))}</>);
      case 'text': return (
        <>
          <span className="label">Preset messages</span>
          <div className="flex flex-wrap gap-2">{PRESET_MSGS.map((m) => <button key={m} className="chip font-script text-cherry" onClick={() => addItem('text', { text: m, font: 'Pacifico', fontSize: 34, color: '#c8203a' }, { x: 0, y: 40 })}>{m}</button>)}</div>
          <span className="label">Your own message</span>
          <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={2} placeholder="Write something sweet…" className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-3 font-hand text-xl outline-none focus:border-rose" />
          <button className="btn-cherry mt-2 w-full" disabled={!customText.trim()} onClick={() => { addItem('text', { text: customText.trim(), font: 'Dancing Script', fontSize: 34, color: '#c8203a' }, { x: 0, y: 0 }); setCustomText(''); }}><Type size={16} />Write on cake</button>
          <p className="mt-2 text-sm text-wine/70">Select text on the cake to change font, color, size and rotation.</p>
        </>
      );
      case 'photo': return (
        <>
          <span className="label">Frame shape</span>
          <Chips value={frame} onChange={setFrame} cols={3} options={FRAMES.map((f) => ({ id: f.id, label: f.label, img: frameIcon(f.id) }))} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onUpload(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="btn-cherry mt-4 w-full" onClick={() => fileRef.current?.click()}><Upload size={16} />Upload a photo</button>
          <p className="mt-3 rounded-2xl bg-blush/60 p-3 text-sm text-wine/80">Your photo becomes an edible print. Crop, zoom, rotate and add a frosting border from the panel on the right. Photos stay on this device.</p>
        </>
      );
      case 'layers': return (
        <>
          <span className="label">{cake.items.length} decorations · top is front</span>
          {cake.items.length === 0 && <p className="text-sm text-wine/60">Nothing here yet — add fruits, piping or decorations!</p>}
          <div className="space-y-1.5">
            {cake.items.slice().reverse().map((it) => {
              const ic = itemIcon(it);
              return (
                <div key={it.id} onClick={() => setSel(it.id)} className={`flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-2 py-1.5 ${sel === it.id ? 'border-cherry bg-blush/60' : 'border-transparent bg-white/60 hover:bg-white'}`}>
                  {ic ? <img src={ic} className="h-9 w-9" alt="" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream text-wine">{it.kind === 'text' ? <Type size={16} /> : <ImagePlus size={16} />}</span>}
                  <span className="flex-1 truncate text-sm">{itemName(it)}</span>
                  <button className="icon-btn h-7 w-7" onClick={(e) => { e.stopPropagation(); moveLayer(1, it.id); }} title="Bring forward"><ChevronUp size={14} /></button>
                  <button className="icon-btn h-7 w-7" onClick={(e) => { e.stopPropagation(); moveLayer(-1, it.id); }} title="Send backward"><ChevronDown size={14} /></button>
                  <button className="icon-btn h-7 w-7" onClick={(e) => { e.stopPropagation(); set((c) => ({ ...c, items: c.items.filter((x) => x.id !== it.id) })); if (sel === it.id) setSel(null); }} title="Delete"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        </>
      );
    }
  };

  const inspector = selItem && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {itemIcon(selItem) && <img src={itemIcon(selItem)!} className="h-10 w-10" alt="" />}
        <h3 className="flex-1 truncate font-serif text-lg font-bold text-wine">{itemName(selItem)}</h3>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        <button className="icon-btn h-9 w-full rounded-xl" title="Duplicate" onClick={duplicate}><Copy size={16} /></button>
        <button className="icon-btn h-9 w-full rounded-xl" title="Bring to front" onClick={() => moveLayer('top')}><BringToFront size={16} /></button>
        <button className="icon-btn h-9 w-full rounded-xl" title="Bring forward" onClick={() => moveLayer(1)}><ChevronUp size={16} /></button>
        <button className="icon-btn h-9 w-full rounded-xl" title="Send backward" onClick={() => moveLayer(-1)}><ChevronDown size={16} /></button>
        <button className="icon-btn h-9 w-full rounded-xl" title="Send to back" onClick={() => moveLayer('bottom')}><SendToBack size={16} /></button>
        <button className="icon-btn h-9 w-full rounded-xl text-cherry" title="Delete" onClick={removeSel}><Trash2 size={16} /></button>
      </div>
      {selItem.kind !== 'piping' && <>
        <Slider label="Size" min={0.2} max={selItem.kind === 'sprinkles' ? 4 : 3} value={selItem.scale} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { scale: v }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Rotation" min={-180} max={180} step={1} value={Math.round((selItem.rot * 180) / Math.PI)} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { rot: (v * Math.PI) / 180 }, true)} fmt={(v) => `${v}°`} />
      </>}
      {selItem.kind === 'piping' && <Slider label="Thickness" min={4} max={26} step={0.5} value={selItem.size || 10} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { size: v }, true)} fmt={(v) => v.toFixed(0)} />}
      {selItem.kind === 'piping' && <Chips value={selItem.tip || 'round'} onChange={(v) => updItem(selItem.id, { tip: v })} options={TIPS} />}
      {COLORABLE.includes(selItem.kind) && <div><span className="label">Color</span><Swatches value={selItem.color || '#ffffff'} colors={PALETTE} onChange={(c) => updItem(selItem.id, { color: c })} /></div>}
      {selItem.kind === 'sprinkles' && <Chips value={(selItem.variant || 'rainbow') as SprinkleKind} onChange={(v) => updItem(selItem.id, { variant: v })} options={SPRINKLES} />}
      {(selItem.kind === 'text' || selItem.kind === 'topperBirthday') && (
        <>
          <textarea value={selItem.text || ''} rows={2} onFocus={H.begin} onBlur={H.end} onChange={(e) => updItem(selItem.id, { text: e.target.value }, true)} className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2 font-hand text-xl outline-none focus:border-rose" />
          {selItem.kind === 'text' && <>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => <button key={f} onClick={() => updItem(selItem.id, { font: f })} className={`chip truncate ${selItem.font === f ? 'chip-on' : ''}`} style={{ fontFamily: f }}>{f}</button>)}
            </div>
            <Slider label="Font size" min={14} max={90} step={1} value={selItem.fontSize || 40} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { fontSize: v }, true)} fmt={(v) => `${v}`} />
          </>}
        </>
      )}
      {selItem.kind === 'numberCandle' && (
        <div><span className="label">Number</span><div className="flex flex-wrap gap-1">{'0123456789'.split('').map((d) => <button key={d} onClick={() => updItem(selItem.id, { text: d })} className={`chip w-9 px-0 ${(selItem.text || '1') === d ? 'chip-on' : ''}`}>{d}</button>)}</div></div>
      )}
      {selItem.kind === 'photo' && (
        <>
          <span className="label">Frame</span>
          <Chips value={(selItem.variant || 'circle') as FrameShape} onChange={(v) => updItem(selItem.id, { variant: v })} options={FRAMES} />
          <span className="label">Crop &amp; fit</span>
          <Slider label="Photo zoom" min={0.6} max={3} value={selItem.crop?.zoom || 1} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { crop: { ...(selItem.crop || { zoom: 1, px: 0, py: 0 }), zoom: v } }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Pan left/right" min={-1} max={1} value={selItem.crop?.px || 0} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { crop: { ...(selItem.crop || { zoom: 1, px: 0, py: 0 }), px: v } }, true)} />
          <Slider label="Pan up/down" min={-1} max={1} value={selItem.crop?.py || 0} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { crop: { ...(selItem.crop || { zoom: 1, px: 0, py: 0 }), py: v } }, true)} />
          <Toggle label="Frosting border" value={selItem.border !== false} onChange={(v) => updItem(selItem.id, { border: v })} />
          {selItem.border !== false && <Swatches value={selItem.borderColor || '#ffffff'} colors={PALETTE} onChange={(c) => updItem(selItem.id, { borderColor: c })} />}
          <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onUpload(e.target.files?.[0], selItem.id); e.target.value = ''; }} />
          <button className="btn-cream w-full" onClick={() => replaceRef.current?.click()}><Upload size={16} />Replace photo</button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* top bar */}
      <header className="z-10 flex items-center gap-1.5 border-b-2 border-wine/10 bg-cream/90 px-2 py-2 backdrop-blur sm:gap-2 sm:px-4">
        <button className="icon-btn" onClick={() => { flush(); onBack(); }} title="Back"><ArrowLeft size={18} /></button>
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="truncate font-script text-xl text-cherry">{challenge ? challenge.title : 'Free Cake Studio'}</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-wine/50">Step 1 of 3 · Decorate</div>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 sm:flex-none">
          <button className="icon-btn" disabled={!H.canUndo} onClick={H.undo} title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
          <button className="icon-btn" disabled={!H.canRedo} onClick={H.redo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
          <button className="icon-btn" onClick={() => setResetOpen(true)} title="Reset"><RotateCcw size={18} /></button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} title="Zoom out"><ZoomOut size={18} /></button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(1.9, z + 0.15))} title="Zoom in"><ZoomIn size={18} /></button>
          <button className="icon-btn" onClick={() => setTilt((t) => (t > 0.9 ? 0.55 : 1))} title={tilt > 0.9 ? 'Angled view' : 'Top view'}><Eye size={18} /></button>
          <button className="icon-btn" onClick={() => setSaveOpen(true)} title="Save"><Save size={18} /></button>
        </div>
        <button className="btn-cherry px-3 sm:px-5" onClick={() => { setSel(null); flush(); onNext(); }}><span className="hidden sm:inline">Design Box</span><ArrowRight size={18} /></button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* canvas */}
        <main className="relative order-1 h-[46dvh] shrink-0 p-2 lg:order-2 lg:h-auto lg:flex-1 lg:p-4">
          <Stage draw={draw} redrawKey={[cake, tilt, zoom, piping]} items={cake.items} selectedId={sel} onSelect={setSel}
            onItems={(items, mode) => H.set((c) => ({ ...c, items }), mode)} piping={piping} api={api} photos={cake.photos} clip={sprinkleClip(cake.shape)} />
          <div className="pointer-events-none absolute left-3 top-3 hidden rounded-full bg-cream/90 px-3 py-1 font-hand text-lg text-wine shadow-soft sm:block">
            {cake.shape} · {cake.size} · {cake.layers} layer{cake.layers > 1 ? 's' : ''}
          </div>
        </main>

        {/* category panel */}
        <aside className="order-3 flex min-h-0 flex-1 flex-col border-t-2 border-wine/10 bg-cream/70 lg:order-1 lg:w-[360px] lg:flex-none lg:flex-row lg:border-r-2 lg:border-t-0">
          <nav className="scroll-thin flex shrink-0 gap-1 overflow-x-auto p-2 lg:w-[84px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); play('click'); }}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition ${tab === t.id ? 'bg-cherry text-white shadow-soft' : 'text-wine/70 hover:bg-white/70'}`}>
                <t.icon size={19} />{t.label}
              </button>
            ))}
          </nav>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-1">
            {selItem && <div className="mb-3 rounded-3xl border-2 border-cherry/30 bg-white/70 p-3 lg:hidden">{inspector}</div>}
            {panel()}
          </div>
        </aside>

        {/* inspector (desktop) */}
        <aside className="scroll-thin order-4 hidden w-[300px] overflow-y-auto border-l-2 border-wine/10 bg-cream/70 p-4 lg:block">
          {inspector || (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-wine">Decorating tips</h3>
              <ul className="space-y-2 text-sm text-wine/80">
                <li>• Click or drag items from the left onto the cake.</li>
                <li>• Select an item to move it, then use the <b>↻</b> knob to rotate and the <b>⤡</b> knob to resize. On touch, pinch with two fingers.</li>
                <li>• Every decoration stays editable and has its own layer.</li>
                <li>• <b>Ctrl+Z</b> undo · <b>Delete</b> removes · <b>Ctrl+D</b> duplicates.</li>
              </ul>
              {challenge && checklist && <ChallengeCard challenge={challenge} checklist={checklist} />}
            </div>
          )}
        </aside>
      </div>
      {challenge && checklist && (
        <div className="pointer-events-none fixed bottom-3 right-3 z-20 lg:hidden">
          <div className="rounded-full bg-cream/95 px-3 py-1.5 text-sm font-semibold text-wine shadow-soft">{checklist.filter((c) => c.ok && !c.bonus).length}/{checklist.filter((c) => !c.bonus).length} brief ✓</div>
        </div>
      )}

      {ghost && <img src={ghost.img} alt="" className="pointer-events-none fixed z-50 h-20 w-20 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-xl" style={{ left: ghost.x, top: ghost.y }} />}

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save to collection">
        <label className="label">Creation name</label>
        <input value={name} placeholder="Name your cake" onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border-2 border-wine/15 bg-white p-3 font-hand text-2xl outline-none focus:border-rose" />
        <p className="mt-2 text-sm text-wine/60">Saved in this browser on this device.</p>
        <button className="btn-cherry mt-4 w-full" onClick={async () => { flush(); await new Promise((r) => setTimeout(r, 30)); await onSave(name); setSaveOpen(false); }}><Save size={16} />Save cake</button>
      </Modal>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Start over?">
        <p className="text-wine/80">This clears your cake back to a plain pink buttercream cake. You can still undo afterwards.</p>
        <div className="mt-4 flex gap-2"><button className="btn-cream flex-1" onClick={() => setResetOpen(false)}>Keep decorating</button>
          <button className="btn-cherry flex-1" onClick={() => { H.set({ ...defaultCake(), photos: cake.photos }); setSel(null); setResetOpen(false); }}>Reset cake</button></div>
      </Modal>
    </div>
  );
}

export function ChallengeCard({ challenge, checklist }: { challenge: Challenge; checklist: { label: string; ok: boolean; bonus?: boolean }[] }) {
  return (
    <div className="rounded-3xl border-2 p-3" style={{ borderColor: challenge.accent + '66', background: challenge.accent + '14' }}>
      <div className="font-script text-xl text-cherry">{challenge.title}</div>
      <p className="mb-2 text-sm text-wine/80">{challenge.brief}</p>
      <ul className="space-y-1">
        {checklist.map((c) => (
          <li key={c.label} className={`flex items-center gap-2 text-sm ${c.ok ? 'text-wine' : 'text-wine/60'}`}>
            {c.ok ? <CheckCircle2 size={16} className="text-cherry" /> : <Circle size={16} />}{c.bonus && <span className="rounded bg-butter px-1 text-[10px] font-bold">BONUS</span>}{c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateBtn({ name, cake, onPick }: { name: string; cake: CakeState; onPick: () => void }) {
  const img = useMemo(() => { if (!tplCache.has(name)) tplCache.set(name, cakeThumb(cake, 220)); return tplCache.get(name)!; }, [cake, name]);
  return (
    <button onClick={onPick} className="thumb aspect-auto flex-col p-1.5">
      <img src={img} alt="" className="h-24 w-24 object-contain" />
      <span className="text-[11px] font-semibold leading-tight text-wine">{name}</span>
    </button>
  );
}

function BorderPick({ value, onChange }: { value: CakeState['borders']['top']; onChange: (v: CakeState['borders']['top']) => void }) {
  const opts: { id: CakeState['borders']['top']; label: string; tip?: Tip }[] = [
    { id: 'none', label: 'None' }, { id: 'shell', label: 'Shells', tip: 'shell' }, { id: 'beads', label: 'Pearls', tip: 'round' },
    { id: 'ruffle', label: 'Ruffle', tip: 'ruffle' }, { id: 'rosettes', label: 'Rosettes', tip: 'rosette' }, { id: 'star', label: 'Stars', tip: 'star' },
  ];
  return <Chips value={value} onChange={onChange} cols={3} options={opts.map((o) => ({ id: o.id, label: o.label, img: o.tip ? tipThumb(o.tip, '#ffffff', 80) : undefined }))} />;
}

const iconCache = new Map<string, string>();
const tplCache = new Map<string, string>();
function shapeIcon(s: CakeState['shape']) {
  const k = 'shape' + s; if (iconCache.has(k)) return iconCache.get(k)!;
  const c = defaultCake(); c.shape = s; c.layers = 1; c.stand = 'none'; c.borders = { ...c.borders, top: 'beads', bottom: 'none' };
  const u = cakeThumb(c, 120, 0.6); iconCache.set(k, u); return u;
}
function frameIcon(f: FrameShape) {
  const k = 'frame' + f; if (iconCache.has(k)) return iconCache.get(k)!;
  const u = assetThumb('photo', { variant: f, border: true, borderColor: '#f4a7b9' }, 120); iconCache.set(k, u); return u;
}

export { CAKE_R };
