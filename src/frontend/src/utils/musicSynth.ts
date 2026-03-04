/**
 * Procedural futuristic space techno music synthesizer using Web Audio API.
 * Generates a looping space arcade track with:
 * - Driving 4/4 kick drum
 * - Punchy snare on beats 2 & 4
 * - Hi-hat pattern
 * - Arp synth melody (pentatonic space scale)
 * - Sub bassline
 * - Pad atmosphere
 */

export class MusicSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private scheduledNodes: AudioNode[] = [];
  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private nextBarTime = 0;
  private barCount = 0;
  private muted = false;

  // BPM = 138
  private BPM = 138;
  private get beatDuration() {
    return 60 / this.BPM;
  }
  private get barDuration() {
    return this.beatDuration * 4;
  }

  // Space pentatonic notes (Hz): C3, Eb3, F3, G3, Bb3, C4, Eb4, F4, G4, Bb4, C5
  private readonly SCALE = [
    130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23, 392.0,
    466.16, 523.25,
  ];

  // Arp patterns (indices into SCALE)
  private readonly ARP_PATTERNS = [
    [0, 2, 4, 6, 7, 6, 4, 2],
    [0, 3, 5, 7, 8, 7, 5, 3],
    [2, 4, 6, 8, 10, 8, 6, 4],
    [0, 2, 5, 7, 9, 7, 5, 2],
  ];

  // Bass patterns (Hz)
  private readonly BASS_PATTERNS = [
    [65.41, 0, 65.41, 0, 73.42, 0, 77.78, 0],
    [65.41, 0, 73.42, 0, 65.41, 0, 87.31, 0],
  ];

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return this.ctx;
  }

  private playKick(time: number) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSnare(time: number) {
    const ctx = this.getCtx();
    // Noise layer
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 1200;

    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(time);
    noise.stop(time + 0.22);

    // Tonal body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playHihat(time: number, open = false) {
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * (open ? 0.3 : 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 10000;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.25 : 0.04));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(time);
    noise.stop(time + (open ? 0.32 : 0.06));
  }

  private playArp(freq: number, time: number, duration: number) {
    const ctx = this.getCtx();

    // Lead synth: square + detune
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "square";
    osc1.frequency.value = freq;
    osc2.type = "sawtooth";
    osc2.frequency.value = freq * 1.005; // slight detune for chorus

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.linearRampToValueAtTime(800, time + duration * 0.7);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.gain.setValueAtTime(0.12, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0.0, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  private playBass(freq: number, time: number, duration: number) {
    if (freq === 0) return;
    const ctx = this.getCtx();

    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.value = freq;
    subOsc.type = "sine";
    subOsc.frequency.value = freq * 0.5;

    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.01);
    gain.gain.setValueAtTime(0.3, time + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0.0, time + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(time);
    subOsc.start(time);
    osc.stop(time + duration + 0.05);
    subOsc.stop(time + duration + 0.05);
  }

  private playAtmosPad(time: number, duration: number) {
    const ctx = this.getCtx();
    const freqs = [130.81, 196.0, 261.63, 311.13];

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.value = freq;
      filter.type = "lowpass";
      filter.frequency.value = 600;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.04, time + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0.03, time + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0.0, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    }
  }

  private scheduleBar(startTime: number) {
    const beat = this.beatDuration;
    const sixteenth = beat / 4;

    // Drum pattern (16 steps per bar)
    const kickPattern = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const snarePattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
    const hihatPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
    const openHhAt = new Set([7, 15]);

    for (let i = 0; i < 16; i++) {
      const t = startTime + i * sixteenth;
      if (kickPattern[i]) this.playKick(t);
      if (snarePattern[i]) this.playSnare(t);
      if (hihatPattern[i]) this.playHihat(t, openHhAt.has(i));
    }

    // Arp: 8 notes per bar, each lasting a sixteenth
    const arpPattern =
      this.ARP_PATTERNS[this.barCount % this.ARP_PATTERNS.length];
    for (let i = 0; i < 8; i++) {
      const t = startTime + i * (beat / 2);
      this.playArp(this.SCALE[arpPattern[i]], t, beat / 2 - 0.02);
    }

    // Bass: 8 eighth notes per bar
    const bassPattern =
      this.BASS_PATTERNS[this.barCount % this.BASS_PATTERNS.length];
    for (let i = 0; i < 8; i++) {
      const t = startTime + i * (beat / 2);
      this.playBass(bassPattern[i], t, beat / 2 - 0.03);
    }

    // Pad: whole bar
    if (this.barCount % 4 === 0) {
      this.playAtmosPad(startTime, this.barDuration * 4);
    }

    this.barCount++;
  }

  private schedulerLoop() {
    const ctx = this.getCtx();
    const lookAhead = 0.1; // seconds ahead to schedule
    const scheduleInterval = 80; // ms between scheduler runs

    while (this.nextBarTime < ctx.currentTime + lookAhead) {
      this.scheduleBar(this.nextBarTime);
      this.nextBarTime += this.barDuration;
    }

    this.scheduleTimer = setTimeout(() => {
      if (this.isPlaying) this.schedulerLoop();
    }, scheduleInterval);
  }

  start(muted: boolean) {
    if (this.isPlaying) return;
    this.muted = muted;

    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = muted ? 0 : 0.7;
      this.masterGain.connect(ctx.destination);

      this.isPlaying = true;
      this.barCount = 0;
      this.nextBarTime = ctx.currentTime + 0.05;
      this.schedulerLoop();
    } catch (e) {
      console.log("Music synth failed to start:", e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (this.masterGain) {
      const ctx = this.getCtx();
      this.masterGain.gain.setValueAtTime(
        this.masterGain.gain.value,
        ctx.currentTime,
      );
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          this.masterGain?.disconnect();
        } catch {}
        this.masterGain = null;
      }, 600);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) {
      const ctx = this.getCtx();
      this.masterGain.gain.setValueAtTime(
        this.masterGain.gain.value,
        ctx.currentTime,
      );
      this.masterGain.gain.linearRampToValueAtTime(
        muted ? 0 : 0.7,
        ctx.currentTime + 0.1,
      );
    }
  }

  destroy() {
    this.stop();
    try {
      this.ctx?.close();
    } catch {}
    this.ctx = null;
  }
}
