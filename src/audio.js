window.SR = window.SR || {};

SR.Audio = {
  ctx: null,

  init: function () {
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
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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

  win: function () {
    this.tone(330, 0.14, "square", 0.08);
    const self = this;
    setTimeout(function () { self.tone(415, 0.14, "square", 0.08); }, 140);
    setTimeout(function () { self.tone(523, 0.22, "square", 0.09); }, 280);
  },

  lose: function () {
    this.tone(220, 0.18, "sawtooth", 0.09, 120);
    const self = this;
    setTimeout(function () { self.tone(140, 0.28, "sawtooth", 0.09, 70); }, 180);
  }
};
