import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Project } from '../types';
import { preloadImages } from '../lib/images';
import { animFrame, compose, Composition } from '../render/scene';

export async function ensureReady(p: Project) {
  try {
    await Promise.all(['Pacifico', 'Caveat', '"Playfair Display"', 'Fredoka', 'Shrikhand', '"Dancing Script"'].map((f) => document.fonts.load(`32px ${f}`)));
  } catch { /* ignore */ }
  await preloadImages(Object.values(p.cake.photos));
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const slug = (s: string) => (s || 'sweet-cake').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sweet-cake';

export async function renderComposition(p: Project, kind: Composition, W = 1080, H = 1350, t = 0) {
  await ensureReady(p);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  compose(c.getContext('2d')!, W, H, p, kind, t);
  return c;
}

export async function exportImage(p: Project, kind: Composition, format: 'png' | 'jpg') {
  const c = await renderComposition(p, kind);
  let out = c;
  if (format === 'jpg') {
    // JPG has no transparency: put cake-only renders on cream paper
    out = document.createElement('canvas'); out.width = c.width; out.height = c.height;
    const x = out.getContext('2d')!; x.fillStyle = '#fbf3e4'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0);
  }
  const blob = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), format === 'png' ? 'image/png' : 'image/jpeg', 0.92));
  downloadBlob(blob, `${slug(p.name)}-${kind}.${format}`);
  return blob;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function exportGif(p: Project, onProgress?: (f: number) => void) {
  await ensureReady(p);
  const W = 400, H = 500, frames = 44;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const gif = GIFEncoder();
  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    animFrame(ctx, W, H, p, t);
    const { data } = ctx.getImageData(0, 0, W, H);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, W, H, { palette, delay: i === frames - 1 ? 2200 : i === 0 ? 600 : 90 });
    onProgress?.((i + 1) / frames);
    await tick();
  }
  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  downloadBlob(blob, `${slug(p.name)}-reveal.gif`);
  return blob;
}

export function pickVideoMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const cands = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return cands.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

/** Record a canvas animation in real time using MediaRecorder. */
export async function recordCanvas(c: HTMLCanvasElement, durationMs: number, draw: (t: number) => void, onProgress?: (f: number) => void) {
  const mime = pickVideoMime();
  if (!mime || !('captureStream' in c)) throw new Error('Video recording is not supported in this browser. Try Chrome, Edge, Firefox or Safari 14.1+, or export a GIF instead.');
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(200);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const loop = () => {
      const t = Math.min(1, (performance.now() - t0) / durationMs);
      draw(t); onProgress?.(t);
      if (t < 1) requestAnimationFrame(loop); else res();
    };
    loop();
  });
  rec.stop(); await done;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}

export async function exportVideo(p: Project, onProgress?: (f: number) => void) {
  await ensureReady(p);
  const W = 720, H = 900;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  // keep it in the DOM (offscreen) so some browsers keep painting it
  c.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;';
  document.body.appendChild(c);
  try {
    const total = 6000;
    const { blob, ext } = await recordCanvas(c, total, (t) => animFrame(ctx, W, H, p, Math.min(1, t * 1.25)), onProgress);
    downloadBlob(blob, `${slug(p.name)}-reveal.${ext}`);
    return { blob, ext };
  } finally { c.remove(); }
}
