import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoxState, CakeState, Postcard, Project, Screen } from './types';
import Home from './screens/Home';
import { ModeSelect, ChallengeSelect } from './screens/ModeSelect';
import Editor from './screens/Editor';
import BoxStudio from './screens/BoxStudio';
import Final from './screens/Final';
import Collection from './screens/Collection';
import { Toaster, toast } from './components/ui';
import { newProject } from './lib/defaults';
import { CHALLENGES, type Challenge } from './lib/challenges';
import { saveProject } from './lib/storage';
import { cakeThumb } from './render/thumbs';
import { play, setSound, soundEnabled } from './lib/sound';

const NEEDS_PROJECT: Screen[] = ['editor', 'box', 'final'];

export default function App() {
  const [screen, setScreenState] = useState<Screen>('home');
  const [project, setProject] = useState<Project | null>(null);
  const [sound, setSoundState] = useState(soundEnabled());
  const projectRef = useRef(project); projectRef.current = project;
  const challenge: Challenge | undefined = project?.challengeId ? CHALLENGES.find((c) => c.id === project.challengeId) : undefined;

  // lightweight hash routing so the browser back button works
  const go = useCallback((s: Screen, replace = false) => {
    setScreenState(s);
    const url = s === 'home' ? '#/' : `#/${s}`;
    try { if (replace) history.replaceState({ s }, '', url); else history.pushState({ s }, '', url); } catch { /* sandboxed frames */ }
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const read = () => {
      const s = (location.hash.replace(/^#\/?/, '') || 'home') as Screen;
      const valid: Screen[] = ['home', 'mode', 'challenges', 'editor', 'box', 'final', 'collection'];
      setScreenState(valid.includes(s) ? s : 'home');
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => { if (NEEDS_PROJECT.includes(screen) && !project) go('home', true); }, [screen, project, go]);

  const onCake = useCallback((cake: CakeState) => setProject((p) => (p && p.cake !== cake ? { ...p, cake } : p)), []);
  const onBox = useCallback((box: BoxState) => setProject((p) => (p && p.box !== box ? { ...p, box } : p)), []);
  const onPostcard = useCallback((postcard: Postcard) => setProject((p) => (p ? { ...p, postcard } : p)), []);

  const save = async (name: string, stars?: number) => {
    const project = projectRef.current;
    if (!project) return;
    try {
      const saved = await saveProject({ ...project, name: name.trim() || 'Untitled cake', thumbnail: cakeThumb(project.cake, 420), stars: stars ?? project.stars });
      setProject(saved);
      play('chime'); toast('Saved to My Cake Collection ✿');
    } catch (e) { toast('Could not save: ' + (e as Error).message); }
  };

  const start = (mode: Project['mode'], ch?: Challenge) => {
    const p = newProject(mode, ch?.id);
    if (ch) p.name = ch.title;
    setProject(p); play('pop'); go('editor');
  };

  return (
    <>
      {screen === 'home' && <Home onPlay={() => { play('pop'); go('mode'); }} onCollection={() => go('collection')} sound={sound} onSound={() => { setSound(!sound); setSoundState(!sound); }} />}
      {screen === 'mode' && <ModeSelect onBack={() => go('home')} onFree={() => start('free')} onChallenge={() => { play('click'); go('challenges'); }} />}
      {screen === 'challenges' && <ChallengeSelect onBack={() => go('mode')} onPick={(c) => start('challenge', c)} />}
      {screen === 'editor' && project && (
        <Editor key={project.id} project={project} challenge={challenge} onChange={onCake} onBack={() => go(project.mode === 'challenge' ? 'challenges' : 'mode')}
          onNext={() => { play('whoosh'); go('box'); }} onSave={(n) => save(n)} />
      )}
      {screen === 'box' && project && <BoxStudio key={project.id} cake={project.cake} box={project.box} onChange={onBox} onBack={() => go('editor')} onNext={() => go('final')} />}
      {screen === 'final' && project && (
        <Final project={project} challenge={challenge} onPostcard={onPostcard} onBack={() => go('box')} onSave={save}
          onHome={() => go('home')} onEditCake={() => go('editor')} onRename={(name) => setProject({ ...project, name })} />
      )}
      {screen === 'collection' && (
        <Collection onBack={() => go('home')} onNew={() => go('mode')}
          onOpen={(p) => { setProject(p); go('editor'); }} onExport={(p) => { setProject(p); go('final'); }} />
      )}
      <Toaster />
    </>
  );
}
