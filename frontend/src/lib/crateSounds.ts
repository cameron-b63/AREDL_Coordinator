export interface CrateSoundController {
  playRoll: (durationMs: number) => void;
  playReveal: () => void;
  stop: () => void;
}

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

function playClick(context: AudioContext, when: number): void {
  const clickDuration = 0.014;
  const bufferSize = Math.max(1, Math.ceil(context.sampleRate * clickDuration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    const decay = Math.exp(-index / (bufferSize * 0.22));
    data[index] = (Math.random() * 2 - 1) * decay;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2400 + Math.random() * 900, when);
  filter.Q.setValueAtTime(5.5, when);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.42, when + 0.0008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + clickDuration);

  const peg = context.createOscillator();
  peg.type = 'square';
  peg.frequency.setValueAtTime(920 + Math.random() * 160, when);
  const pegGain = context.createGain();
  pegGain.gain.setValueAtTime(0.0001, when);
  pegGain.gain.exponentialRampToValueAtTime(0.06, when + 0.0005);
  pegGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.007);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  peg.connect(pegGain);
  pegGain.connect(context.destination);

  source.start(when);
  source.stop(when + clickDuration);
  peg.start(when);
  peg.stop(when + 0.008);
}

function playTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function createCrateSoundController(): CrateSoundController {
  let context: AudioContext | null = null;
  let rollTimer: number | null = null;
  let rollStart = 0;
  let rollDuration = 0;

  function ensureContext(): AudioContext | null {
    if (!context) {
      context = getAudioContext();
    }
    if (context?.state === 'suspended') {
      void context.resume();
    }
    return context;
  }

  function clearRollTimer(): void {
    if (rollTimer != null) {
      window.clearTimeout(rollTimer);
      rollTimer = null;
    }
  }

  function scheduleNextTick(): void {
    if (rollTimer == null) {
      return;
    }
    const audioContext = ensureContext();
    if (!audioContext) {
      return;
    }

    const elapsed = performance.now() - rollStart;
    if (elapsed >= rollDuration) {
      clearRollTimer();
      return;
    }

    const progress = Math.min(1, elapsed / rollDuration);
    const intervalMs = 60 + progress * progress * 190;
    playClick(audioContext, audioContext.currentTime);

    rollTimer = window.setTimeout(scheduleNextTick, intervalMs);
  }

  return {
    playRoll(durationMs: number) {
      this.stop();
      const audioContext = ensureContext();
      if (!audioContext) {
        return;
      }

      rollStart = performance.now();
      rollDuration = durationMs;
      playClick(audioContext, audioContext.currentTime);
      rollTimer = window.setTimeout(scheduleNextTick, 60);
    },

    playReveal() {
      clearRollTimer();
      const audioContext = ensureContext();
      if (!audioContext) {
        return;
      }

      const now = audioContext.currentTime;
      playTone(audioContext, 660, now, 0.14, 0.18);
      playTone(audioContext, 880, now + 0.12, 0.18, 0.2);
    },

    stop() {
      clearRollTimer();
      rollDuration = 0;
    },
  };
}
