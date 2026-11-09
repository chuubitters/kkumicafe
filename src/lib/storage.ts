import { createStore, del, get, keys, set, getMany } from 'idb-keyval';
import type { Project } from '../types';

// Creations live in this browser's IndexedDB. They are not uploaded anywhere
// and are not shared between devices or users.
let store: ReturnType<typeof createStore> | null = null;
const memory = new Map<string, Project>();
let idbOk = true;

function s() {
  if (!store) store = createStore('kkumicafe', 'creations');
  return store;
}

async function safe<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!idbOk) return fallback();
  try { return await fn(); } catch (e) { console.warn('IndexedDB unavailable, using memory', e); idbOk = false; return fallback(); }
}

export async function saveProject(p: Project) {
  const v = { ...p, updatedAt: Date.now() };
  memory.set(p.id, v);
  await safe(() => set(p.id, v, s()), () => undefined);
  return v;
}

export async function listProjects(): Promise<Project[]> {
  const all = await safe(async () => {
    const ks = (await keys(s())).filter((k) => k !== '__draft__');
    return (await getMany(ks as string[], s())) as Project[];
  }, () => [...memory.values()]);
  return all.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string) {
  return safe(() => get<Project>(id, s()), () => memory.get(id));
}

export async function deleteProject(id: string) {
  memory.delete(id);
  await safe(() => del(id, s()), () => undefined);
}

export async function saveDraft(p: Project) {
  await safe(() => set('__draft__', p, s()), () => undefined);
}
export async function loadDraft() {
  return safe(() => get<Project>('__draft__', s()), () => undefined);
}

export function getPref(key: string, def: string) {
  try { return localStorage.getItem('sp:' + key) ?? def; } catch { return def; }
}
export function setPref(key: string, v: string) {
  try { localStorage.setItem('sp:' + key, v); } catch { /* ignore */ }
}
