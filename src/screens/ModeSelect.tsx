import { useMemo } from 'react';
import { ArrowLeft, Infinity as InfinityIcon, Trophy, Check } from 'lucide-react';
import { templates } from '../lib/defaults';
import { CHALLENGES } from '../lib/challenges';
import { cakeThumb } from '../render/thumbs';
import { Logo, Stars } from '../components/ui';
import type { Challenge } from '../lib/challenges';

export function ModeSelect({ onBack, onFree, onChallenge }: { onBack: () => void; onFree: () => void; onChallenge: () => void }) {
  const art = useMemo(() => ({ free: cakeThumb(templates()[1].cake, 420), ch: cakeThumb(CHALLENGES[0].example, 420) }), []);
  const Card = ({ title, desc, feats, img, onClick, icon, accent, badge }: { title: string; desc: string; feats: string[]; img: string; onClick: () => void; icon: React.ReactNode; accent: string; badge: string }) => (
    <button onClick={onClick} className="card group relative flex flex-col overflow-hidden text-left transition hover:-translate-y-1.5 hover:shadow-soft">
      <div className="relative flex h-60 items-center justify-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 70%, #fff 0, ${accent} 75%)` }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'repeating-linear-gradient(90deg, #fff 0 22px, transparent 22px 44px)' }} />
        <img src={img} alt="" className="relative h-56 w-56 object-contain transition duration-500 group-hover:scale-110" />
        <span className="absolute left-4 top-4 rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-widest text-wine shadow">{badge}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 font-script text-3xl text-cherry">{icon}{title}</div>
        <p className="mt-1 text-wine/80">{desc}</p>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-wine/80">{feats.map((f) => <li key={f} className="flex items-center gap-1.5"><Check size={14} className="text-cherry" />{f}</li>)}</ul>
        <div className="btn-cherry mt-4 w-full">Choose</div>
      </div>
    </button>
  );
  return (
    <div className="screen-enter mx-auto min-h-[100dvh] max-w-5xl px-4 py-4">
      <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
      <Logo small className="-mt-8 mb-2" />
      <h1 className="mb-6 text-center font-serif text-3xl font-bold text-wine sm:text-4xl">How would you like to bake today?</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Free Cake Studio" badge="Sandbox" accent="#f6c9d3" icon={<InfinityIcon size={26} />} img={art.free} onClick={onFree}
          desc="Create your dream cake with complete creative freedom." feats={['No time limit', 'No required design', 'Unlimited customization', 'Create however you want']} />
        <Card title="Cake Challenge" badge="5 briefs" accent="#fbe7a1" icon={<Trophy size={26} />} img={art.ch} onClick={onChallenge}
          desc="Bake to a theme, follow the brief, and earn up to three stars." feats={['Themed briefs', 'Required elements', 'Easy to hard', 'Stars & feedback']} />
      </div>
    </div>
  );
}

export function ChallengeSelect({ onBack, onPick }: { onBack: () => void; onPick: (c: Challenge) => void }) {
  const imgs = useMemo(() => CHALLENGES.map((c) => cakeThumb(c.example, 300)), []);
  const diff = { Easy: 1, Medium: 2, Hard: 3 } as const;
  return (
    <div className="screen-enter mx-auto min-h-[100dvh] max-w-6xl px-4 py-4 pb-12">
      <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
      <h1 className="-mt-6 text-center font-script text-4xl text-cherry sm:text-5xl">Cake Challenges</h1>
      <p className="mb-6 mt-1 text-center font-serif italic text-wine/80">Pick a brief from the order book. Decorate freely — the judges check the essentials.</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CHALLENGES.map((c, i) => (
          <article key={c.id} className="card flex flex-col overflow-hidden">
            <div className="relative flex h-48 items-center justify-center" style={{ background: `radial-gradient(circle at 50% 75%, #fff, ${c.accent}55)` }}>
              <img src={imgs[i]} alt="" className="h-48 w-48 object-contain" />
              <span className="absolute right-3 top-3 rounded-full bg-cream px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-wine shadow">{c.difficulty}</span>
              <span className="absolute left-3 top-3"><Stars n={diff[c.difficulty]} size={18} /></span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="font-script text-2xl text-cherry">{c.title}</h2>
              <p className="text-sm text-wine/80">{c.brief}</p>
              <span className="label">Required</span>
              <ul className="flex-1 space-y-0.5 text-sm text-wine/80">{c.requirements.map((r) => <li key={r}>✿ {r}</li>)}</ul>
              <button className="btn-cherry mt-4" onClick={() => onPick(c)}>Accept challenge</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
