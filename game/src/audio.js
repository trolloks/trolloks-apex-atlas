// Tiny WebAudio voice: every sound is synthesised, so the game ships no audio files and
// still clicks, deals, reveals and lands a win.
let context = null;
let muted = false;

try {
  muted = window.localStorage.getItem('apex-atlas-muted') === '1';
} catch {
  // No storage: sound starts on.
}

function ac() {
  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  return context;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    window.localStorage.setItem('apex-atlas-muted', muted ? '1' : '0');
  } catch {
    // ignore
  }
  return muted;
}

function tone(freq, duration, type = 'sine', gain = 0.05, slide = 0) {
  if (muted) return;
  const ctx = ac();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + duration);
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(env).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

export const sound = {
  select: () => tone(520, 0.08, 'triangle', 0.035),
  place: () => tone(300, 0.16, 'triangle', 0.05, -80),
  deal: () => tone(700, 0.09, 'sine', 0.025, -120),
  reveal: () => {
    tone(440, 0.12, 'square', 0.02);
    setTimeout(() => tone(660, 0.18, 'square', 0.02), 90);
  },
  win: () => [0, 140, 280, 420].forEach((at, i) => setTimeout(() => tone([523, 659, 784, 1047][i], 0.5, 'triangle', 0.05), at)),
  lose: () => [0, 180, 380].forEach((at, i) => setTimeout(() => tone([392, 330, 262][i], 0.55, 'sine', 0.05), at)),
  pack: () => [0, 90, 180].forEach((at, i) => setTimeout(() => tone([660, 880, 1320][i], 0.35, 'triangle', 0.04), at)),
};
