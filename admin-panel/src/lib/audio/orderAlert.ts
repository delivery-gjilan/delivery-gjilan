let lastPlayedAt = 0;
const ALERT_COOLDOWN_MS = 1500;
const ALERT_AUDIO_SRC = '/sounds/beep.wav';

const isBrowser = () => typeof window !== 'undefined';

type AlertState = {
  context: AudioContext | null;
  htmlAudio: HTMLAudioElement | null;
  listenersAttached: boolean;
};

declare global {
  interface Window {
    __adminOrderAlertState?: AlertState;
  }
}

function getState(): AlertState {
  if (!isBrowser()) {
    return { context: null, htmlAudio: null, listenersAttached: false };
  }

  if (!window.__adminOrderAlertState) {
    window.__adminOrderAlertState = { context: null, htmlAudio: null, listenersAttached: false };
  }

  return window.__adminOrderAlertState;
}

function getHtmlAudio(): HTMLAudioElement | null {
  if (!isBrowser()) return null;

  const state = getState();
  if (state.htmlAudio) return state.htmlAudio;

  const audio = new Audio(ALERT_AUDIO_SRC);
  audio.preload = 'auto';
  audio.volume = 1;
  state.htmlAudio = audio;
  return state.htmlAudio;
}

function getAudioContext(): AudioContext | null {
  if (!isBrowser()) return null;

  const state = getState();
  if (state.context) return state.context;

  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;

  state.context = new Ctor();
  return state.context;
}

function attachAudioUnlockListeners(ctx: AudioContext) {
  if (!isBrowser()) return;

  const state = getState();
  if (state.listenersAttached) return;

  const htmlAudio = getHtmlAudio();

  const unlock = () => {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (htmlAudio) {
      // Best-effort priming for browsers that require user gesture before play.
      const p = htmlAudio.play();
      if (p && typeof p.then === 'function') {
        void p.then(() => {
          htmlAudio.pause();
          htmlAudio.currentTime = 0;
        }).catch(() => {
          // Ignore; fallback tone remains available.
        });
      }
    }

    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
  };

  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
  state.listenersAttached = true;
}

function playTone(ctx: AudioContext, frequency: number, offsetSec: number, durationSec: number) {
  const startAt = ctx.currentTime + offsetSec;
  const endAt = startAt + durationSec;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.38, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

export async function playNewOrderAlert(): Promise<void> {
  if (!isBrowser()) return;

  const now = Date.now();
  if (now - lastPlayedAt < ALERT_COOLDOWN_MS) return;

  const htmlAudio = getHtmlAudio();
  if (htmlAudio) {
    try {
      htmlAudio.currentTime = 0;
      await htmlAudio.play();
      lastPlayedAt = now;
      return;
    } catch {
      // Ignore and continue to synthesized fallback.
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  attachAudioUnlockListeners(ctx);

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  if (ctx.state !== 'running') return;

  playTone(ctx, 880, 0, 0.12);
  playTone(ctx, 1174, 0.17, 0.12);
  playTone(ctx, 1320, 0.33, 0.13);
  lastPlayedAt = now;
}
