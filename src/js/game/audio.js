// =========================================
// Sound Effects (WebAudio, oscillator-only)
// =========================================
// No external assets: every sound is a short oscillator sweep with a
// decay envelope. The AudioContext is created lazily on the first user
// gesture (browser autoplay policy), so initAudio() must be called from
// an input handler before any playSfx() can be heard.

const MUTE_STORAGE_KEY = 'orbitBloomMuted';

let audioCtx = null;
let masterGain = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
} catch (e) {
  // localStorage unavailable (e.g. blocked); sound stays on for the session
}

/**
 * Create the AudioContext. Safe to call repeatedly; only the first call
 * does work. Must be called from a user gesture handler.
 */
export function initAudio() {
  if (audioCtx) {
    // A context created before the tab was interacted with may be suspended
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(audioCtx.destination);
}

export function isMuted() {
  return muted;
}

/**
 * Toggle mute. Returns the new muted state.
 */
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch (e) {
    // persistence unavailable; the toggle still works for this session
  }
  return muted;
}

// name: [waveform, startHz, endHz, duration, gain]
const SFX = {
  shoot: ['square', 880, 660, 0.04, 0.1],
  enemyHit: ['triangle', 220, 180, 0.05, 0.25],
  explosion: ['sawtooth', 220, 40, 0.18, 0.5],
  playerHit: ['sawtooth', 160, 40, 0.35, 0.9],
  dash: ['sine', 200, 600, 0.12, 0.35],
  powerUp: ['sine', 440, 880, 0.35, 0.5],
  gameOver: ['sawtooth', 330, 55, 0.7, 0.7],
};

/**
 * Play a named one-shot sound effect
 */
export function playSfx(name) {
  if (muted || !audioCtx || audioCtx.state !== 'running') return;
  const def = SFX[name];
  if (!def) return;
  const [type, startHz, endHz, duration, gain] = def;

  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startHz, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endHz, 1), t0 + duration);

  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(env);
  env.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
