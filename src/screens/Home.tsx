import { useMemo } from 'react';
import { Play, BookHeart, Volume2, VolumeX } from 'lucide-react';
import { templates, defaultBox } from '../lib/defaults';
import { boxThumb, cakeThumb } from '../render/thumbs';
import type { BoxState } from '../types';

function Awning() {
  return (
    <div className="relative z-10 -mx-3 sm:-mx-6">
      <div className="awning scallop-bottom h-20 rounded-t-xl shadow-[0_12px_18px_-10px_rgba(122,31,43,.45)]" style={{ boxShadow: 'inset 0 10px 14px -8px rgba(255,255,255,.7)' }} />
    </div>
  );
}

function Shelf({ items }: { items: { src: string; label: string }[] }) {
  return (
    <div className="relative flex items-end justify-around px-2 pt-2">
      {items.map((it, i) => (
        <figure key={i} className="group relative flex flex-col items-center">
          <img src={it.src} alt={it.label} className="h-24 w-24 object-contain transition duration-300 group-hover:-translate-y-1.5 sm:h-28 sm:w-28" draggable={false} />
          <figcaption className="absolute -bottom-5 whitespace-nowrap rounded-full bg-cream px-2 text-[10px] font-semibold text-wine opacity-0 shadow transition group-hover:opacity-100">{it.label}</figcaption>
        </figure>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-3 rounded-sm bg-gradient-to-b from-[#c8956a] to-[#8a5a3a] shadow-[0_6px_8px_-3px_rgba(60,20,15,.5)]" />
    </div>
  );
}

function DisplayWindow({ shelves }: { shelves: { src: string; label: string }[][] }) {
  return (
    <div className="relative rounded-t-[999px] border-[10px] border-[#fffaf2] bg-gradient-to-b from-[#fde8ee] via-[#fbeef0] to-[#f6dcdf] p-3 pt-16 shadow-[inset_0_0_30px_rgba(122,31,43,.15),0_6px_0_#e8d7c0]">
      <div className="pointer-events-none absolute inset-x-6 top-3 h-14 rounded-t-full bg-[repeating-linear-gradient(90deg,#f6c9d3_0_14px,#fde2e8_14px_28px)] opacity-80" />
      <div className="pointer-events-none absolute -left-1 top-10 h-[70%] w-6 rounded-r-full bg-gradient-to-r from-[#f4a7b9] to-transparent opacity-60" />
      <div className="pointer-events-none absolute -right-1 top-10 h-[70%] w-6 rounded-l-full bg-gradient-to-l from-[#f4a7b9] to-transparent opacity-60" />
      <div className="space-y-6">{shelves.map((s, i) => <Shelf key={i} items={s} />)}</div>
      <div className="pointer-events-none absolute inset-0 rounded-t-[999px] bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.45)_42%,transparent_50%)]" />
    </div>
  );
}

export default function Home({ onPlay, onCollection, sound, onSound }: { onPlay: () => void; onCollection: () => void; sound: boolean; onSound: () => void }) {
  const art = useMemo(() => {
    const t = templates();
    const cakes = t.map((x) => ({ src: cakeThumb(x.cake, 300), label: x.name }));
    const bx = (p: Partial<BoxState>, cake = t[0].cake) => boxThumb({ ...defaultBox(), ...p } as BoxState, cake, 300);
    const boxes = [
      { src: bx({ lid: { ...defaultBox().lid, type: 'gingham', c1: '#c8203a', c2: '#c8203a' }, side: { ...defaultBox().side, bg: '#fbf3e4' }, ribbonColor: '#c8203a' }), label: 'Cherry gingham box' },
      { src: bx({ shape: 'heart', lid: { ...defaultBox().lid, type: 'polka', bg: '#f6c9d3', c1: '#ffffff' }, side: { ...defaultBox().side, bg: '#f4a7b9' }, ribbon: 'none', ribbonColor: '#ffffff', items: [] }, t[1].cake), label: 'Heart hatbox' },
      { src: bx({ shape: 'round', lid: { ...defaultBox().lid, type: 'floral', bg: '#f7efe2', c1: '#e98aa3', c2: '#8fb08a' }, side: { ...defaultBox().side, bg: '#cdbbe8' }, ribbon: 'single', ribbonColor: '#b49ae0', items: [] }, t[5].cake), label: 'Tea rose hatbox' },
    ];
    return { cakes, boxes };
  }, []);

  return (
    <div className="screen-enter min-h-[100dvh] overflow-x-hidden pb-10">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="rounded-full bg-cream/80 px-3 py-1 font-serif text-xs italic text-wine/80 shadow">Open daily · 9am – sweet dreams</span>
        <button className="icon-btn" onClick={onSound} title={sound ? 'Sound on' : 'Sound off'} aria-label="Toggle sound">{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
      </div>

      <div className="mx-auto max-w-5xl px-3 sm:px-6">
        {/* storefront */}
        <div className="relative">
          <Awning />
          <div className="relative -mt-3 rounded-b-xl border-x-[14px] border-b-[10px] border-[#efe2cf] bg-[#fbf4e8] px-3 pb-6 pt-6 shadow-[0_20px_40px_-20px_rgba(122,31,43,.5)] sm:px-8"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 46px, rgba(122,31,43,.04) 46px 48px)' }}>
            {/* sign */}
            <div className="relative mx-auto -mt-1 mb-6 w-fit">
              <div className="absolute -top-7 left-8 h-7 w-0.5 bg-[#b88a3a]" /><div className="absolute -top-7 right-8 h-7 w-0.5 bg-[#b88a3a]" />
              <div className="animate-sway rounded-2xl border-4 border-[#d9ab42] bg-cherry px-6 py-3 text-center shadow-soft sm:px-10">
                <div className="font-script text-4xl text-cream sm:text-6xl" style={{ textShadow: '3px 3px 0 #7a1f2b' }}>Kkumi Cafe</div>
                <div className="mt-1 font-serif text-[11px] uppercase tracking-[0.35em] text-butter sm:text-xs">Vintage Cake Café · Est. 2026</div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_220px_1fr] sm:gap-6">
              <div className="hidden sm:block"><DisplayWindow shelves={[art.cakes.slice(0, 2), art.cakes.slice(2, 4)]} /></div>

              {/* door */}
              <div className="relative mx-auto w-[220px]">
                <div className="relative h-[330px] rounded-t-[110px] border-[10px] border-[#fffaf2] bg-gradient-to-b from-[#a8495a] to-[#7a1f2b] p-3 shadow-[0_6px_0_#e8d7c0]">
                  <div className="grid h-full grid-cols-2 gap-2">
                    <div className="rounded-tl-[80px] bg-gradient-to-br from-[#fde8ee]/90 to-[#f6c9d3]/60 shadow-inner" />
                    <div className="rounded-tr-[80px] bg-gradient-to-bl from-[#fde8ee]/90 to-[#f6c9d3]/60 shadow-inner" />
                  </div>
                  <div className="absolute left-1/2 top-24 -translate-x-1/2 animate-sway">
                    <div className="mx-auto h-5 w-px bg-[#5a3426]" />
                    <div className="rounded-lg border-2 border-[#d9ab42] bg-cream px-3 py-1 font-retro text-lg text-cherry shadow">Open</div>
                  </div>
                  <div className="absolute right-[46%] top-1/2 h-6 w-1.5 rounded-full bg-[#d9ab42]" /><div className="absolute left-[46%] top-1/2 h-6 w-1.5 rounded-full bg-[#d9ab42]" />
                </div>
                <div className="mx-auto h-3 w-[250px] -translate-x-[15px] rounded bg-[#d8c8b0]" />
              </div>

              <div className="sm:block"><DisplayWindow shelves={[art.boxes, [art.cakes[4], art.cakes[5]]]} /></div>
            </div>
          </div>
        </div>

        {/* call to action */}
        <div className="relative mt-8 flex flex-col items-center gap-4 text-center">
          <p className="max-w-xl font-serif text-lg italic text-wine/80 sm:text-xl">Bake, pipe and decorate your dream cake, wrap it in a handmade box, and send it as a sweet postcard.</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button onClick={onPlay} className="btn-cherry animate-floaty px-10 py-4 font-retro text-3xl tracking-wide"><Play size={28} fill="currentColor" />PLAY GAME</button>
            <button onClick={onCollection} className="btn-cream px-6 py-3.5 text-lg"><BookHeart size={20} />My Cake Collection</button>
          </div>
          <div className="mt-4 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Pipe', 'real buttercream piping'], ['Decorate', 'fruits, flowers & toppers'], ['Wrap', 'gingham & plaid boxes'], ['Share', 'PNG, GIF, video & camera']].map(([a, b]) => (
              <div key={a} className="rounded-3xl bg-cream/80 p-3 shadow-card">
                <div className="font-script text-2xl text-cherry">{a}</div><div className="text-sm text-wine/70">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
