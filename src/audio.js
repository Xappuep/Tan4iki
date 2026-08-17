window.SR = window.SR || {};

SR.Audio = {
  ctx: null,
  themePlaying: false,
  themeTimer: null,
  themeStep: 0,
  themeNext: 0,
  engine: null,

  THEME: [
    392, 523, 523, 523, 587, 622, 622, 587, 523, 466, 523, 523, 523, 523, 0, 0,
    622, 622, 622, 784, 784, 831, 784, 784, 698, 622, 587, 523, 523, 523, 523, 0,
    523, 587, 622, 698, 784, 784, 784, 784, 698, 622, 622, 587, 587, 587, 587, 0,
    523, 466, 415, 392, 349, 349, 311, 311, 294, 294, 262, 262, 262, 262, 0, 0
  ],

  THEME_BASS: [
    131, 131, 131, 0, 131, 131, 98, 0, 98, 98, 98, 0, 131, 131, 131, 0,
    156, 156, 156, 0, 156, 156, 98, 0, 98, 98, 98, 0, 131, 131, 131, 0,
    131, 131, 98, 0, 131, 131, 98, 0, 131, 131, 98, 0, 98, 98, 87, 0,
    131, 131, 117, 0, 98, 98, 87, 0, 98, 98, 98, 0, 131, 131, 131, 0
  ],

  enabled: true,
  SOUND_KEY: "steelFrontiersSound",

  loadMute: function () {
    try {
      const v = localStorage.getItem(this.SOUND_KEY);
      if (v === "0") this.enabled = false;
      if (v === "1") this.enabled = true;
    } catch (err) {}
  },

  setEnabled: function (on) {
    this.enabled = !!on;
    try {
      localStorage.setItem(this.SOUND_KEY, this.enabled ? "1" : "0");
    } catch (err) {}
    if (!this.enabled) {
      this.stopTheme();
      this.setEngine(false);
    }
  },

  init: function () {
    this.loadMute();
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
  },

  now: function () {
    return this.ctx ? this.ctx.currentTime : 0;
  },

  tone: function (freq, duration, type, gain, slide) {
    if (!this.enabled || !this.ctx || !freq) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + duration);
    amp.gain.setValueAtTime(gain || 0.08, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  noise: function (duration, gain) {
    if (!this.enabled || !this.ctx) return;
    const t = this.now();
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    const amp = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    src.buffer = buffer;
    amp.gain.setValueAtTime(gain || 0.12, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(amp).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + duration);
  },

  playTheme: function () {
    this.init();
    if (!this.enabled || !this.ctx || this.themePlaying) return;
    this.themePlaying = true;
    this.themeStep = 0;
    this.themeNext = this.now() + 0.02;
    this.tickTheme();
  },

  tickTheme: function () {
    if (!this.themePlaying || !this.ctx || !this.enabled) return;
    const step = 0.18;
    while (this.themeNext < this.now() + 0.22) {
      const i = this.themeStep % this.THEME.length;
      this.tone(this.THEME[i], 0.16, "square", 0.05);
      this.tone(this.THEME_BASS[i], 0.17, "triangle", 0.032);
      this.themeStep += 1;
      this.themeNext += step;
    }
    this.themeTimer = setTimeout(this.tickTheme.bind(this), 40);
  },

  stopTheme: function () {
    this.themePlaying = false;
    if (this.themeTimer) {
      clearTimeout(this.themeTimer);
      this.themeTimer = null;
    }
  },

  ensureEngine: function () {
    if (this.engine || !this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 56;
    const pulse = ctx.createOscillator();
    pulse.type = "square";
    pulse.frequency.value = 28;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 4;

    const nLen = ctx.sampleRate;
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nData = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nData[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nBuf;
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 90;
    nFilter.Q.value = 1.2;

    const master = ctx.createGain();
    master.gain.value = 0;
    osc.connect(filter);
    pulse.connect(filter);
    filter.connect(master);
    noise.connect(nFilter).connect(master);
    master.connect(ctx.destination);
    osc.start();
    pulse.start();
    lfo.start();
    noise.start();
    this.engine = { master: master, osc: osc };
  },

  setEngine: function (on) {
    this.ensureEngine();
    if (!this.engine) return;
    if (!this.enabled) on = false;
    const t = this.now();
    this.engine.master.gain.cancelScheduledValues(t);
    this.engine.master.gain.setTargetAtTime(on ? 0.05 : 0.0001, t, 0.05);
    this.engine.osc.frequency.setTargetAtTime(on ? 72 : 48, t, 0.08);
  },

  alarm: function () {
    this.tone(620, 0.11, "square", 0.035);
    const self = this;
    setTimeout(function () { self.tone(510, 0.14, "square", 0.03); }, 170);
  },

  shot: function () {
    this.tone(220, 0.09, "square", 0.07, 90);
  },

  hit: function () {
    this.tone(140, 0.08, "triangle", 0.08);
    this.noise(0.06, 0.06);
  },

  boom: function () {
    this.noise(0.28, 0.16);
    this.tone(90, 0.32, "sawtooth", 0.1, 40);
  },

  bonus: function () {
    this.tone(520, 0.08, "square", 0.07);
    const self = this;
    setTimeout(function () { self.tone(740, 0.1, "square", 0.07); }, 80);
  },

  upgrade: function () {
    this.tone(330, 0.08, "square", 0.08);
    const self = this;
    setTimeout(function () { self.tone(415, 0.08, "square", 0.08); }, 70);
    setTimeout(function () { self.tone(523, 0.08, "square", 0.09); }, 140);
    setTimeout(function () { self.tone(659, 0.16, "square", 0.09); }, 210);
  },

  freeze: function () {
    this.tone(880, 0.12, "triangle", 0.06, 420);
    this.tone(1320, 0.18, "square", 0.04);
  },

  emp: function () {
    this.tone(180, 0.22, "sawtooth", 0.08, 55);
    this.tone(90, 0.28, "square", 0.05);
  },

  shield: function () {
    this.tone(660, 0.08, "triangle", 0.07);
    this.tone(990, 0.12, "square", 0.05);
  },

  bomb: function () {
    this.noise(0.34, 0.18);
    this.tone(70, 0.36, "sawtooth", 0.12, 36);
  },

  win: function () {
    this.setEngine(false);
    this.tone(330, 0.14, "square", 0.08);
    const self = this;
    setTimeout(function () { self.tone(415, 0.14, "square", 0.08); }, 140);
    setTimeout(function () { self.tone(523, 0.22, "square", 0.09); }, 280);
  },

  lose: function () {
    this.setEngine(false);
    this.tone(220, 0.18, "sawtooth", 0.09, 120);
    const self = this;
    setTimeout(function () { self.tone(140, 0.28, "sawtooth", 0.09, 70); }, 180);
  }
};
