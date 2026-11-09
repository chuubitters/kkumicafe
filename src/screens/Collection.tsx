import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Copy, Trash2, Share2, Info } from 'lucide-react';
import type { Project } from '../types';
import { deleteProject, listProjects, saveProject } from '../lib/storage';
import { uid } from '../lib/geometry';
import { Modal, Stars, toast } from '../components/ui';
import { play } from '../lib/sound';

export default function Collection({ onBack, onOpen, onExport, onNew }: { onBack: () => void; onOpen: (p: Project) => void; onExport: (p: Project) => void; onNew: () => void }) {
  const [list, setList] = useState<Project[] | null>(null);
  const [confirm, setConfirm] = useState<Project | null>(null);
  const refresh = () => listProjects().then(setList);
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="screen-enter mx-auto min-h-[100dvh] max-w-6xl px-4 py-4 pb-12">
      <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
      <h1 className="-mt-6 text-center font-script text-4xl text-cherry sm:text-5xl">My Cake Collection</h1>
      <p className="mx-auto mb-6 mt-2 flex max-w-xl items-start gap-2 rounded-2xl bg-cream/80 p-3 text-sm text-wine/80">
        <Info size={18} className="mt-0.5 shrink-0 text-cherry" />
        Your cakes are saved in this browser on this device only. They aren't uploaded or shared with other people — export an image, GIF or video to share them.
      </p>
      {list === null && <p className="text-center text-wine/60">Opening the recipe box…</p>}
      {list?.length === 0 && (
        <div className="card mx-auto max-w-md p-8 text-center">
          <div className="font-script text-3xl text-cherry">No cakes yet</div>
          <p className="mt-2 text-wine/70">Your saved creations will sit on these shelves.</p>
          <button className="btn-cherry mt-4" onClick={onNew}>Bake your first cake</button>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((p) => (
          <article key={p.id} className="card group flex flex-col overflow-hidden">
            <button onClick={() => onOpen(p)} className="relative flex h-56 items-center justify-center bg-[radial-gradient(circle_at_50%_70%,#fff,#f6c9d3)]">
              {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-52 w-52 object-contain transition group-hover:scale-105" /> : <span className="font-script text-2xl text-cherry">Sweet cake</span>}
              {p.mode === 'challenge' && p.stars ? <span className="absolute left-3 top-3"><Stars n={p.stars} size={18} /></span> : null}
            </button>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="truncate font-script text-2xl text-cherry">{p.name}</h2>
              <p className="text-xs uppercase tracking-wider text-wine/60">{new Date(p.updatedAt).toLocaleString()} · {p.mode === 'challenge' ? 'Challenge' : 'Free studio'}</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <button className="icon-btn w-full rounded-xl" title="Open & edit" onClick={() => onOpen(p)}><Pencil size={16} /></button>
                <button className="icon-btn w-full rounded-xl" title="Export again" onClick={() => onExport(p)}><Share2 size={16} /></button>
                <button className="icon-btn w-full rounded-xl" title="Duplicate" onClick={async () => { await saveProject({ ...p, id: uid(), name: p.name + ' (copy)', createdAt: Date.now() }); play('pop'); toast('Duplicated'); void refresh(); }}><Copy size={16} /></button>
                <button className="icon-btn w-full rounded-xl text-cherry" title="Delete" onClick={() => setConfirm(p)}><Trash2 size={16} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete this cake?">
        <p className="text-wine/80">“{confirm?.name}” will be removed from this browser. This can't be undone.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-cream flex-1" onClick={() => setConfirm(null)}>Keep it</button>
          <button className="btn-cherry flex-1" onClick={async () => { if (confirm) await deleteProject(confirm.id); setConfirm(null); void refresh(); }}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
