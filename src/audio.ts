export class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private initialized = false;
  private onStateChange?: (muted: boolean, unlocked: boolean) => void;

  constructor(onStateChange?: (muted: boolean, unlocked: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isUnlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.initialized && !this.muted) {
      this.unlock();
    } else if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().then(() => {
        this.notify();
      }).catch(() => {});
    }
    this.applyMasterMute();
    this.notify();
    return this.muted;
  }

  public unlock(): void {
    if (!this.initialized) {
      this.initGraph();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.applyMasterMute();
        this.notify();
      }).catch(() => {});
    } else {
      this.applyMasterMute();
      this.notify();
    }
  }

  public setSilent(silent: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.muted || silent ? 0.0001 : 0.72;
    this.masterGain.gain.setTargetAtTime(target, now, 0.25);
  }

  private notify(): void {
    this.onStateChange?.(this.muted, this.isUnlocked());
  }

  private applyMasterMute(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0.0001 : 0.72;
    this.masterGain.gain.setTargetAtTime(target, now, 0.14);
  }

  private createCosmicImpulseResponse(ctx: AudioContext, durationSec = 4.2): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 2.6) * (0.35 + 0.65 * Math.sin(Math.min(1, t * 18) * Math.PI * 0.5));
        const white = Math.random() * 2 - 1;
        // Suavizado pasa-bajos progresivo para cola espacial cálida y sin asperezas
        const damp = 0.22 - t * 0.14;
        prev = prev + damp * (white - prev);
        data[i] = prev * env;
      }
    }
    return buffer;
  }

  private initGraph(): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    this.initialized = true;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 18;
    limiter.ratio.value = 3;
    limiter.attack.value = 0.03;
    limiter.release.value = 0.35;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.muted ? 0.0001 : 0.72;
    limiter.connect(masterGain);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // Bus espacial con reverberación cósmica estéreo
    const dryBus = ctx.createGain();
    dryBus.gain.value = 0.62;
    dryBus.connect(limiter);

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = this.createCosmicImpulseResponse(ctx, 4.2);

    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.value = 1350;
    wetFilter.Q.value = 0.6;

    const wetBus = ctx.createGain();
    wetBus.gain.value = 0.52;
    reverbConvolver.connect(wetFilter);
    wetFilter.connect(wetBus);
    wetBus.connect(limiter);

    // 1. Cimiento sub-cósmico profundo y orgánico (D1 / A1 / D2)
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 125;
    subFilter.Q.value = 0.7;

    const subBus = ctx.createGain();
    subBus.gain.value = 0.22;
    subFilter.connect(subBus);
    subBus.connect(dryBus);
    subBus.connect(reverbConvolver);

    const subSpecs = [
      { freq: 36.71, type: 'sine' as OscillatorType, gain: 0.52 },
      { freq: 55.0, type: 'triangle' as OscillatorType, gain: 0.16 },
      { freq: 73.42, type: 'sine' as OscillatorType, gain: 0.28 },
      { freq: 73.62, type: 'sine' as OscillatorType, gain: 0.24 }, // leve batimiento binaural espacial
    ];

    subSpecs.forEach((spec) => {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.value = spec.freq;
      const g = ctx.createGain();
      g.gain.value = spec.gain;
      osc.connect(g);
      g.connect(subFilter);
      osc.start();
    });

    const subDriftLfo = ctx.createOscillator();
    subDriftLfo.type = 'sine';
    subDriftLfo.frequency.value = 0.028;
    const subDriftGain = ctx.createGain();
    subDriftGain.gain.value = 26;
    subDriftLfo.connect(subDriftGain);
    subDriftGain.connect(subFilter.frequency);
    subDriftLfo.start();

    // 2. Coro etéreo de armónicos interestelares en evolución lenta (acorde abierto suspendido)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 340;
    padFilter.Q.value = 1.1;

    const padBus = ctx.createGain();
    padBus.gain.value = 0.16;
    padFilter.connect(padBus);
    padBus.connect(dryBus);
    padBus.connect(reverbConvolver);

    const padLfo = ctx.createOscillator();
    padLfo.type = 'sine';
    padLfo.frequency.value = 0.019;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 145;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start();

    const harmonicVoices = [
      { freq: 110.0, pan: -0.45, baseGain: 0.24, lfoRate: 0.021, lfoDepth: 0.14 },
      { freq: 146.83, pan: 0.35, baseGain: 0.22, lfoRate: 0.027, lfoDepth: 0.15 },
      { freq: 164.81, pan: -0.25, baseGain: 0.16, lfoRate: 0.017, lfoDepth: 0.12 },
      { freq: 220.0, pan: 0.48, baseGain: 0.14, lfoRate: 0.031, lfoDepth: 0.11 },
      { freq: 293.66, pan: 0.0, baseGain: 0.08, lfoRate: 0.014, lfoDepth: 0.07 },
    ];

    harmonicVoices.forEach((v, idx) => {
      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = v.freq;

      const oscB = ctx.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = v.freq * (1 + (idx % 2 === 0 ? 0.0022 : -0.0019));

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = v.baseGain;

      const ampLfo = ctx.createOscillator();
      ampLfo.type = 'sine';
      ampLfo.frequency.value = v.lfoRate;
      const ampDepth = ctx.createGain();
      ampDepth.gain.value = v.lfoDepth;
      ampLfo.connect(ampDepth);
      ampDepth.connect(voiceGain.gain);
      ampLfo.start();

      const panner = ctx.createStereoPanner();
      panner.pan.value = v.pan;

      oscA.connect(voiceGain);
      oscB.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(padFilter);

      oscA.start();
      oscB.start();
    });

    // 3. Viento solar y polvo de plasma en dos bandas espaciales
    const noiseLen = ctx.sampleRate * 5;
    const noiseBuffer = ctx.createBuffer(2, noiseLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.032;
        b6 = white * 0.115926;
        data[i] = pink;
      }
      const fadeSamples = 3072;
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = noiseLen - fadeSamples + i;
        const blended = data[i] * t + data[endIdx] * (1 - t);
        data[i] = blended;
        data[endIdx] = blended;
      }
    }

    // Banda grave: brisa interestelar profunda
    const lowWindSource = ctx.createBufferSource();
    lowWindSource.buffer = noiseBuffer;
    lowWindSource.loop = true;

    const lowWindFilter = ctx.createBiquadFilter();
    lowWindFilter.type = 'lowpass';
    lowWindFilter.frequency.value = 175;
    lowWindFilter.Q.value = 0.7;

    const lowWindGain = ctx.createGain();
    lowWindGain.gain.value = 0.11;

    lowWindSource.connect(lowWindFilter);
    lowWindFilter.connect(lowWindGain);
    lowWindGain.connect(dryBus);
    lowWindGain.connect(reverbConvolver);
    lowWindSource.start();

    const lowWindLfo = ctx.createOscillator();
    lowWindLfo.type = 'sine';
    lowWindLfo.frequency.value = 0.024;
    const lowWindLfoGain = ctx.createGain();
    lowWindLfoGain.gain.value = 42;
    lowWindLfo.connect(lowWindLfoGain);
    lowWindLfoGain.connect(lowWindFilter.frequency);
    lowWindLfo.start();

    // Banda media-alta: susurro de plasma electromagnético espacial con paneo lento
    const plasmaWindSource = ctx.createBufferSource();
    plasmaWindSource.buffer = noiseBuffer;
    plasmaWindSource.loop = true;
    plasmaWindSource.playbackRate.value = 0.94;

    const plasmaFilter = ctx.createBiquadFilter();
    plasmaFilter.type = 'bandpass';
    plasmaFilter.frequency.value = 720;
    plasmaFilter.Q.value = 2.4;

    const plasmaPanner = ctx.createStereoPanner();
    plasmaPanner.pan.value = 0;

    const plasmaGain = ctx.createGain();
    plasmaGain.gain.value = 0.036;

    plasmaWindSource.connect(plasmaFilter);
    plasmaFilter.connect(plasmaPanner);
    plasmaPanner.connect(plasmaGain);
    plasmaGain.connect(reverbConvolver);
    plasmaWindSource.start();

    const plasmaFreqLfo = ctx.createOscillator();
    plasmaFreqLfo.type = 'sine';
    plasmaFreqLfo.frequency.value = 0.031;
    const plasmaFreqGain = ctx.createGain();
    plasmaFreqGain.gain.value = 240;
    plasmaFreqLfo.connect(plasmaFreqGain);
    plasmaFreqGain.connect(plasmaFilter.frequency);
    plasmaFreqLfo.start();

    const plasmaPanLfo = ctx.createOscillator();
    plasmaPanLfo.type = 'sine';
    plasmaPanLfo.frequency.value = 0.045;
    const plasmaPanGain = ctx.createGain();
    plasmaPanGain.gain.value = 0.65;
    plasmaPanLfo.connect(plasmaPanGain);
    plasmaPanGain.connect(plasmaPanner.pan);
    plasmaPanLfo.start();
  }
}
