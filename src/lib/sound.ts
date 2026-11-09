import { getPref, setPref } from './storage';

let ctx: AudioContext | null = null;
let enabled = getPref('sound', '1') === '1';

export const soundEnabled = () => enabled;
export function setSound(on: boolean) { enabled = on; setPref('sound', on ? '1' : '0'); if (on) play('chime'); }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 1, delay = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}

function squish() {
  const a = ac(); if (!a) return;
  const len = 0.18, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const g = a.createGain(); g.gain.value = 0.18;
  src.connect(f).connect(g).connect(a.destination); src.start();
}

export function play(kind: 'pop' | 'click' | 'squish' | 'chime' | 'whoosh' | 'tada') {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'pop': tone(520, 0.12, 'sine', 0.2, 1.8); break;
      case 'click': tone(900, 0.05, 'triangle', 0.08, 0.8); break;
      case 'squish': squish(); break;
      case 'chime': [784, 988, 1175].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, 1, i * 0.08)); break;
      case 'whoosh': tone(200, 0.4, 'sawtooth', 0.04, 4); break;
      case 'tada': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.12, 1, i * 0.1)); break;
    }
  } catch { /* audio not available */ }
}
