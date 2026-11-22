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
    const target = this.muted || silent ? 0.0001 : 0.74;
    this.masterGain.gain.setTargetAtTime(target, now, 0.25);
  }

  private notify(): void {
    this.onStateChange?.(this.muted, this.isUnlocked());
  }

  private applyMasterMute(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0.0001 : 0.74;
    this.masterGain.gain.setTargetAtTime(target, now, 0.14);
  }

  private createAbyssalImpulseResponse(ctx: AudioContext, durationSec = 6.6): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let prevA = 0;
      let prevB = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Ataque lento de caverna abismal + cola exponencial profunda
        const swellIn = Math.sin(Math.min(1, t * 12) * Math.PI * 0.5);
        const env = Math.pow(1 - t, 2.15) * (0.25 + 0.75 * swellIn);
        const white = Math.random() * 2 - 1;
        // Doble filtro pasa-bajos progresivo para reverberación oscura y misteriosa
        const damp = 0.14 - t * 0.10;
        prevA = prevA + damp * (white - prevA);
        prevB = prevB + damp * 0.85 * (prevA - prevB);
        data[i] = prevB * env;
      }
    }
    return buffer;
  }

  private initGraph(): void {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    this.initialized = true;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.knee.value = 18;
    limiter.ratio.value = 3.2;
    limiter.attack.value = 0.035;
    limiter.release.value = 0.4;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.muted ? 0.0001 : 0.74;
    limiter.connect(masterGain);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // Bus de abismo profundo: mezcla seca contenida y cola reverberante oscura y vasta
    const dryBus = ctx.createGain();
    dryBus.gain.value = 0.48;
    dryBus.connect(limiter);

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = this.createAbyssalImpulseResponse(ctx, 6.6);

    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.value = 840;
    wetFilter.Q.value = 0.68;

    const wetBus = ctx.createGain();
    wetBus.gain.value = 0.64;
    reverbConvolver.connect(wetFilter);
    wetFilter.connect(wetBus);
    wetBus.connect(limiter);

    // 1. Cimiento abismal sub-gravedad (A0 / C1 con batimiento lento / G1 / C2)
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 92;
    subFilter.Q.value = 0.85;

    const subBus = ctx.createGain();
    subBus.gain.value = 0.27;
    subFilter.connect(subBus);
    subBus.connect(dryBus);
    subBus.connect(reverbConvolver);

    const subSpecs = [
      { freq: 27.5, type: 'sine' as OscillatorType, gain: 0.46 },
      { freq: 32.7, type: 'sine' as OscillatorType, gain: 0.34 },
      { freq: 32.91, type: 'sine' as OscillatorType, gain: 0.32 }, // batimiento abismal lento (~0.21 Hz)
      { freq: 48.99, type: 'triangle' as OscillatorType, gain: 0.14 },
      { freq: 65.41, type: 'sine' as OscillatorType, gain: 0.22 },
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
    subDriftLfo.frequency.value = 0.014;
    const subDriftGain = ctx.createGain();
    subDriftGain.gain.value = 24;
    subDriftLfo.connect(subDriftGain);
    subDriftGain.connect(subFilter.frequency);
    subDriftLfo.start();

    const subBreathLfo = ctx.createOscillator();
    subBreathLfo.type = 'sine';
    subBreathLfo.frequency.value = 0.011;
    const subBreathGain = ctx.createGain();
    subBreathGain.gain.value = 0.05;
    subBreathLfo.connect(subBreathGain);
    subBreathGain.connect(subBus.gain);
    subBreathLfo.start();

    // 2. Coro misterioso y sombrío (armonía oscura menor / frigia con tritonos velados)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 255;
    padFilter.Q.value = 1.35;

    const padBus = ctx.createGain();
    padBus.gain.value = 0.16;
    padFilter.connect(padBus);
    padBus.connect(dryBus);
    padBus.connect(reverbConvolver);

    const padLfo = ctx.createOscillator();
    padLfo.type = 'sine';
    padLfo.frequency.value = 0.013;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 115;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start();

    const mysteryVoices = [
      { freq: 110.0, pan: -0.42, baseGain: 0.22, lfoRate: 0.012, lfoDepth: 0.15, driftRate: 0.036, driftHz: 0.28 },
      { freq: 116.54, pan: 0.52, baseGain: 0.06, lfoRate: 0.009, lfoDepth: 0.05, driftRate: 0.041, driftHz: 0.35 },
      { freq: 130.81, pan: 0.34, baseGain: 0.19, lfoRate: 0.017, lfoDepth: 0.14, driftRate: 0.032, driftHz: 0.30 },
      { freq: 155.56, pan: -0.62, baseGain: 0.075, lfoRate: 0.011, lfoDepth: 0.065, driftRate: 0.048, driftHz: 0.42 },
      { freq: 164.81, pan: -0.22, baseGain: 0.15, lfoRate: 0.021, lfoDepth: 0.12, driftRate: 0.038, driftHz: 0.32 },
      { freq: 196.0, pan: 0.46, baseGain: 0.11, lfoRate: 0.015, lfoDepth: 0.09, driftRate: 0.044, driftHz: 0.38 },
      { freq: 246.94, pan: 0.06, baseGain: 0.065, lfoRate: 0.019, lfoDepth: 0.055, driftRate: 0.052, driftHz: 0.45 },
    ];

    mysteryVoices.forEach((v, idx) => {
      const oscA = ctx.createOscillator();
      oscA.type = idx % 3 === 0 ? 'triangle' : 'sine';
      oscA.frequency.value = v.freq;

      const oscB = ctx.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = v.freq * (1 + (idx % 2 === 0 ? 0.0026 : -0.0024));

      // Micro deriva orgánica de afinación para sensación espectral e hipnótica
      const pitchLfo = ctx.createOscillator();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.value = v.driftRate;
      const pitchDepth = ctx.createGain();
      pitchDepth.gain.value = v.driftHz;
      pitchLfo.connect(pitchDepth);
      pitchDepth.connect(oscA.frequency);
      pitchLfo.start();

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

    // 3. Ecos espectrales lejanos en el vacío (100% húmedos hacia la reverberación abismal)
    const ghostVoices = [
      { freq: 440.0, pan: -0.58, gain: 0.014, rate: 0.013 },
      { freq: 622.25, pan: 0.64, gain: 0.011, rate: 0.009 },
    ];
    ghostVoices.forEach((gv) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = gv.freq;

      const g = ctx.createGain();
      g.gain.value = gv.gain;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = gv.rate;
      const lfoG = ctx.createGain();
      lfoG.gain.value = gv.gain * 0.9;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start();

      const panner = ctx.createStereoPanner();
      panner.pan.value = gv.pan;

      osc.connect(g);
      g.connect(panner);
      panner.connect(reverbConvolver);
      osc.start();
    });

    // 4. Corriente profunda de abismo y susurro misterioso en tres bandas de ruido filtrado
    const noiseLen = ctx.sampleRate * 6;
    const noiseBuffer = ctx.createBuffer(2, noiseLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let brown = 0;
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.028;
        b6 = white * 0.115926;
        brown = brown * 0.985 + white * 0.032;
        data[i] = pink * 0.58 + brown * 0.42;
      }
      const fadeSamples = 4096;
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = noiseLen - fadeSamples + i;
        const blended = data[i] * t + data[endIdx] * (1 - t);
        data[i] = blended;
        data[endIdx] = blended;
      }
    }

    // Banda sub-abismal: presión oscura del vacío profundo
    const abyssRumbleSource = ctx.createBufferSource();
    abyssRumbleSource.buffer = noiseBuffer;
    abyssRumbleSource.loop = true;

    const abyssRumbleFilter = ctx.createBiquadFilter();
    abyssRumbleFilter.type = 'lowpass';
    abyssRumbleFilter.frequency.value = 115;
    abyssRumbleFilter.Q.value = 0.85;

    const abyssRumbleGain = ctx.createGain();
    abyssRumbleGain.gain.value = 0.14;

    abyssRumbleSource.connect(abyssRumbleFilter);
    abyssRumbleFilter.connect(abyssRumbleGain);
    abyssRumbleGain.connect(dryBus);
    abyssRumbleGain.connect(reverbConvolver);
    abyssRumbleSource.start();

    const rumbleLfo = ctx.createOscillator();
    rumbleLfo.type = 'sine';
    rumbleLfo.frequency.value = 0.018;
    const rumbleLfoGain = ctx.createGain();
    rumbleLfoGain.gain.value = 38;
    rumbleLfo.connect(rumbleLfoGain);
    rumbleLfoGain.connect(abyssRumbleFilter.frequency);
    rumbleLfo.start();

    // Banda resonante cavernosa: gemido grave misterioso del vacío
    const hollowWindSource = ctx.createBufferSource();
    hollowWindSource.buffer = noiseBuffer;
    hollowWindSource.loop = true;
    hollowWindSource.playbackRate.value = 0.84;

    const hollowFilter = ctx.createBiquadFilter();
    hollowFilter.type = 'bandpass';
    hollowFilter.frequency.value = 165;
    hollowFilter.Q.value = 4.6;

    const hollowPanner = ctx.createStereoPanner();
    hollowPanner.pan.value = -0.25;

    const hollowGain = ctx.createGain();
    hollowGain.gain.value = 0.052;

    hollowWindSource.connect(hollowFilter);
    hollowFilter.connect(hollowPanner);
    hollowPanner.connect(hollowGain);
    hollowGain.connect(reverbConvolver);
    hollowWindSource.start();

    const hollowFreqLfo = ctx.createOscillator();
    hollowFreqLfo.type = 'sine';
    hollowFreqLfo.frequency.value = 0.021;
    const hollowFreqGain = ctx.createGain();
    hollowFreqGain.gain.value = 55;
    hollowFreqLfo.connect(hollowFreqGain);
    hollowFreqGain.connect(hollowFilter.frequency);
    hollowFreqLfo.start();

    // Banda fantasma media-alta: susurro misterioso errante con paneo estéreo lento
    const whisperSource = ctx.createBufferSource();
    whisperSource.buffer = noiseBuffer;
    whisperSource.loop = true;
    whisperSource.playbackRate.value = 0.92;

    const whisperFilter = ctx.createBiquadFilter();
    whisperFilter.type = 'bandpass';
    whisperFilter.frequency.value = 460;
    whisperFilter.Q.value = 3.8;

    const whisperPanner = ctx.createStereoPanner();
    whisperPanner.pan.value = 0;

    const whisperGain = ctx.createGain();
    whisperGain.gain.value = 0.028;

    whisperSource.connect(whisperFilter);
    whisperFilter.connect(whisperPanner);
    whisperPanner.connect(whisperGain);
    whisperGain.connect(reverbConvolver);
    whisperSource.start();

    const whisperFreqLfo = ctx.createOscillator();
    whisperFreqLfo.type = 'sine';
    whisperFreqLfo.frequency.value = 0.027;
    const whisperFreqGain = ctx.createGain();
    whisperFreqGain.gain.value = 180;
    whisperFreqLfo.connect(whisperFreqGain);
    whisperFreqGain.connect(whisperFilter.frequency);
    whisperFreqLfo.start();

    const whisperPanLfo = ctx.createOscillator();
    whisperPanLfo.type = 'sine';
    whisperPanLfo.frequency.value = 0.038;
    const whisperPanGain = ctx.createGain();
    whisperPanGain.gain.value = 0.72;
    whisperPanLfo.connect(whisperPanGain);
    whisperPanGain.connect(whisperPanner.pan);
    whisperPanLfo.start();
  }
}
