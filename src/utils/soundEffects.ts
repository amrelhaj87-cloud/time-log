// Web Audio API synthesized Chime and Bell sounds (no external asset downloads required, zero latency)

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    this.soundEnabled = localStorage.getItem('timerSoundEnabled') !== 'false';
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('timerSoundEnabled', enabled ? 'true' : 'false');
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Shared helper to schedule a sequence of gentle Web Audio chime notes
   */
  private playToneSequence(
    notes: Array<{ freq: number; time: number; dur: number; peakGain?: number; type?: OscillatorType }>
  ) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      notes.forEach(({ freq, time, dur, peakGain = 0.2, type = 'sine' }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + time);

        // Gentle strike and smooth exponential decay
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(peakGain, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Play a pleasant ascending bell / chime sound when a focus session completes
   */
  public playTimerCompleteChime() {
    // Chime notes: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
    this.playToneSequence([
      { freq: 659.25, time: 0, dur: 0.8 },
      { freq: 830.61, time: 0.15, dur: 0.9 },
      { freq: 987.77, time: 0.3, dur: 1.1 },
      { freq: 1318.51, time: 0.45, dur: 1.5 }
    ]);
  }

  /**
   * Play a distinct, crisp two-pulse chime when a break finishes so the user tells break vs focus apart by ear
   */
  public playBreakCompleteChime() {
    this.playToneSequence([
      { freq: 1046.5, time: 0, dur: 0.28, peakGain: 0.18, type: 'triangle' },
      { freq: 783.99, time: 0.16, dur: 0.35, peakGain: 0.16, type: 'triangle' },
      { freq: 1046.5, time: 0.42, dur: 0.35, peakGain: 0.2, type: 'sine' },
      { freq: 1318.51, time: 0.58, dur: 0.9, peakGain: 0.18, type: 'sine' }
    ]);
  }

  /**
   * Play a subtle click / tap feedback
   */
  public playClick() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  /**
   * Play an uplifting two-tone success chime
   */
  public playSuccess() {
    this.playToneSequence([
      { freq: 587.33, time: 0, dur: 0.15, peakGain: 0.12 },
      { freq: 880.0, time: 0.1, dur: 0.35, peakGain: 0.12 }
    ]);
  }
}

export const soundManager = new SoundManager();
