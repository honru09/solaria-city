// Solaria City - Procedural WebAudio Synthesis Engine

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.muted = false;

    // Engine synth state
    this.engineOsc = null;
    this.engineOscGain = null;
    this.engineGain = null;
    this.engineSub = null;
    this.isEngineRunning = false;

    // Siren state
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.isSirenRunning = false;

    // Music loop state
    this.musicRunning = false;
    this.musicTimer = null;
    this.currentStep = 0;
    this.bpm = 118;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

      // Compressor tames peaks from stacked synths (buzz/clipping control)
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startMusic();
    } catch {
      // AudioContext unavailable in headless or restricted environment
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : 0.65, this.ctx.currentTime);
    }
    return this.muted;
  }

  // --- Sound Effects ---

  startEngine(basePitch = 1.0) {
    if (!this.ctx || this.isEngineRunning) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSub = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSub.type = 'triangle';

      const now = this.ctx.currentTime;
      this.engineOsc.frequency.setValueAtTime(55 * basePitch, now);
      this.engineSub.frequency.setValueAtTime(27.5 * basePitch, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      this.engineGain.gain.setValueAtTime(0.05, now);

      // Saw runs at a low 0.35 mix so the triangle sub carries the engine tone
      this.engineOscGain = this.ctx.createGain();
      this.engineOscGain.gain.setValueAtTime(0.35, now);
      this.engineOsc.connect(this.engineOscGain);
      this.engineOscGain.connect(filter);
      this.engineSub.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
      this.engineSub.start();
      this.isEngineRunning = true;
    } catch {
      // ignore
    }
  }

  updateEngine(speedRatio, accel) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc) return;
    try {
      const now = this.ctx.currentTime;
      const targetFreq = 50 + speedRatio * 160 + (accel ? 40 : 0);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
      const targetVol = 0.035 + speedRatio * 0.075 + (accel ? 0.025 : 0);
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
    } catch {
      // ignore
    }
  }

  stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) this.engineOsc.stop();
      if (this.engineSub) this.engineSub.stop();
    } catch {
      // ignore
    }
    this.engineOsc = null;
    this.engineOscGain = null;
    this.engineSub = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  startSiren() {
    if (!this.ctx || this.isSirenRunning) return;
    try {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

      // Police 2-tone wail (650Hz to 1100Hz at ~1.6Hz oscillation)
      this.sirenLfo.type = 'triangle';
      this.sirenLfo.frequency.setValueAtTime(1.6, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(260, this.ctx.currentTime);

      this.sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      this.sirenLfo.start();

      // Starts silent; PoliceManager drives the volume by distance via setSirenVolume
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);

      this.sirenOsc.start();
      this.isSirenRunning = true;
    } catch {
      // ignore
    }
  }

  setSirenVolume(v) {
    if (!this.ctx || !this.isSirenRunning || !this.sirenGain) return;
    const clamped = Math.max(0, Math.min(0.12, v));
    this.sirenGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.1);
  }

  stopSiren() {
    if (!this.isSirenRunning) return;
    try {
      if (this.sirenOsc) this.sirenOsc.stop();
      if (this.sirenLfo) this.sirenLfo.stop();
    } catch {
      // ignore
    }
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.isSirenRunning = false;
  }

  playGunshot() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 1. Noise burst for muzzle blast
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.18));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);

      // 2. Low-frequency punch kick
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'triangle';
      kick.frequency.setValueAtTime(180, now);
      kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      kickGain.gain.setValueAtTime(0.8, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      kick.connect(kickGain);
      kickGain.connect(this.sfxGain);
      kick.start(now);
      kick.stop(now + 0.14);
    } catch {
      // ignore
    }
  }

  playPunch() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // ignore
    }
  }

  playCrash(intensity = 1.0) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + intensity * 400, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.9, 0.4 + intensity * 0.4), now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
    } catch {
      // ignore
    }
  }

  playTireScreech() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }

  playDoor() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  playMissionPass() {
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880]; // A major fanfare
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.48);
      });
    } catch {
      // ignore
    }
  }

  playMissionFail() {
    if (!this.ctx) return;
    try {
      const notes = [330, 311.13, 293.66, 277.18]; // Minor descending
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + idx * 0.16;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.28, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch {
      // ignore
    }
  }

  playUIClick() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.04);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  // --- Procedural Synthwave Radio Music ---
  startMusic() {
    if (this.musicRunning || !this.ctx) return;
    this.musicRunning = true;
    this.currentStep = 0;
    const stepInterval = (60 / this.bpm) / 4; // 16th note in seconds

    // Bassline chord progression in F minor (F, Ab, Eb, Db)
    const bassline = [
      87.31, 87.31, 87.31, 87.31, 103.83, 103.83, 103.83, 103.83,
      77.78, 77.78, 77.78, 77.78, 69.30,  69.30,  77.78,  87.31
    ];

    const stepTick = () => {
      if (!this.musicRunning || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step16 = this.currentStep % 16;
      const step32 = this.currentStep % 32;

      // 1. Kick on steps 0, 4, 8, 12 (4-on-the-floor)
      if (step16 % 4 === 0) {
        this.synthKick(now);
      }
      // 2. Snare on steps 4, 12
      if (step16 === 4 || step16 === 12) {
        this.synthSnare(now);
      }
      // 3. Hi-hat on every odd 16th note
      if (step16 % 2 === 1) {
        this.synthHat(now);
      }
      // 4. Synth bass on 16th notes
      const freq = bassline[step16];
      this.synthBass(freq, now, stepInterval * 0.85);

      // 5. Synth chord pad every 8 steps
      if (step32 === 0 || step32 === 8 || step32 === 16 || step32 === 24) {
        const chordIndex = Math.floor(step32 / 8);
        this.synthPad(chordIndex, now);
      }

      this.currentStep++;
      this.musicTimer = setTimeout(stepTick, stepInterval * 1000);
    };

    stepTick();
  }

  synthKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.11);
    } catch {
      // ignore
    }
  }

  synthSnare(time) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
    } catch {
      // ignore
    }
  }

  synthHat(time) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
    } catch {
      // ignore
    }
  }

  synthBass(freq, time, dur) {
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + dur);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    } catch {
      // ignore
    }
  }

  synthPad(chordIdx, time) {
    try {
      // F minor chords: Fm, Ab, Eb, Db
      const chords = [
        [174.61, 207.65, 261.63], // F, Ab, C
        [207.65, 261.63, 311.13], // Ab, C, Eb
        [155.56, 196.00, 233.08], // Eb, G, Bb
        [138.59, 174.61, 207.65], // Db, F, Ab
      ];
      const chord = chords[chordIdx % chords.length];
      chord.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * 2, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 1.6);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + 1.65);
      });
    } catch {
      // ignore
    }
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
