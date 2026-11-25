// Web Audio API synthesized Ambient Background Sounds & Focus Music Engine
// 100% offline, zero latency, no external mp3 assets needed.

export type AmbientSoundType = 'none' | 'rain' | 'waves' | 'forest' | 'whitenoise' | 'brownnoise' | 'binaural' | 'calm';

/** Which Pomodoro tab a sound list belongs to. */
export type AmbientMode = 'focus' | 'break';

export interface AmbientSoundOption {
  id: AmbientSoundType;
  labelAr: string;
  labelEn: string;
  icon: string;
}

const MUTE_OPTION: AmbientSoundOption = { id: 'none', labelAr: 'بدون صوت', labelEn: 'No sound', icon: '🔇' };

/**
 * Focus sounds: steady, low-detail backgrounds that mask distractions.
 * Each one is audibly different (bright noise / deep noise / natural / tonal).
 */
export const FOCUS_SOUND_OPTIONS: AmbientSoundOption[] = [
  MUTE_OPTION,
  { id: 'whitenoise', labelAr: 'ضوضاء بيضاء', labelEn: 'White noise', icon: '🎧' },
  { id: 'brownnoise', labelAr: 'ضوضاء بنية عميقة', labelEn: 'Deep brown noise', icon: '🟤' },
  { id: 'rain', labelAr: 'مطر هادئ', labelEn: 'Gentle rain', icon: '🌧️' },
  { id: 'binaural', labelAr: 'نغمات ألفا', labelEn: 'Alpha tones', icon: '🎵' }
];

/** Break sounds: softer, slower and clearly different from the focus sounds. */
export const BREAK_SOUND_OPTIONS: AmbientSoundOption[] = [
  MUTE_OPTION,
  { id: 'waves', labelAr: 'أمواج البحر', labelEn: 'Ocean waves', icon: '🌊' },
  { id: 'forest', labelAr: 'غابة وعصافير', labelEn: 'Forest & birds', icon: '🍃' },
  { id: 'calm', labelAr: 'نغمة هادئة', labelEn: 'Calm tone', icon: '🌙' }
];

/** Every sound (for looking up a label/icon by id). */
export const AMBIENT_SOUND_OPTIONS: AmbientSoundOption[] = [
  ...FOCUS_SOUND_OPTIONS,
  ...BREAK_SOUND_OPTIONS.filter((o) => o.id !== 'none')
];

export function soundOptionsFor(mode: AmbientMode): AmbientSoundOption[] {
  return mode === 'focus' ? FOCUS_SOUND_OPTIONS : BREAK_SOUND_OPTIONS;
}

const SOUND_STORAGE_KEY: Record<AmbientMode, string> = {
  focus: 'focus_ambient_type',
  break: 'break_ambient_type'
};

/** The saved sound for a tab; anything not in that tab's list (e.g. the removed "cafe") → none. */
export function loadSoundChoice(mode: AmbientMode): AmbientSoundType {
  if (typeof window === 'undefined') return 'none';
  const saved = localStorage.getItem(SOUND_STORAGE_KEY[mode]);
  return soundOptionsFor(mode).some((o) => o.id === saved) ? (saved as AmbientSoundType) : 'none';
}

export function saveSoundChoice(mode: AmbientMode, type: AmbientSoundType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY[mode], type);
}

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: AmbientSoundType = 'none';
  private isPlaying: boolean = false;
  private volume: number = 0.5;

  // Active nodes cleanup handles
  private activeNodes: { stop?: () => void; disconnect: () => void }[] = [];
  private intervalIds: number[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('focus_ambient_volume');
      if (savedVol) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('focus_ambient_volume', String(this.volume));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getCurrentType(): AmbientSoundType {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public stop() {
    this.cleanupNodes();
    this.isPlaying = false;
  }

  private cleanupNodes() {
    // Clear recurring intervals (e.g. sporadic drops/birds)
    this.intervalIds.forEach((id) => window.clearInterval(id));
    this.intervalIds = [];

    // Stop and disconnect nodes
    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    this.activeNodes = [];
  }

  public playSound(type: AmbientSoundType) {
    this.currentType = type;

    this.cleanupNodes();

    if (type === 'none') {
      this.isPlaying = false;
      return;
    }

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    this.isPlaying = true;

    switch (type) {
      case 'rain':
        this.setupRain(ctx, this.masterGain);
        break;
      case 'waves':
        this.setupWaves(ctx, this.masterGain);
        break;
      case 'forest':
        this.setupForest(ctx, this.masterGain);
        break;
      case 'calm':
        this.setupCalm(ctx, this.masterGain);
        break;
      case 'whitenoise':
        this.setupWhiteNoise(ctx, this.masterGain);
        break;
      case 'brownnoise':
        this.setupBrownNoise(ctx, this.masterGain);
        break;
      case 'binaural':
        this.setupBinaural(ctx, this.masterGain);
        break;
      default:
        this.isPlaying = false;
        break;
    }
  }

  // Create a continuous noise buffer
  private createNoiseBuffer(ctx: AudioContext, durationSec = 4, tint: 'pink' | 'brown' = 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (tint === 'brown') {
          output[i] = (lastOut + 0.015 * white) / 1.015;
          lastOut = output[i];
          output[i] *= 4.0;
        } else {
          // Pink-tinted random noise
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Gain boost
        }
      }
    }
    return buffer;
  }

  // 1. Rain Synthesizer
  private setupRain(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 5);
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(400, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(rainGain);
    rainGain.connect(dest);

    noise.start();
    this.activeNodes.push(noise, lowpass, highpass, rainGain);

    // Random raindrops
    const interval = window.setInterval(() => {
      if (!this.isPlaying || this.currentType !== 'rain') return;
      try {
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const now = ctx.currentTime;
        const freq = 1200 + Math.random() * 1800;

        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(freq, now);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.06);

        dropGain.gain.setValueAtTime(0.001, now);
        dropGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.04, now + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        dropOsc.connect(dropGain);
        dropGain.connect(dest);

        dropOsc.start(now);
        dropOsc.stop(now + 0.07);
      } catch {}
    }, 180);
    this.intervalIds.push(interval);
  }

  // 2. Ocean Waves Synthesizer
  private setupWaves(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 6);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.2, ctx.currentTime);

    // LFO for rhythmic swell
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(dest);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, waveGain, lfo, lfoGain);
  }

  // 3. Zen Forest & Breeze Synthesizer
  private setupForest(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 6);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.25, ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(dest);

    noise.start();
    this.activeNodes.push(noise, filter, windGain);

    // Intermittent bird chimes
    const interval = window.setInterval(() => {
      if (!this.isPlaying || this.currentType !== 'forest') return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const startFreq = 2200 + Math.random() * 1000;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq + 600, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(startFreq - 200, now + 0.2);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.04, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(g);
        g.connect(dest);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch {}
    }, 3800);
    this.intervalIds.push(interval);
  }

  private setupFilteredNoise(
    ctx: AudioContext,
    dest: GainNode,
    cutoffHz: number,
    gainVal: number,
    durationSec = 4,
    tint: 'pink' | 'brown' = 'pink'
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, durationSec, tint);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start();
    this.activeNodes.push(noise, filter, gain);
  }

  // 5. White Noise Focus Synthesizer
  private setupWhiteNoise(ctx: AudioContext, dest: GainNode) {
    this.setupFilteredNoise(ctx, dest, 2500, 0.3, 4, 'pink');
  }

  // 5b. Deep Brown Noise Synthesizer (warm low-frequency rumble for long focus)
  private setupBrownNoise(ctx: AudioContext, dest: GainNode) {
    this.setupFilteredNoise(ctx, dest, 320, 0.42, 5, 'brown');
  }

  // 6. Binaural 10Hz Alpha Focus Waves (Left 216Hz, Right 226Hz + Soft Zen Drone)
  private setupBinaural(ctx: AudioContext, dest: GainNode) {
    const oscLeft = ctx.createOscillator();
    const oscRight = ctx.createOscillator();
    const oscDrone = ctx.createOscillator();

    const gainLeft = ctx.createGain();
    const gainRight = ctx.createGain();
    const gainDrone = ctx.createGain();

    const merger = ctx.createChannelMerger(2);

    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(216, ctx.currentTime); // Base frequency
    gainLeft.gain.setValueAtTime(0.2, ctx.currentTime);

    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(226, ctx.currentTime); // +10Hz Alpha beat
    gainRight.gain.setValueAtTime(0.2, ctx.currentTime);

    // Warm underlying drone
    oscDrone.type = 'triangle';
    oscDrone.frequency.setValueAtTime(108, ctx.currentTime);
    gainDrone.gain.setValueAtTime(0.1, ctx.currentTime);

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);

    // Channel separation for stereo binaural effect
    gainLeft.connect(merger, 0, 0); // Left ear
    gainRight.connect(merger, 0, 1); // Right ear

    merger.connect(dest);

    oscDrone.connect(gainDrone);
    gainDrone.connect(dest);

    oscLeft.start();
    oscRight.start();
    oscDrone.start();

    this.activeNodes.push(oscLeft, oscRight, oscDrone, gainLeft, gainRight, gainDrone, merger);
  }

  // 7. Calm tone (break): a soft, slowly breathing major chord — no noise at all,
  // so it never sounds like the focus sounds.
  private setupCalm(ctx: AudioContext, dest: GainNode) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.connect(dest);
    this.activeNodes.push(filter);

    // C3 · G3 · C4 · E4 — each voice swells on its own slow cycle (10–20 s).
    const voices: [number, number, number][] = [
      [130.81, 0.07, 0.05],
      [196.0, 0.05, 0.07],
      [261.63, 0.045, 0.09],
      [329.63, 0.03, 0.06]
    ];
    for (const [freq, level, rate] of voices) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(rate, ctx.currentTime);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(level * 0.8, ctx.currentTime);
      lfo.connect(lfoDepth);
      lfoDepth.connect(gain.gain);

      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      lfo.start();
      this.activeNodes.push(osc, gain, lfo, lfoDepth);
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
