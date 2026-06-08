/**
 * Random level crate sounds.
 *
 * Spin: procedural wheel click (no asset files).
 * Land: one sample per sound tier — place files under `frontend/public/sounds/crate/`
 * and map filenames in LAND_FILES below. Full guide: `public/sounds/crate/README.md`.
 *
 * Tier → file mapping is resolved at reveal time via `resolveCrateSoundTier()` in
 * `levelCrateSoundTier.ts`. Playback is triggered from `RandomLevelCrateOverlay.tsx`.
 */
import type { CrateSoundTier } from './levelCrateSoundTier';

export interface CrateSoundController {
  playSpinClick: () => void;
  playLand: (tier: CrateSoundTier) => void;
  stop: () => void;
}

// ---------------------------------------------------------------------------
// Land assets — link your files here (also documented in public/sounds/crate/)
// ---------------------------------------------------------------------------

/** Served from Vite `public/` at `${import.meta.env.BASE_URL}sounds/crate/`. */
const SOUND_BASE = `${import.meta.env.BASE_URL}sounds/crate/`;

/** Filename for each tier. Keys must match every `CrateSoundTier` in levelCrateSoundTier.ts. */
const LAND_FILES: Record<CrateSoundTier, string> = {
  easy: 'land-easy.ogg',
  neutral: 'land-neutral.ogg',
  hard: 'land-hard.ogg',
  extreme: 'land-extreme.ogg',
  lethal: 'land-lethal.ogg',
  apex150: 'land-apex150.ogg',
  apex75: 'land-apex75.ogg',
  apex10: 'land-apex10.ogg',
};

/** Per-tier playback volume (0–1). Tune after dropping in your masters. */
const LAND_GAIN: Record<CrateSoundTier, number> = {
  easy: 0.55,
  neutral: 0.65,
  hard: 0.72,
  extreme: 0.8,
  lethal: 0.88,
  apex150: 0.92,
  apex75: 0.96,
  apex10: 1,
};

const MASTER_GAIN = 0.95;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextClass = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  return new AudioContextClass();
}

function createMasterBus(context: AudioContext): GainNode {
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(context.destination);
  return master;
}

function fillNoiseBuffer(
  context: AudioContext,
  duration: number,
  decayRate: number,
): AudioBuffer {
  const bufferSize = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    const progress = index / bufferSize;
    const envelope = Math.exp(-progress * decayRate);
    data[index] = (Math.random() * 2 - 1) * envelope;
  }
  return buffer;
}

function playFilteredNoise(
  context: AudioContext,
  master: GainNode,
  when: number,
  duration: number,
  filterType: BiquadFilterType,
  frequency: number,
  q: number,
  peak: number,
): void {
  const source = context.createBufferSource();
  source.buffer = fillNoiseBuffer(context, duration, 5);
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, when);
  filter.Q.setValueAtTime(q, when);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(when);
  source.stop(when + duration + 0.01);
}

function playThump(
  context: AudioContext,
  master: GainNode,
  when: number,
  startHz: number,
  endHz: number,
  attack: number,
  duration: number,
  peak: number,
): void {
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(startHz, when);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), when + duration);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.02);
}

function playProceduralSpinClick(context: AudioContext, master: GainNode, when: number): void {
  const jitter = Math.random() * 120;
  playFilteredNoise(context, master, when, 0.006, 'highpass', 2200 + jitter, 0.8, 0.38);
  playFilteredNoise(context, master, when + 0.001, 0.014, 'bandpass', 900 + jitter, 1.4, 0.32);
  playThump(context, master, when, 420 + jitter, 180, 0.001, 0.022, 0.18);
}

async function loadBuffer(context: AudioContext, fileName: string): Promise<AudioBuffer> {
  const response = await fetch(`${SOUND_BASE}${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load sound: ${fileName}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return context.decodeAudioData(arrayBuffer);
}

export function createCrateSoundController(): CrateSoundController {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  const landBuffers = new Map<CrateSoundTier, AudioBuffer>();
  let loadPromise: Promise<void> | null = null;

  function ensureContext(): AudioContext | null {
    if (!context) {
      context = getAudioContext();
      if (context) {
        master = createMasterBus(context);
      }
    }
    if (context?.state === 'suspended') {
      void context.resume();
    }
    return context;
  }

  function ensureLandSamplesLoaded(): Promise<void> {
    const audioContext = ensureContext();
    if (!audioContext) {
      return Promise.resolve();
    }
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = (async () => {
      const tiers = Object.keys(LAND_FILES) as CrateSoundTier[];
      await Promise.all(
        tiers.map(async (tier) => {
          landBuffers.set(tier, await loadBuffer(audioContext, LAND_FILES[tier]));
        }),
      );
    })().catch((error: unknown) => {
      loadPromise = null;
      console.warn('[crateSounds] Land sample load failed:', error);
    });

    return loadPromise;
  }

  function playBuffer(buffer: AudioBuffer, gainValue: number): void {
    const audioContext = ensureContext();
    if (!audioContext || !master) {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = audioContext.createGain();
    gain.gain.value = gainValue;
    source.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    playSpinClick() {
      const audioContext = ensureContext();
      if (!audioContext || !master) {
        return;
      }
      playProceduralSpinClick(audioContext, master, audioContext.currentTime);
    },

    playLand(tier: CrateSoundTier) {
      void ensureLandSamplesLoaded().then(() => {
        const buffer = landBuffers.get(tier);
        if (buffer) {
          playBuffer(buffer, LAND_GAIN[tier]);
        }
      });
    },

    stop() {
      // One-shot sounds; nothing to cancel.
    },
  };
}
