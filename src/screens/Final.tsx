import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Download, Film, Image as ImageIcon, Play, Save, Sparkles, Home, RefreshCcw, Pencil } from 'lucide-react';
import type { Postcard, Project } from '../types';
import { Chips, Modal, Stars, toast } from '../components/ui';
import { BACKGROUNDS, Composition, animFrame, compose } from '../render/scene';
import { ensureReady, exportGif, exportImage, exportVideo, pickVideoMime } from '../export/media';
import { onImageLoad } from '../lib/images';
import { evaluate, type Challenge } from '../lib/challenges';
import { play } from '../lib/sound';
import CameraAR from './CameraAR';
import { CheckCircle2, Circle } from 'lucide-react';

interface Props {
  project: Project;
  challenge?: Challenge;
  onPostcard: (p: Postcard) => void;
  onBack: () => void;
  onSave: (name: string, stars?: number) => Promise<void>;
  onHome: () => void;
  onEditCake: () => void;
  onRename: (n: string) => void;
}

const COMPS: { id: Composition; label: string }[] = [
  { id: 'full', label: 'Full presentation' }, { id: 'cakeBox', label: 'Cake with box' }, { id: 'cakePostcard', label: 'Cake with postcard' }, { id: 'cakeOnly', label: 'Cake only' },
];

export default function Final({ project, challenge, onPostcard, onBack, onSave, onHome, onEditCake, onRename }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [comp, setComp] = useState<Composition>('full');
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [camera, setCamera] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof evaluate> | null>(null);
  const [saved, setSaved] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!challenge);
  const raf = useRef(0);
  const pc = project.postcard;

  useEffect(() => {
    if (challenge) { const r = evaluate(challenge, project.cake, project.box); setResult(r); play(r.stars === 3 ? 'tada' : 'chime'); }
    else play('tada');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawStatic = () => {
    const c = ref.current; if (!c || playing) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (comp === 'cakeOnly') { ctx.fillStyle = '#fbf3e4'; ctx.fillRect(0, 0, c.width, c.height); }
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
    compose(tmp.getContext('2d')!, c.width, c.height, project, comp, 0.3);
    ctx.drawImage(tmp, 0, 0);
  };
  // redraw the preview only when something visible changed (debounced while typing)
  useEffect(() => {
    if (playing) return;
    const t = setTimeout(() => { void ensureReady(project).then(drawStatic); }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, comp, playing]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onImageLoad(drawStatic), [project, comp, playing]);

  const playReveal = () => {
    const c = ref.current; if (!c) return;
    setPlaying(true); play('whoosh');
    const ctx = c.getContext('2d')!;
    const t0 = performance.now(), dur = 5200;
    cancelAnimationFrame(raf.current);
    const loop = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      animFrame(ctx, c.width, c.height, project, t);
      if (t < 1) raf.current = requestAnimationFrame(loop);
      else setTimeout(() => setPlaying(false), 1600);
    };
    loop();
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setProgress(0);
    try { await fn(); toast(`${label} saved to your downloads ✿`); play('chime'); }
    catch (e) { toast((e as Error).message || 'Export failed'); }
    finally { setBusy(null); }
  };

  const videoOk = !!pickVideoMime();

  return (
    <div className="min-h-[100dvh] pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b-2 border-wine/10 bg-cream/90 px-3 py-2 backdrop-blur sm:px-4">
        <button className="icon-btn" onClick={onBack} title="Back to box"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <input value={project.name} onChange={(e) => onRename(e.target.value)} className="w-full truncate bg-transparent font-script text-xl text-cherry outline-none" />
          <div className="text-[11px] font-semibold uppercase tracking-widest text-wine/50">Step 3 of 3 · Finish &amp; share</div>
        </div>
        <button className="icon-btn" onClick={onHome} title="Home"><Home size={18} /></button>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-3 pt-5 lg:grid-cols-[1fr_400px] lg:px-6">
        <section>
          <div className="lace mx-auto w-full max-w-[560px] bg-cream p-1">
            <canvas ref={ref} width={900} height={1125} className="block h-auto w-full rounded" />
          </div>
          <div className="mx-auto mt-6 flex max-w-[560px] flex-wrap justify-center gap-2">
            {COMPS.map((c) => (
              <button key={c.id} onClick={() => { setComp(c.id); setPlaying(false); cancelAnimationFrame(raf.current); }} className={`chip ${comp === c.id && !playing ? 'chip-on' : ''}`}>{c.label}</button>
            ))}
            <button onClick={playReveal} className={`chip ${playing ? 'chip-on' : ''}`}><Play size={14} className="mr-1 inline" />Play reveal</button>
          </div>
        </section>

        <aside className="space-y-4">
          {challenge && result && (
            <div className="card p-4 text-center">
              <div className="font-script text-2xl text-cherry">{challenge.title}</div>
              <Stars n={result.stars} />
              <p className="mt-1 font-hand text-xl text-wine">{result.message}</p>
              <button className="mt-1 text-sm font-semibold text-cherry underline" onClick={() => setNotesOpen(true)}>See judge's notes</button>
            </div>
          )}

          <div className="card p-4">
            <h3 className="font-serif text-lg font-bold text-wine">Write your postcard</h3>
            <label className="label">To</label>
            <input value={pc.to} onChange={(e) => onPostcard({ ...pc, to: e.target.value })} className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2 font-hand text-xl outline-none focus:border-rose" />
            <label className="label">Message</label>
            <textarea value={pc.message} rows={3} onChange={(e) => onPostcard({ ...pc, message: e.target.value })} className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2 font-hand text-xl outline-none focus:border-rose" />
            <label className="label">From</label>
            <input value={pc.from} onChange={(e) => onPostcard({ ...pc, from: e.target.value })} className="w-full rounded-2xl border-2 border-wine/15 bg-white/80 p-2 font-hand text-xl outline-none focus:border-rose" />
            <label className="label">Scene</label>
            <Chips value={pc.background} onChange={(v) => onPostcard({ ...pc, background: v })} options={BACKGROUNDS.map((b) => ({ id: b.id, label: b.label }))} />
          </div>

          <div className="card space-y-3 p-4">
            <h3 className="font-serif text-lg font-bold text-wine">Save &amp; share</h3>
            <p className="text-sm text-wine/70">Image export uses the layout selected under the preview: <b>{COMPS.find((c) => c.id === comp)?.label}</b>.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-cream" disabled={!!busy} onClick={() => run('PNG', () => exportImage(project, comp, 'png'))}><ImageIcon size={16} />PNG</button>
              <button className="btn-cream" disabled={!!busy} onClick={() => run('JPG', () => exportImage(project, comp, 'jpg'))}><ImageIcon size={16} />JPG</button>
              <button className="btn-cream" disabled={!!busy} onClick={() => run('GIF', () => exportGif(project, setProgress))}><Sparkles size={16} />Animated GIF</button>
              <button className="btn-cream" disabled={!!busy || !videoOk} title={videoOk ? '' : 'Video recording is not supported in this browser'} onClick={() => run('Video', () => exportVideo(project, setProgress))}><Film size={16} />Video</button>
            </div>
            {!videoOk && <p className="text-xs text-wine/60">This browser can't record video — the animated GIF works everywhere.</p>}
            {busy && (
              <div>
                <div className="mb-1 text-sm font-semibold text-wine">{busy === 'Video' ? 'Recording reveal video…' : busy === 'GIF' ? 'Baking your GIF…' : 'Preparing image…'} {Math.round(progress * 100)}%</div>
                <div className="h-3 overflow-hidden rounded-full bg-blush"><div className="h-full rounded-full bg-cherry transition-all" style={{ width: `${progress * 100}%` }} /></div>
              </div>
            )}
            <button className="btn-cherry w-full" onClick={() => setCamera(true)}><Camera size={18} />Bring your cake to life (camera)</button>
            <button className="btn-cream w-full" disabled={saved} onClick={async () => { await onSave(project.name, result?.stars); setSaved(true); }}><Save size={16} />{saved ? 'Saved to My Cake Collection' : 'Save to My Cake Collection'}</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={onEditCake}><Pencil size={16} />Edit cake</button>
              <button className="btn-ghost" onClick={onHome}><RefreshCcw size={16} />Bake another</button>
            </div>
          </div>
          <p className="px-2 text-xs text-wine/60"><Download size={12} className="mr-1 inline" />Files download straight to your device. Uploaded photos are included in every export.</p>
        </aside>
      </div>

      {camera && <CameraAR project={project} onClose={() => setCamera(false)} />}
      <Modal open={notesOpen && !!result} onClose={() => setNotesOpen(false)} title="The judges have tasted…">
        {result && (
          <div className="text-center">
            <Stars n={result.stars} size={48} />
            <p className="mt-2 font-hand text-2xl text-wine">{result.message}</p>
            <ul className="mt-4 space-y-1.5 text-left">
              {result.criteria.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-wine">
                  {c.ok ? <CheckCircle2 size={18} className="text-cherry" /> : <Circle size={18} className="text-wine/40" />}
                  {c.bonus && <span className="rounded bg-butter px-1 text-[10px] font-bold">BONUS</span>}
                  <span className={c.ok ? '' : 'text-wine/60'}>{c.label}</span>
                </li>
              ))}
            </ul>
            {result.stars < 3 && <button className="btn-cream mt-4 w-full" onClick={onEditCake}>Go back and add the missing touches</button>}
          </div>
        )}
      </Modal>
    </div>
  );
}

