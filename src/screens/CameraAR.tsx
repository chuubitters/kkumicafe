import { useEffect, useRef, useState } from 'react';
import { X, Camera, SwitchCamera, Circle, Square, Sparkles, ImagePlus, Package, Cake as CakeIcon } from 'lucide-react';
import type { Project } from '../types';
import { animFrame, sparkle } from '../render/scene';
import { cakeImage } from '../render/cake';
import { downloadBlob, ensureReady, pickVideoMime, slug } from '../export/media';
import { play } from '../lib/sound';
import { toast } from '../components/ui';

type Status = 'intro' | 'starting' | 'live' | 'fallback';

/** Camera overlay "AR" — the cake pops out over the live camera feed. No tracking:
 *  the cake is a movable, pinch-scalable object composited on top of the video. */
export default function CameraAR({ project, onClose }: { project: Project; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>('intro');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [mode, setMode] = useState<'box' | 'cake'>('box');
  const [recording, setRecording] = useState(false);
  const bgImg = useRef<HTMLImageElement | null>(null);
  const obj = useRef({ x: 0.5, y: 0.6, s: 1 });
  const popStart = useRef(performance.now());
  const lastAnimT = useRef(0);
  const sprite = useRef<HTMLCanvasElement | null>(null);
  const anim = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ d0: number; s0: number; x0: number; y0: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    void ensureReady(project).then(() => {
      sprite.current = cakeImage(project.cake, 900, 0.5).canvas;
      // smaller animation buffer on phones keeps the camera smooth
      const small = Math.min(window.innerWidth, window.innerHeight) < 700;
      const a = document.createElement('canvas'); a.width = small ? 480 : 720; a.height = small ? 600 : 900; anim.current = a;
    });
  }, [project]);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => () => stop(), []);

  const start = async (face = facing) => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access is not available in this browser (it needs HTTPS and a camera).'); setStatus('fallback'); return; }
    setStatus('starting');
    try {
      stop();
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      streamRef.current = s;
      const v = videoRef.current!; v.srcObject = s; await v.play();
      setStatus('live'); pop();
    } catch (e) {
      const n = (e as DOMException).name;
      setError(n === 'NotAllowedError' ? 'Camera permission was denied. You can allow it in your browser settings, or use a photo instead.' : 'Could not start the camera. You can use a photo as the background instead.');
      setStatus('fallback');
    }
  };

  const pop = () => { popStart.current = performance.now(); lastAnimT.current = 0; play('whoosh'); setTimeout(() => play('tada'), 1600); };

  // render loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = canvasRef.current; if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const ctx = c.getContext('2d')!;
      const v = videoRef.current;
      const src: CanvasImageSource | null = status === 'live' && v && v.readyState >= 2 ? v : bgImg.current;
      if (src) {
        const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth;
        const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight;
        const sc = Math.max(W / sw, H / sh);
        ctx.save();
        if (status === 'live' && facing === 'user') { ctx.translate(W, 0); ctx.scale(-1, 1); }
        ctx.drawImage(src, (W - sw * sc) / 2, (H - sh * sc) / 2, sw * sc, sh * sc);
        ctx.restore();
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f6c9d3'); g.addColorStop(1, '#fbf3e4');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const t = Math.min(1, (performance.now() - popStart.current) / 3600);
      const o = obj.current;
      const base = Math.min(W, H) * 0.9 * o.s;
      if (modeRef.current === 'box' && anim.current) {
        const a = anim.current, actx = a.getContext('2d')!;
        const at = Math.min(1, t * 1.05);
        // once the reveal finishes, keep the last frame instead of re-rendering it every frame
        if (!(at >= 1 && lastAnimT.current >= 1)) {
          actx.clearRect(0, 0, a.width, a.height);
          animFrame(actx, a.width, a.height, project, at, { background: false });
        }
        lastAnimT.current = at;
        const w = base, h = base * (a.height / a.width);
        ctx.drawImage(a, o.x * W - w / 2, o.y * H - h * 0.62, w, h);
      } else if (sprite.current) {
        const u = Math.min(1, (performance.now() - popStart.current) / 900);
        const bounce = u < 1 ? 1 + Math.sin(u * Math.PI * 2.5) * (1 - u) * 0.35 - (1 - u) * (1 - u) * 0.9 : 1;
        const w = base * Math.max(0.05, bounce);
        // cheap contact shadow (shadowBlur is very slow on phones)
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(o.x * W, o.y * H + w * 0.3, w * 0.4, w * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(sprite.current, o.x * W - w / 2, o.y * H - w * 0.6, w, w);
        if (u < 1 || (performance.now() - popStart.current) < 2500) {
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 + u, d = base * (0.25 + u * 0.4);
            sparkle(ctx, o.x * W + Math.cos(ang) * d, o.y * H - base * 0.15 + Math.sin(ang) * d * 0.6, 14 * dpr * Math.abs(Math.sin(performance.now() / 200 + i)), 1 - Math.max(0, (performance.now() - popStart.current - 1500) / 1000));
          }
        }
      }
      // watermark
      ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.font = `${22 * dpr}px Pacifico, cursive`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('Kkumi Cafe', W - 16 * dpr, H - 14 * dpr);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [status, facing, project]);

  const local = (e: React.PointerEvent) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const o = obj.current;
    gesture.current = pts.length >= 2
      ? { d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), s0: o.s, x0: 0, y0: 0, ox: o.x, oy: o.y }
      : { d0: 0, s0: o.s, x0: pts[0].x, y0: pts[0].y, ox: o.x, oy: o.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()], g = gesture.current, o = obj.current;
    if (pts.length >= 2 && g.d0) o.s = Math.max(0.2, Math.min(3, (g.s0 * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)) / g.d0));
    else if (pts.length === 1 && !g.d0) { o.x = g.ox + pts[0].x - g.x0; o.y = g.oy + pts[0].y - g.y0; }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const pts = [...pointers.current.values()];
    gesture.current = pts.length === 1 ? { d0: 0, s0: obj.current.s, x0: pts[0].x, y0: pts[0].y, ox: obj.current.x, oy: obj.current.y } : null;
  };

  const snap = () => {
    canvasRef.current?.toBlob((b) => { if (b) { downloadBlob(b, `${slug(project.name)}-camera.png`); toast('Photo saved ✿'); play('chime'); } }, 'image/png');
  };
  const record = async () => {
    const c = canvasRef.current; const mime = pickVideoMime();
    if (!c || !mime) { toast('Video recording is not supported in this browser'); return; }
    const stream = c.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { downloadBlob(new Blob(chunks, { type: mime.split(';')[0] }), `${slug(project.name)}-camera.${mime.includes('mp4') ? 'mp4' : 'webm'}`); setRecording(false); toast('Video saved ✿'); };
    setRecording(true); pop(); rec.start(200);
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), 5500);
  };

  const pickImage = (f?: File) => {
    if (!f) return;
    const img = new Image(); img.onload = () => { bgImg.current = img; setStatus('fallback'); pop(); }; img.src = URL.createObjectURL(f);
  };

  return (
    <div className="fixed inset-0 z-50 bg-wine">
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => { obj.current.s = Math.max(0.2, Math.min(3, obj.current.s * (e.deltaY < 0 ? 1.08 : 0.92))); }} />
      <button className="icon-btn absolute right-4 top-4 z-10" onClick={() => { stop(); onClose(); }} aria-label="Close camera"><X size={20} /></button>

      {(status === 'intro' || status === 'starting' || (status === 'fallback' && !bgImg.current)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-wine/50 p-4 backdrop-blur-sm">
          <div className="card animate-pop max-w-sm p-6 text-center">
            <div className="font-script text-3xl text-cherry">Cake in the real world</div>
            <p className="mt-2 text-wine/80">Open your camera and watch your cake pop out of its box right where you are. Drag to move it, pinch (or scroll) to resize, then snap a photo or record a clip.</p>
            {error && <p className="mt-3 rounded-2xl bg-blush p-3 text-sm text-wine">{error}</p>}
            <button className="btn-cherry mt-4 w-full" disabled={status === 'starting'} onClick={() => start()}><Camera size={18} />{status === 'starting' ? 'Waiting for permission…' : 'Open camera'}</button>
            <label className="btn-cream mt-2 w-full cursor-pointer"><ImagePlus size={18} />Use a photo instead
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} /></label>
            <p className="mt-3 text-xs text-wine/60">The camera only turns on after you press the button. Nothing is uploaded.</p>
          </div>
        </div>
      )}

      {(status === 'live' || bgImg.current) && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button className="icon-btn h-12 w-12" title={mode === 'box' ? 'Cake only' : 'Cake from box'} onClick={() => { setMode(mode === 'box' ? 'cake' : 'box'); pop(); }}>{mode === 'box' ? <CakeIcon size={20} /> : <Package size={20} />}</button>
          <button className="icon-btn h-12 w-12" title="Pop again" onClick={pop}><Sparkles size={20} /></button>
          <button className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-cherry text-white shadow-soft active:scale-95" title="Take photo" onClick={snap}><Camera size={26} /></button>
          <button className={`icon-btn h-12 w-12 ${recording ? 'animate-pulse text-cherry' : ''}`} title="Record 5s video" disabled={recording} onClick={record}>{recording ? <Square size={18} /> : <Circle size={20} fill="#c8203a" className="text-cherry" />}</button>
          {status === 'live' && <button className="icon-btn h-12 w-12" title="Switch camera" onClick={() => { const f = facing === 'environment' ? 'user' : 'environment'; setFacing(f); void start(f); }}><SwitchCamera size={20} /></button>}
        </div>
      )}
    </div>
  );
}
