import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Undo2, Redo2, Package, PackageOpen, Copy, Trash2, Grid3x3, PanelTop, Gift, Square, Sticker, Type } from 'lucide-react';
import type { BoxState, CakeState, Item, ItemKind, PatternSpec } from '../types';
import { useHistory } from '../lib/useHistory';
import Stage from '../components/Stage';
import { Chips, Slider, Swatches, Toggle } from '../components/ui';
import { boxLayout, renderBox } from '../render/box';
import { PATTERNS, PATTERN_PRESETS } from '../render/patterns';
import { assetThumb, patternSwatch } from '../render/thumbs';
import { BOX_COLORS, PALETTE, mkItem } from '../lib/defaults';
import { ASSETS } from '../render/assets';
import { uid } from '../lib/geometry';
import { play } from '../lib/sound';
import { itemName } from './Editor';

type Tab = 'shape' | 'lid' | 'sides' | 'ribbon' | 'window' | 'stickers' | 'text';
const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'shape', label: 'Shape', icon: Package }, { id: 'lid', label: 'Lid', icon: Grid3x3 }, { id: 'sides', label: 'Sides', icon: PanelTop },
  { id: 'ribbon', label: 'Ribbon', icon: Gift }, { id: 'window', label: 'Window', icon: Square }, { id: 'stickers', label: 'Stickers', icon: Sticker }, { id: 'text', label: 'Text', icon: Type },
];
const STICKERS: ItemKind[] = ['label', 'stamp', 'tag', 'stickerCherry', 'stickerHeart', 'stickerStar', 'stickerFlower', 'bow', 'blossom', 'daisy', 'heart', 'ribbon'];
const COLORS = [...BOX_COLORS.map((b) => b.c), '#ffffff', '#f08aa6', '#7fb2e5', '#b49ae0', '#f5cf4f', '#8fb08a', '#2d3b6b'];

function PatternEditor({ spec, onChange, begin, end }: { spec: PatternSpec; onChange: (p: PatternSpec, live?: boolean) => void; begin: () => void; end: () => void }) {
  return (
    <>
      <span className="label">Quick presets</span>
      <div className="grid grid-cols-4 gap-1.5">
        {PATTERN_PRESETS.map((p) => (
          <button key={p.label} title={p.label} onClick={() => { onChange({ ...spec, ...p.spec }); play('click'); }} className="thumb flex-col gap-0.5 p-1">
            <img src={patternSwatch({ ...spec, ...p.spec, scale: 1, rotation: 0 } as PatternSpec, 56)} className="h-10 w-10 rounded-lg" alt="" />
            <span className="text-[9px] leading-tight text-wine/80">{p.label}</span>
          </button>
        ))}
      </div>
      <span className="label">Pattern</span>
      <div className="grid grid-cols-4 gap-1.5">
        {PATTERNS.map((p) => (
          <button key={p.id} onClick={() => { onChange({ ...spec, type: p.id }); play('click'); }} className={`thumb flex-col gap-0.5 p-1 ${spec.type === p.id ? '!border-cherry' : ''}`}>
            <img src={patternSwatch({ ...spec, type: p.id, scale: 1, rotation: 0 }, 56)} className="h-10 w-10 rounded-lg" alt="" />
            <span className="text-[9px] leading-tight text-wine/80">{p.label}</span>
          </button>
        ))}
      </div>
      <span className="label">Background color</span>
      <Swatches value={spec.bg} colors={COLORS} onChange={(c) => onChange({ ...spec, bg: c })} size={26} />
      {spec.type !== 'solid' && <>
        <span className="label">Pattern color 1</span>
        <Swatches value={spec.c1} colors={COLORS} onChange={(c) => onChange({ ...spec, c1: c })} size={26} />
        {['gingham', 'plaid', 'tartan', 'flowers', 'floral'].includes(spec.type) && <>
          <span className="label">Pattern color 2</span>
          <Swatches value={spec.c2} colors={COLORS} onChange={(c) => onChange({ ...spec, c2: c })} size={26} />
        </>}
        <div className="mt-3 space-y-2">
          <Slider label="Pattern scale" min={0.4} max={3} value={spec.scale} onStart={begin} onEnd={end} onChange={(v) => onChange({ ...spec, scale: v }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Band / dot size" min={0.2} max={1} value={spec.weight} onStart={begin} onEnd={end} onChange={(v) => onChange({ ...spec, weight: v }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Pattern rotation" min={0} max={90} step={1} value={spec.rotation} onStart={begin} onEnd={end} onChange={(v) => onChange({ ...spec, rotation: v }, true)} fmt={(v) => `${v}°`} />
        </div>
      </>}
    </>
  );
}

interface Props { cake: CakeState; box: BoxState; onChange: (b: BoxState) => void; onBack: () => void; onNext: () => void }

export default function BoxStudio({ cake, box: initial, onChange, onBack, onNext }: Props) {
  const H = useHistory<BoxState>(initial);
  const box = H.state;
  const [tab, setTab] = useState<Tab>('lid');
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tilt, setTilt] = useState(0.5);
  const [anim, setAnim] = useState(1);
  const animRef = useRef(0);
  const [text, setText] = useState('');

  useEffect(() => { const t = setTimeout(() => onChange(box), 250); return () => clearTimeout(t); }, [box, onChange]);

  const toggleOpen = () => {
    const target = open ? 0 : 1;
    setOpen(!open); play('whoosh');
    const from = open ? 1 : 0; const t0 = performance.now();
    cancelAnimationFrame(animRef.current);
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / 600);
      const e = 1 - Math.pow(1 - u, 3);
      setAnim(from + (target - from) * e);
      if (u < 1) animRef.current = requestAnimationFrame(step);
    };
    setAnim(from); step();
  };
  const openAmt = open ? anim : 1 - anim;

  const set = (p: Partial<BoxState>, live = false) => H.set((b) => ({ ...b, ...p }), live ? 'live' : 'commit');
  const selItem = box.items.find((i) => i.id === sel);
  const add = (kind: ItemKind, extra: Partial<Item> = {}) => {
    const it = mkItem(kind, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, { color: ASSETS[kind as Exclude<ItemKind, 'piping'>]?.color, ...extra });
    H.set((b) => ({ ...b, items: [...b.items, it] })); setSel(it.id); play('pop');
    if (open) toggleOpen();
  };
  const updItem = (id: string, p: Partial<Item>, live = false) => H.set((b) => ({ ...b, items: b.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }), live ? 'live' : 'commit');

  const draw = (ctx: CanvasRenderingContext2D, W: number, Hh: number, excludeId?: string) => {
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, '#fbeef0'); g.addColorStop(0.62, '#f6dfe0'); g.addColorStop(0.62, '#ead2c4'); g.addColorStop(1, '#dcbfae');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    ctx.strokeStyle = 'rgba(122,31,43,0.06)'; ctx.lineWidth = 2;
    for (let y = Hh * 0.62 + 30; y < Hh; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const L = boxLayout(cake, W, Hh, 1, tilt);
    const lid = openAmt > 0.001 ? { dx: openAmt * W * 0.06, dy: -openAmt * Hh * 0.3, scale: 1 - openAmt * 0.08, alpha: 1, behind: openAmt > 0.5 } : null;
    renderBox(ctx, excludeId ? { ...box, items: box.items.filter((i) => i.id !== excludeId) } : box, cake, L, { lid });
    return L;
  };

  const panel = () => {
    switch (tab) {
      case 'shape': return (
        <>
          <span className="label">Box shape</span>
          <Chips value={box.shape} onChange={(v) => set({ shape: v })} cols={2} options={[{ id: 'square', label: 'Square box' }, { id: 'rect', label: 'Rectangle box' }, { id: 'heart', label: 'Heart box' }, { id: 'round', label: 'Round hatbox' }]} />
          <span className="label">Quick box color</span>
          <div className="grid grid-cols-4 gap-2">
            {BOX_COLORS.map((b) => (
              <button key={b.label} onClick={() => { set({ side: { ...box.side, type: 'solid', bg: b.c } }); play('click'); }} className="flex flex-col items-center gap-1 text-[10px] text-wine/80">
                <span className="h-9 w-9 rounded-xl border-2 border-white shadow" style={{ background: b.c }} />{b.label}
              </button>
            ))}
          </div>
        </>
      );
      case 'lid': return <PatternEditor spec={box.lid} onChange={(p, live) => set({ lid: p }, live)} begin={H.begin} end={H.end} />;
      case 'sides': return (
        <>
          <div className="mt-2"><Toggle label="Sides match the lid" value={box.sideMatch} onChange={(v) => set({ sideMatch: v })} /></div>
          {!box.sideMatch && <PatternEditor spec={box.side} onChange={(p, live) => set({ side: p }, live)} begin={H.begin} end={H.end} />}
        </>
      );
      case 'ribbon': return (
        <>
          <span className="label">Ribbon style</span>
          <Chips value={box.ribbon} onChange={(v) => set({ ribbon: v })} cols={2} options={[{ id: 'none', label: 'No ribbon' }, { id: 'cross', label: 'Classic cross' }, { id: 'single', label: 'Single band' }, { id: 'diagonal', label: 'Diagonal' }]} />
          <span className="label">Ribbon color</span>
          <Swatches value={box.ribbonColor} colors={PALETTE} onChange={(c) => set({ ribbonColor: c })} />
          <div className="mt-3"><Toggle label="Big satin bow on top" value={box.bow} onChange={(v) => set({ bow: v })} /></div>
        </>
      );
      case 'window': return (
        <>
          <span className="label">Lid window</span>
          <Chips value={box.window} onChange={(v) => set({ window: v })} cols={2} options={[{ id: 'none', label: 'No window' }, { id: 'circle', label: 'Round window' }, { id: 'heart', label: 'Heart window' }, { id: 'rect', label: 'Display window' }]} />
          <p className="mt-3 rounded-2xl bg-butter/60 p-3 text-sm text-wine/80">A clear acetate window lets your cake peek through the closed lid. Tip: turn the bow off so it doesn't cover the window.</p>
        </>
      );
      case 'stickers': return (
        <>
          <span className="label">Tap to stick on the lid</span>
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map((k) => (
              <button key={k} className="thumb flex-col p-1" onClick={() => add(k, k === 'bow' || k === 'heart' ? { scale: 0.8 } : {})}>
                <img src={assetThumb(k)} className="h-[68%] w-[68%] object-contain" alt="" draggable={false} />
                <span className="text-[10px] text-wine/80">{ASSETS[k as Exclude<ItemKind, 'piping'>].label}</span>
              </button>
            ))}
          </div>
          {box.items.length > 0 && <>
            <span className="label">On the lid</span>
            <div className="space-y-1">
              {box.items.slice().reverse().map((it) => (
                <div key={it.id} onClick={() => setSel(it.id)} className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-sm ${sel === it.id ? 'bg-blush' : 'bg-white/60'}`}>
                  <span className="flex-1 truncate">{itemName(it)}</span>
                  <button className="icon-btn h-7 w-7" onClick={(e) => { e.stopPropagation(); H.set((b) => ({ ...b, items: b.items.filter((x) => x.id !== it.id) })); }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </>}
        </>
      );
      case 'text': return (
        <>
          <span className="label">Message on the box side</span>
          <input value={box.sideText} maxLength={28} onFocus={H.begin} onBlur={H.end} onChange={(e) => set({ sideText: e.target.value }, true)} className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2.5 font-script text-lg text-cherry outline-none focus:border-rose" />
          <div className="mt-2"><Swatches value={box.sideTextColor} colors={PALETTE} onChange={(c) => set({ sideTextColor: c })} /></div>
          <span className="label">Add a message on the lid</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Made with love…" className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2.5 font-hand text-xl outline-none focus:border-rose" />
          <button className="btn-cherry mt-2 w-full" disabled={!text.trim()} onClick={() => { add('text', { text: text.trim(), font: 'Pacifico', fontSize: 34, color: '#c8203a' }); setText(''); }}><Type size={16} />Add to lid</button>
        </>
      );
    }
  };

  const inspector = selItem && !open && (
    <div className="space-y-3 rounded-3xl border-2 border-cherry/30 bg-white/70 p-3">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-serif font-bold text-wine">{itemName(selItem)}</span>
        <button className="icon-btn h-8 w-8" title="Duplicate" onClick={() => { const c = { ...selItem, id: uid(), x: selItem.x + 20, y: selItem.y + 20 }; H.set((b) => ({ ...b, items: [...b.items, c] })); setSel(c.id); }}><Copy size={15} /></button>
        <button className="icon-btn h-8 w-8 text-cherry" title="Delete" onClick={() => { H.set((b) => ({ ...b, items: b.items.filter((x) => x.id !== selItem.id) })); setSel(null); }}><Trash2 size={15} /></button>
      </div>
      <Slider label="Size" min={0.2} max={3} value={selItem.scale} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { scale: v }, true)} fmt={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Rotation" min={-180} max={180} step={1} value={Math.round((selItem.rot * 180) / Math.PI)} onStart={H.begin} onEnd={H.end} onChange={(v) => updItem(selItem.id, { rot: (v * Math.PI) / 180 }, true)} fmt={(v) => `${v}°`} />
      {['label', 'tag', 'text'].includes(selItem.kind) && <input value={selItem.text || ''} onFocus={H.begin} onBlur={H.end} onChange={(e) => updItem(selItem.id, { text: e.target.value }, true)} placeholder={selItem.kind === 'label' ? 'Kkumi Cafe' : 'with love'} className="w-full rounded-xl border-2 border-wine/15 bg-white p-2 font-hand text-lg outline-none" />}
      {!['stickerCherry'].includes(selItem.kind) && <Swatches value={selItem.color || '#ffffff'} colors={PALETTE} onChange={(c) => updItem(selItem.id, { color: c })} size={24} />}
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="z-10 flex items-center gap-2 border-b-2 border-wine/10 bg-cream/90 px-2 py-2 backdrop-blur sm:px-4">
        <button className="icon-btn" onClick={() => { onChange(box); onBack(); }} title="Back to cake"><ArrowLeft size={18} /></button>
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="truncate font-script text-xl text-cherry">Cake Box Studio</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-wine/50">Step 2 of 3 · Packaging</div>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 sm:flex-none">
          <button className="icon-btn" disabled={!H.canUndo} onClick={H.undo} title="Undo"><Undo2 size={18} /></button>
          <button className="icon-btn" disabled={!H.canRedo} onClick={H.redo} title="Redo"><Redo2 size={18} /></button>
          <button className="btn-cream px-3 py-2 text-sm" onClick={toggleOpen}>{open ? <Package size={16} /> : <PackageOpen size={16} />}<span className="hidden sm:inline">{open ? 'Close lid' : 'Open box'}</span></button>
        </div>
        <button className="btn-cherry px-3 sm:px-5" onClick={() => { onChange(box); onNext(); }}><span className="hidden sm:inline">Finish</span><ArrowRight size={18} /></button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative order-1 flex h-[46dvh] shrink-0 flex-col p-2 lg:order-2 lg:h-auto lg:flex-1 lg:p-4">
          <div className="min-h-0 flex-1">
            <Stage draw={draw} redrawKey={[box, cake, tilt, openAmt]} items={open ? [] : box.items} selectedId={open ? null : sel} onSelect={setSel}
              onItems={(items, mode) => H.set((b) => ({ ...b, items }), mode)} interactive={!open} photos={cake.photos} />
          </div>
          <div className="mx-auto flex w-full max-w-md items-center gap-3 px-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-wine/60">View</span>
            <button className="chip px-2 py-0.5 text-xs" onClick={() => setTilt(0.32)}>Front</button>
            <input className="sweet flex-1" type="range" min={0.25} max={1} step={0.01} value={tilt} onChange={(e) => setTilt(parseFloat(e.target.value))} />
            <button className="chip px-2 py-0.5 text-xs" onClick={() => setTilt(1)}>Top</button>
          </div>
        </main>
        <aside className="order-3 flex min-h-0 flex-1 flex-col border-t-2 border-wine/10 bg-cream/70 lg:order-1 lg:w-[380px] lg:flex-none lg:flex-row lg:border-r-2 lg:border-t-0">
          <nav className="scroll-thin flex shrink-0 gap-1 overflow-x-auto p-2 lg:w-[84px] lg:flex-col">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); play('click'); }} className={`flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition ${tab === t.id ? 'bg-cherry text-white shadow-soft' : 'text-wine/70 hover:bg-white/70'}`}>
                <t.icon size={19} />{t.label}
              </button>
            ))}
          </nav>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-1">
            {inspector && <div className="mb-3">{inspector}</div>}
            {panel()}
          </div>
        </aside>
      </div>
    </div>
  );
}
