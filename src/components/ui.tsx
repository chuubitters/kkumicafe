import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { play } from '../lib/sound';

export function Swatches({ value, onChange, colors, allowCustom = true, size = 30 }: { value: string; onChange: (c: string) => void; colors: string[]; allowCustom?: boolean; size?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button key={c} title={c} onClick={() => { onChange(c); play('click'); }}
          className={`rounded-full border-2 transition hover:scale-110 ${value.toLowerCase() === c.toLowerCase() ? 'border-cherry ring-2 ring-cherry/30 scale-110' : 'border-white'}`}
          style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, #fff8 0 15%, transparent 40%), ${c}`, boxShadow: '0 1px 3px #7a1f2b44' }} />
      ))}
      {allowCustom && (
        <label className="relative cursor-pointer rounded-full border-2 border-white" title="Custom color"
          style={{ width: size, height: size, background: 'conic-gradient(#f44,#fd4,#4d8,#4cf,#a6f,#f6c,#f44)', boxShadow: '0 1px 3px #7a1f2b44' }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
      )}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 0.01, onChange, onStart, onEnd, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onStart?: () => void; onEnd?: () => void; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs font-semibold text-wine/70"><span>{label}</span><span>{fmt ? fmt(value) : value.toFixed(2)}</span></div>
      <input className="sweet" type="range" min={min} max={max} step={step} value={value}
        onPointerDown={onStart} onPointerUp={onEnd} onKeyDown={onStart} onKeyUp={onEnd}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function Chips<T extends string | number>({ value, options, onChange, cols }: { value: T; options: { id: T; label: string; img?: string }[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div className={cols ? 'grid gap-2' : 'flex flex-wrap gap-2'} style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } : undefined}>
      {options.map((o) => (
        <button key={String(o.id)} onClick={() => { onChange(o.id); play('click'); }} className={`chip ${value === o.id ? 'chip-on' : ''} ${o.img ? 'flex flex-col items-center gap-1 rounded-2xl px-1.5 py-1.5' : ''}`}>
          {o.img && <img src={o.img} alt="" className="h-14 w-14 object-contain" draggable={false} />}
          <span className={o.img ? 'text-[11px] leading-tight' : ''}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => { onChange(!value); play('click'); }} className="flex w-full items-center justify-between rounded-2xl bg-white/60 px-3 py-2 text-sm font-medium text-wine">
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-cherry' : 'bg-wine/20'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wine/40 p-4 backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card animate-pop relative max-h-[92dvh] w-full overflow-auto p-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <button className="icon-btn absolute right-3 top-3 h-9 w-9" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {title && <h2 className="mb-4 pr-10 font-script text-3xl text-cherry">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

let toastFn: ((m: string) => void) | null = null;
export const toast = (m: string) => toastFn?.(m);
export function Toaster() {
  const [msgs, setMsgs] = useState<{ id: number; m: string }[]>([]);
  const idRef = useRef(0);
  const push = useCallback((m: string) => {
    const id = ++idRef.current;
    setMsgs((s) => [...s, { id, m }]);
    setTimeout(() => setMsgs((s) => s.filter((x) => x.id !== id)), 3200);
  }, []);
  useEffect(() => { toastFn = push; return () => { toastFn = null; }; }, [push]);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {msgs.map((t) => (
        <div key={t.id} className="animate-pop rounded-full bg-wine px-5 py-2.5 font-medium text-cream shadow-soft">{t.m}</div>
      ))}
    </div>
  );
}

export function Logo({ className = '', small }: { className?: string; small?: boolean }) {
  return (
    <div className={`select-none text-center leading-none ${className}`}>
      <div className={`font-script text-cherry ${small ? 'text-2xl' : 'text-5xl sm:text-6xl'}`} style={{ textShadow: '2px 3px 0 #fff, 4px 6px 0 #7a1f2b22' }}>Kkumi Cafe</div>
      {!small && <div className="mt-2 font-serif text-sm italic tracking-wide text-wine/80 sm:text-base">“Every Cake Tells a Story.”</div>}
    </div>
  );
}

export function Stars({ n, size = 34 }: { n: number; size?: number }) {
  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= n ? 'animate-pop' : ''} style={{ animationDelay: `${i * 0.15}s` }}>
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill={i <= n ? '#f5c228' : '#e8d9cf'} stroke={i <= n ? '#b8860b' : '#cbb'} strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}
