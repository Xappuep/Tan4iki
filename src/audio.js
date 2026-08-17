window.SR = window.SR || {};

SR.Audio = {
  ctx: null,
  enabled: true,
  SOUND_KEY: "steelFrontiersSound",
  master: null,
  musicGain: null,
  musicDuck: null,
  engineGain: null,
  fxGain: null,
  musicSrc: null,
  musicName: null,
  musicVoice: null,
  useLiveBed: false,
  menuBuf: null,
  battleBuf: null,
  winBuf: null,
  loseBuf: null,
  stale: [],
  engine: null,
  tension: null,
  tensionTarget: 0,
  noiseBuf: null,
  voices: [],
  maxVoices: 7,

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
    this.init();
    if (!this.master) return;
    this.master.gain.value = this.enabled ? 1 : 0.0001;
    if (!this.enabled) {
      this.stopMusic(0.08);
      this.setEngine(false);
    } else if (SR.Title && SR.Title.active()) {
      this.playMenu();
    }
  },

  init: function () {
    try {
      if (this.ctx && this.master) {
        this.unlock();
        return;
      }
      this.loadMute();
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!this.ctx) this.ctx = new Ctx();
      this.buildGraph();
      this.unlock();
    } catch (err) {}
  },

  unlock: function () {
    if (!this.ctx) return;
    const self = this;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().then(function () {
        self.restartCurrentTheme();
      }).catch(function () {});
    }
  },

  restartCurrentTheme: function () {
    if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
    if (this.musicName === "win" || this.musicName === "lose") return;
    try {
      this.stopBuffer();
      if (SR.Title && SR.Title.active()) this.playMenu();
      else if (SR.session && SR.session.state === "playing") this.playBattle();
    } catch (err) {}
  },

  now: function () {
    return this.ctx ? this.ctx.currentTime : 0;
  },

  buildGraph: function () {
    try {
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0.0001;
      this.master.connect(ctx.destination);

      this.musicDuck = ctx.createGain();
      this.musicDuck.gain.value = 1;
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.0001;
      this.musicGain.connect(this.musicDuck);
      this.musicDuck.connect(this.master);

      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.0001;
      this.engineGain.connect(this.master);

      this.fxGain = ctx.createGain();
      this.fxGain.gain.value = 0.9;
      this.fxGain.connect(this.master);

      const nLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < nLen; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    } catch (err) {
      this.master = null;
      this.musicGain = null;
      this.engineGain = null;
      this.fxGain = null;
      this.noiseBuf = null;
    }
  },

  fade: function (param, value, t, dur) {
    if (!param) return;
    const now = this.now();
    const when = Math.max(now, t || now);
    const v = Math.max(0.0001, value);
    try {
      param.cancelScheduledValues(when);
      param.setValueAtTime(param.value || v, when);
      param.linearRampToValueAtTime(v, when + Math.max(0.02, dur || 0.08));
    } catch (err) {
      try { param.value = v; } catch (err2) {}
    }
  },

  canSfx: function (priority) {
    if (!this.enabled || !this.ctx || !this.fxGain) return false;
    const t = this.now();
    this.voices = this.voices.filter(function (v) { return v.stop > t; });
    if (this.voices.length < this.maxVoices) return true;
    if (priority >= 2) {
      this.voices.shift();
      return true;
    }
    return false;
  },

  book: function (dur) {
    this.voices.push({ stop: this.now() + dur });
  },

  env: function (amp, t, peak, attack, hold, release) {
    try {
      const now = this.now();
      const start = Math.max(now + 0.001, t);
      const p = Math.max(0.00012, peak);
      amp.gain.cancelScheduledValues(start);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.linearRampToValueAtTime(p, start + attack);
      amp.gain.linearRampToValueAtTime(p * 0.7, start + attack + hold);
      amp.gain.linearRampToValueAtTime(0.0001, start + attack + hold + release);
    } catch (err) {}
  },

  toneTo: function (freq, type, t, dur, peak, dest, slide) {
    if (!freq || !this.ctx) return;
    try {
      const start = Math.max(this.now() + 0.001, t);
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type || "triangle";
      osc.frequency.setValueAtTime(freq, start);
      if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, slide), start + dur);
      this.env(amp, start, peak, 0.01, Math.max(0.02, dur * 0.4), Math.max(0.04, dur * 0.5));
      osc.connect(amp).connect(dest || this.fxGain);
      osc.start(start);
      osc.stop(start + dur + 0.06);
    } catch (err) {}
  },

  noiseTo: function (t, dur, peak, dest, cutoff, type) {
    if (!this.ctx || !this.noiseBuf) return;
    try {
      const start = Math.max(this.now() + 0.001, t);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type || "lowpass";
      filter.frequency.value = cutoff || 800;
      const amp = this.ctx.createGain();
      this.env(amp, start, peak, 0.008, Math.max(0.02, dur * 0.3), Math.max(0.05, dur * 0.6));
      src.connect(filter).connect(amp).connect(dest || this.fxGain);
      src.start(start);
      src.stop(start + dur + 0.06);
    } catch (err) {}
  },

  duck: function (amount, hold) {
    if (!this.musicDuck) return;
    const t = this.now();
    try {
      this.musicDuck.gain.cancelScheduledValues(t);
      this.musicDuck.gain.setValueAtTime(this.musicDuck.gain.value, t);
      this.musicDuck.gain.linearRampToValueAtTime(Math.max(0.2, amount), t + 0.04);
      this.musicDuck.gain.linearRampToValueAtTime(1, t + (hold || 0.35));
    } catch (err) {}
  },

  pruneStale: function () {
    const t = this.now();
    for (let i = this.stale.length - 1; i >= 0; i--) {
      if (t >= this.stale[i].until) {
        try { this.stale[i].node.disconnect(); } catch (err) {}
        this.stale.splice(i, 1);
      }
    }
  },

  writeTone: function (data, sr, start, dur, freq, amp, wave) {
    if (!freq || amp <= 0 || dur <= 0) return;
    const n0 = Math.max(0, (start * sr) | 0);
    const n1 = Math.min(data.length, ((start + dur) * sr) | 0);
    const attack = Math.max(1, (0.012 * sr) | 0);
    const rel = Math.max(1, (0.05 * sr) | 0);
    for (let i = n0; i < n1; i++) {
      const k = i - n0;
      let env = 1;
      if (k < attack) env = k / attack;
      else if (i > n1 - rel) env = (n1 - i) / rel;
      const ph = (i / sr) * freq;
      let s;
      if (wave === "square") s = (ph % 1) < 0.5 ? 1 : -1;
      else if (wave === "triangle") {
        const x = ph % 1;
        s = x < 0.5 ? x * 4 - 1 : 3 - x * 4;
      } else {
        s = Math.sin(ph * Math.PI * 2);
      }
      data[i] += s * amp * env;
    }
  },

  writeNoise: function (data, sr, start, dur, amp) {
    const n0 = Math.max(0, (start * sr) | 0);
    const n1 = Math.min(data.length, ((start + dur) * sr) | 0);
    let lp = 0;
    const att = Math.max(1, (0.01 * sr) | 0);
    for (let i = n0; i < n1; i++) {
      const k = i - n0;
      const len = n1 - n0;
      let env = 1;
      if (k < att) env = k / att;
      else env = Math.max(0, 1 - k / len);
      lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;
      data[i] += lp * amp * env;
    }
  },

  buildScoreBuf: function (duration, events) {
    const sr = this.ctx.sampleRate;
    const n = Math.max(1, (sr * duration) | 0);
    const buf = this.ctx.createBuffer(1, n, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.kind === "snare") {
        this.writeNoise(data, sr, ev.at, ev.d, ev.g * 2.4);
        this.writeTone(data, sr, ev.at, Math.min(0.028, ev.d), 210, ev.g * 0.7, "triangle");
      } else if (ev.kind === "air" || ev.kind === "track") {
        this.writeNoise(data, sr, ev.at, ev.d, ev.g * 1.8);
      } else {
        this.writeTone(data, sr, ev.at, ev.d, ev.f, ev.g * 2.2, ev.type || "triangle");
      }
    }
    let peak = 0.0001;
    for (let i = 0; i < n; i++) {
      const a = data[i] < 0 ? -data[i] : data[i];
      if (a > peak) peak = a;
    }
    const scale = 0.62 / peak;
    for (let i = 0; i < n; i++) data[i] *= scale;
    return buf;
  },

  menuScore: function () {
    const q = 60 / 118;
    const e = q / 2;
    const s = q / 4;
    const de = e + s;
    const bar = q * 2;
    const ev = [];
    const Bb1 = 58.27;
    const F2 = 87.31;
    const Bb2 = 116.54;
    const Eb2 = 77.78;
    const C3 = 130.81;
    const F3 = 174.61;
    const Bb3 = 233.08;
    const F4 = 349.23;
    const G4 = 392;
    const A4 = 440;
    const Bb4 = 466.16;
    const C5 = 523.25;
    const D5 = 587.33;
    const Eb5 = 622.25;
    const F5 = 698.46;
    const G5 = 783.99;
    const roots = [Bb2, Bb2, Eb2, F2, Bb2, Bb2, F2, Bb2, Bb2, Bb2, Eb2, F2, Bb2, F2, Bb2, Bb1];
    const pahs = [F3, F3, Bb3, C3, F3, F3, C3, F3, F3, F3, Bb3, C3, F3, C3, F3, F3];
    for (let b = 0; b < 16; b++) {
      const t0 = b * bar;
      ev.push({ at: t0, d: q * 0.88, f: roots[b], g: 0.13, type: "sine", kind: "bass" });
      ev.push({ at: t0, d: 0.09, f: 64, g: 0.1, type: "sine", kind: "kick" });
      ev.push({ at: t0 + q, d: q * 0.62, f: pahs[b], g: 0.08, type: "triangle", kind: "pah" });
      ev.push({ at: t0, d: 0.055, kind: "snare", g: 0.11 });
      ev.push({ at: t0 + e, d: 0.03, kind: "snare", g: 0.045 });
      ev.push({ at: t0 + q, d: 0.048, kind: "snare", g: 0.08 });
      ev.push({ at: t0 + q + e, d: 0.03, kind: "snare", g: 0.045 });
    }
    ev.push({ at: 0, d: 0.16, kind: "snare", g: 0.09 });
    ev.push({ at: 8 * bar, d: 0.16, kind: "snare", g: 0.09 });
    const phraseA = [
      [0, de, Bb4], [de, s, Bb4], [q, e, C5], [q + e, e, D5],
      [bar, e, Eb5], [bar + e, e, D5], [bar + q, e, C5], [bar + q + e, e, Bb4],
      [bar * 2, de, F4], [bar * 2 + de, s, F4], [bar * 2 + q, e, G4], [bar * 2 + q + e, e, A4],
      [bar * 3, q * 1.85, Bb4]
    ];
    const phraseB = [
      [0, de, D5], [de, s, D5], [q, e, Eb5], [q + e, e, F5],
      [bar, e, G5], [bar + e, e, F5], [bar + q, e, Eb5], [bar + q + e, e, D5],
      [bar * 2, e, C5], [bar * 2 + e, e, Bb4], [bar * 2 + q, e, A4], [bar * 2 + q + e, e, C5],
      [bar * 3, q, Bb4], [bar * 3 + q, q * 0.9, F4]
    ];
    const stamp = function (offset, phrase, g, withHarm) {
      for (let i = 0; i < phrase.length; i++) {
        ev.push({ at: offset + phrase[i][0], d: phrase[i][1], f: phrase[i][2], g: g, type: "square", kind: "lead" });
        if (withHarm) {
          ev.push({
            at: offset + phrase[i][0],
            d: phrase[i][1],
            f: phrase[i][2] * 0.794,
            g: g * 0.5,
            type: "triangle",
            kind: "lead"
          });
        }
      }
    };
    stamp(0, phraseA, 0.12, false);
    stamp(4 * bar, phraseB, 0.12, false);
    stamp(8 * bar, phraseA, 0.11, true);
    stamp(12 * bar, phraseB, 0.11, true);
    return ev;
  },

  winScore: function () {
    const ev = [];
    const C3 = 130.81;
    const E3 = 164.81;
    const G3 = 196;
    const C4 = 261.63;
    const E4 = 329.63;
    const G4 = 392;
    const C5 = 523.25;
    const E5 = 659.26;
    const G5 = 783.99;
    const chord = function (t, d, freqs, g) {
      for (let i = 0; i < freqs.length; i++) {
        ev.push({
          at: t,
          d: d,
          f: freqs[i],
          g: g * (i === 0 ? 0.9 : 0.7),
          type: i < 2 ? "sine" : "square",
          kind: "lead"
        });
      }
    };
    chord(0.00, 0.2, [G3, C4], 0.1);
    chord(0.22, 0.2, [C4, E4, G4], 0.11);
    chord(0.44, 0.26, [E4, G4, C5], 0.12);
    chord(0.74, 0.42, [G4, C5, E5], 0.13);
    chord(1.28, 0.11, [C5], 0.1);
    chord(1.42, 0.11, [C5], 0.1);
    chord(1.56, 0.16, [E5], 0.11);
    chord(1.74, 0.18, [G5], 0.12);
    chord(1.98, 0.55, [C4, E4, G4, C5], 0.13);
    chord(2.64, 0.13, [G4, C5], 0.1);
    chord(2.80, 0.13, [C5, E5], 0.11);
    chord(2.96, 0.16, [E5, G5], 0.12);
    chord(3.18, 1.45, [C3, E3, G3, C4, E4, G4, C5], 0.11);
    return ev;
  },

  loseScore: function () {
    const q = 60 / 68;
    const e = q / 2;
    const ev = [];
    const C2 = 65.41;
    const G2 = 98;
    const C3 = 130.81;
    const Eb3 = 155.56;
    const G3 = 196;
    const Ab3 = 207.65;
    const C4 = 261.63;
    const D4 = 293.66;
    const Eb4 = 311.13;
    const G4 = 392;
    const n = function (t, d, f, g, type) {
      ev.push({ at: t, d: d, f: f, g: g || 0.1, type: type || "triangle", kind: "lead" });
    };
    for (let i = 0; i < 6; i++) {
      const t0 = i * 2 * q;
      n(t0, 0.14, 52, 0.08, "sine");
      ev.push({ at: t0, d: 0.09, kind: "snare", g: 0.03 });
      n(t0 + q, q * 0.7, G2, 0.05, "sine");
    }
    n(0, q * 1.7, C4, 0.12);
    n(2 * q, q * 1.7, C4, 0.12);
    n(4 * q, q * 1.15, Eb4, 0.12);
    n(4 * q + q * 1.2, e, D4, 0.1);
    n(6 * q, q * 1.7, C4, 0.11);
    n(8 * q, q * 3.4, G3, 0.11, "sine");
    n(8 * q, q * 0.9, G4, 0.045, "square");
    n(10 * q, q * 0.9, Eb4, 0.04, "square");
    n(12 * q, q * 1.6, Ab3, 0.1);
    n(14 * q, q * 1.6, G3, 0.1);
    n(16 * q, q * 3.2, C3, 0.13, "sine");
    n(16 * q, q * 3.2, C2, 0.08, "sine");
    return ev;
  },

  battleScore: function () {
    const b = 60 / 122;
    const ev = [];
    const line = [73.4, 73.4, 87.3, 73.4, 65.4, 73.4, 98, 87.3];
    for (let i = 0; i < 80; i++) {
      ev.push({
        at: i * (b / 2),
        kind: "bass",
        f: line[i % line.length],
        d: 0.18,
        g: 0.12,
        type: "triangle"
      });
      if (i % 2 === 1) ev.push({ at: i * (b / 2), kind: "track", d: 0.07, g: 0.05 });
    }
    const arp = [146.8, 174.6, 196, 220, 196, 174.6];
    for (let i = 0; i < 6; i++) {
      ev.push({ at: 3.94 + i * (b / 2), kind: "arp", f: arp[i], d: 0.09, g: 0.08, type: "square" });
      ev.push({ at: 11.8 + i * (b / 2), kind: "arp", f: arp[i], d: 0.09, g: 0.08, type: "square" });
    }
    return ev;
  },

  getMenuBuf: function () {
    if (!this.menuBuf) this.menuBuf = this.buildScoreBuf(16 * 2 * (60 / 118), this.menuScore());
    return this.menuBuf;
  },

  getBattleBuf: function () {
    if (!this.battleBuf) this.battleBuf = this.buildScoreBuf(19.68, this.battleScore());
    return this.battleBuf;
  },

  getWinBuf: function () {
    if (!this.winBuf) this.winBuf = this.buildScoreBuf(4.8, this.winScore());
    return this.winBuf;
  },

  getLoseBuf: function () {
    if (!this.loseBuf) this.loseBuf = this.buildScoreBuf(20 * (60 / 68), this.loseScore());
    return this.loseBuf;
  },

  setMusicLevel: function (level) {
    if (!this.musicGain) return;
    try {
      this.musicGain.gain.cancelScheduledValues(this.now());
    } catch (err) {}
    this.musicGain.gain.value = this.enabled ? level : 0.0001;
  },

  ensureMusicVoice: function () {
    if (this.musicVoice || !this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 49;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g).connect(this.musicGain);
      osc.start();
      this.musicVoice = { osc: osc, gain: g };
    } catch (err) {
      this.musicVoice = null;
    }
  },

  startBuffer: function (name, loop) {
    if (!this.ctx || !this.musicGain) return;
    this.stopBuffer();
    try {
      let buf = this.getMenuBuf();
      if (name === "battle") buf = this.getBattleBuf();
      else if (name === "win") buf = this.getWinBuf();
      else if (name === "lose") buf = this.getLoseBuf();
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop !== false;
      src.connect(this.musicGain);
      src.start();
      this.musicSrc = src;
    } catch (err) {
      this.musicSrc = null;
    }
  },

  stopBuffer: function () {
    if (!this.musicSrc) return;
    try { this.musicSrc.stop(); } catch (err) {}
    try { this.musicSrc.disconnect(); } catch (err) {}
    this.musicSrc = null;
  },

  stopMusic: function (fade) {
    this.musicName = null;
    this.useLiveBed = false;
    const t = this.now();
    try {
      if (this.musicSrc) {
        this.fade(this.musicGain, 0.0001, t, fade || 0.12);
        const src = this.musicSrc;
        this.musicSrc = null;
        const wait = Math.max(80, ((fade || 0.12) * 1000) | 0);
        setTimeout(function () {
          try { src.stop(); } catch (err) {}
          try { src.disconnect(); } catch (err) {}
        }, wait);
      }
      if (this.musicVoice) this.musicVoice.gain.gain.value = 0.0001;
      if (this.tension) {
        this.fade(this.tension.gain.gain, 0.0001, t, fade || 0.12);
        this.stale.push({ node: this.tension.gain, until: t + (fade || 0.12) + 0.08 });
        this.tension = null;
      }
      this.tensionTarget = 0;
    } catch (err) {
      this.musicSrc = null;
      this.tension = null;
    }
  },

  startTheme: function (name) {
    this.init();
    if (!this.ctx || !this.enabled || !this.musicGain) return;
    this.stopBuffer();
    if (this.tension) {
      try { this.tension.gain.disconnect(); } catch (err) {}
      this.tension = null;
    }
    this.musicName = name;
    this.setMusicLevel(name === "battle" ? 0.26 : 0.62);
    if (this.musicDuck) this.musicDuck.gain.value = 1;
    this.ensureMusicVoice();
    this.startBuffer(name, true);
    this.useLiveBed = name === "menu" || name === "battle";
    if (name === "battle") this.startTension();
  },

  playSting: function (name) {
    this.init();
    if (!this.ctx || !this.enabled || !this.musicGain) return;
    this.useLiveBed = false;
    if (this.musicVoice) this.musicVoice.gain.gain.value = 0.0001;
    if (this.tension) {
      try { this.tension.gain.disconnect(); } catch (err) {}
      this.tension = null;
    }
    this.stopBuffer();
    this.musicName = name;
    this.setMusicLevel(0.74);
    if (this.musicDuck) this.musicDuck.gain.value = 1;
    this.startBuffer(name, false);
  },

  playTheme: function () {
    this.playMenu();
  },

  stopTheme: function () {
    this.stopMusic(0.25);
  },

  playMenu: function () {
    this.startTheme("menu");
  },

  playBattle: function () {
    this.startTheme("battle");
  },

  startTension: function () {
    if (!this.ctx || !this.musicGain || !this.noiseBuf) return;
    try {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.connect(this.musicGain);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 92.5;
      const amp = ctx.createGain();
      amp.gain.value = 0.35;
      osc.connect(amp).connect(g);
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const flt = ctx.createBiquadFilter();
      flt.type = "bandpass";
      flt.frequency.value = 210;
      flt.Q.value = 1.4;
      const nAmp = ctx.createGain();
      nAmp.gain.value = 0.22;
      src.connect(flt).connect(nAmp).connect(g);
      osc.start();
      src.start();
      this.tension = { gain: g, osc: osc, src: src };
    } catch (err) {
      this.tension = null;
    }
  },

  tickLiveBed: function () {
    if (!this.useLiveBed || !this.musicVoice || !this.musicName) {
      if (this.musicVoice && !this.musicName) this.musicVoice.gain.gain.value = 0.0001;
      return;
    }
    const t = this.now();
    if (this.musicName === "menu") {
      const q = 60 / 118;
      const roots = [116.5, 116.5, 77.8, 87.3, 116.5, 116.5, 87.3, 116.5];
      const p = t % (16 * 2 * q);
      const beat = Math.floor(p / q);
      const local = p % q;
      this.musicVoice.osc.frequency.value = roots[beat % 8];
      const amp = this.musicSrc ? 0.05 : 0.18;
      this.musicVoice.gain.gain.value = beat % 2 === 0 && local < q * 0.85 ? amp * (1 - local / q) : 0.0001;
    } else if (this.musicName === "battle") {
      const line = [73.4, 73.4, 87.3, 73.4, 65.4, 73.4, 98, 87.3];
      const step = 60 / 122 / 2;
      const p = t % 19.68;
      const i = Math.floor(p / step) % 8;
      const local = p % step;
      this.musicVoice.osc.frequency.value = line[i];
      const amp = this.musicSrc ? 0.025 : 0.1;
      this.musicVoice.gain.gain.value = local < step * 0.75 ? amp * (1 - local / step) : 0.0001;
    }
  },

  tick: function (game) {
    if (!this.ctx) return;
    try {
      this.pruneStale();
      this.tickLiveBed();
      if (this.musicName === "battle" && this.tension && game && game.state === "playing") {
        this.tickTension(game);
      }
    } catch (err) {}
  },

  tickTension: function (game) {
    if (!this.tension) return;
    let n = 0;
    let special = false;
    for (let i = 0; i < game.enemies.length; i++) {
      if (game.enemies[i].dead) continue;
      n += 1;
      const k = game.enemies[i].kind;
      if (k === "heavy" || k === "commander") special = true;
    }
    let want = 0;
    if (game.lives <= 1) want += 0.45;
    if (game.baseHp < game.baseMaxHp) want += 0.35;
    if (n >= 3) want += 0.22;
    if (special) want += 0.4;
    this.tensionTarget += ((Math.min(1, want) - this.tensionTarget) * 0.08);
    try {
      this.tension.gain.gain.value = 0.0001 + this.tensionTarget * 0.035;
    } catch (err) {}
  },

  ensureEngine: function () {
    if (this.engine || !this.ctx || !this.engineGain || !this.noiseBuf) return;
    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 50;
      const sub = ctx.createOscillator();
      sub.type = "triangle";
      sub.frequency.value = 25;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.73;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 2.8;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      const flt = ctx.createBiquadFilter();
      flt.type = "lowpass";
      flt.frequency.value = 180;
      flt.Q.value = 2.2;
      const body = ctx.createGain();
      body.gain.value = 0.55;
      osc.connect(flt);
      sub.connect(flt);
      flt.connect(body).connect(this.engineGain);

      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const nFlt = ctx.createBiquadFilter();
      nFlt.type = "bandpass";
      nFlt.frequency.value = 90;
      nFlt.Q.value = 1.1;
      const tracks = ctx.createGain();
      tracks.gain.value = 0.0001;
      src.connect(nFlt).connect(tracks).connect(this.engineGain);

      osc.start();
      sub.start();
      lfo.start();
      src.start();
      this.engine = { osc: osc, sub: sub, flt: flt, tracks: tracks, nFlt: nFlt };
    } catch (err) {
      this.engine = null;
    }
  },

  setEngine: function (alive, moving, speed) {
    try {
      this.init();
      this.ensureEngine();
      if (!this.engine || !this.engineGain) return;
      const t = this.now();
      const on = !!(this.enabled && alive);
      const run = on && !!moving;
      const gain = on ? (run ? 0.07 : 0.04) : 0.0001;
      this.engineGain.gain.setTargetAtTime(gain, t, 0.1);
      if (!on) return;
      const hz = run ? 56 + Math.min(28, (speed || 96) * 0.12) : 50;
      this.engine.osc.frequency.setTargetAtTime(hz, t, 0.1);
      this.engine.sub.frequency.setTargetAtTime(hz * 0.5, t, 0.1);
      this.engine.flt.frequency.setTargetAtTime(run ? 280 : 170, t, 0.12);
      this.engine.tracks.gain.setTargetAtTime(run ? 0.028 : 0.007, t, 0.12);
      this.engine.nFlt.frequency.setTargetAtTime(run ? 130 : 88, t, 0.12);
    } catch (err) {}
  },

  alarm: function () {
    if (!this.canSfx(1)) return;
    this.book(0.35);
    const t = this.now();
    this.toneTo(392, "square", t, 0.12, 0.04, this.fxGain);
    this.toneTo(330, "square", t + 0.16, 0.14, 0.035, this.fxGain);
  },

  nav: function () {
    if (!this.canSfx(0)) return;
    this.book(0.08);
    this.toneTo(420, "square", this.now(), 0.04, 0.03, this.fxGain);
  },

  confirm: function () {
    if (!this.canSfx(1)) return;
    this.book(0.16);
    const t = this.now();
    this.toneTo(196, "triangle", t, 0.1, 0.05, this.fxGain);
    this.toneTo(247, "triangle", t + 0.06, 0.1, 0.04, this.fxGain);
  },

  shot: function (level) {
    if (level === 0) {
      this.enemyShot();
      return;
    }
    if (!this.canSfx(1)) return;
    this.book(0.16);
    const t = this.now();
    const lv = level || 1;
    const body = 0.05 + lv * 0.008;
    this.toneTo(lv >= 4 ? 90 : 120 - lv * 8, "square", t, 0.045, body, this.fxGain, 55);
    this.noiseTo(t, lv >= 4 ? 0.09 : 0.055, 0.045 + lv * 0.006, this.fxGain, 1400 - lv * 80);
    if (lv >= 3) this.toneTo(900 + lv * 80, "sine", t, 0.05, 0.018, this.fxGain, 400);
  },

  enemyShot: function () {
    if (!this.canSfx(0)) return;
    this.book(0.1);
    const t = this.now();
    this.toneTo(168, "square", t, 0.03, 0.03, this.fxGain, 80);
    this.noiseTo(t, 0.04, 0.025, this.fxGain, 1100);
  },

  hit: function (kind) {
    kind = kind || "enemy";
    if (!this.canSfx(kind === "player" || kind === "base" || kind === "brickBreak" ? 2 : (kind === "brick" ? 1 : 0))) return;
    this.book(0.14);
    const t = this.now();
    if (kind === "brick") {
      this.noiseTo(t, 0.05, 0.04, this.fxGain, 1900);
      this.toneTo(260, "square", t, 0.03, 0.022, this.fxGain, 110);
    } else if (kind === "brickBreak") {
      this.noiseTo(t, 0.1, 0.07, this.fxGain, 900);
      this.toneTo(150, "square", t, 0.06, 0.035, this.fxGain, 55);
      this.toneTo(90, "triangle", t + 0.03, 0.05, 0.02, this.fxGain, 40);
    } else if (kind === "steel") {
      this.toneTo(620, "triangle", t, 0.12, 0.045, this.fxGain, 240);
      this.noiseTo(t, 0.04, 0.03, this.fxGain, 2400, "highpass");
    } else if (kind === "water") {
      this.noiseTo(t, 0.1, 0.04, this.fxGain, 900);
      this.toneTo(180, "sine", t, 0.08, 0.03, this.fxGain, 70);
    } else if (kind === "player") {
      this.toneTo(110, "sawtooth", t, 0.12, 0.07, this.fxGain, 48);
      this.noiseTo(t, 0.08, 0.05, this.fxGain, 700);
    } else if (kind === "base") {
      this.toneTo(156, "square", t, 0.16, 0.06, this.fxGain);
      this.toneTo(117, "square", t + 0.09, 0.18, 0.05, this.fxGain);
    } else {
      this.toneTo(140, "triangle", t, 0.07, 0.05, this.fxGain, 70);
      this.noiseTo(t, 0.05, 0.04, this.fxGain, 800);
    }
  },

  shield: function () {
    if (!this.canSfx(1)) return;
    this.book(0.16);
    const t = this.now();
    this.toneTo(520, "sine", t, 0.08, 0.05, this.fxGain);
    this.toneTo(780, "triangle", t + 0.04, 0.1, 0.035, this.fxGain, 420);
  },

  boom: function (big) {
    if (!this.canSfx(2)) return;
    this.book(0.4);
    const t = this.now();
    this.duck(0.32, 0.4);
    this.noiseTo(t, big ? 0.32 : 0.24, big ? 0.14 : 0.11, this.fxGain, 500);
    this.toneTo(big ? 52 : 64, "sawtooth", t, 0.28, big ? 0.1 : 0.08, this.fxGain, 32);
    this.noiseTo(t + 0.05, 0.12, 0.05, this.fxGain, 1800, "highpass");
  },

  bonus: function () {
    if (!this.canSfx(1)) return;
    this.book(0.18);
    const t = this.now();
    this.toneTo(392, "triangle", t, 0.07, 0.045, this.fxGain);
    this.toneTo(523, "triangle", t + 0.07, 0.09, 0.04, this.fxGain);
  },

  upgrade: function () {
    if (!this.canSfx(2)) return;
    this.book(0.32);
    const t = this.now();
    this.toneTo(247, "square", t, 0.07, 0.05, this.fxGain);
    this.toneTo(311, "square", t + 0.07, 0.07, 0.05, this.fxGain);
    this.toneTo(392, "square", t + 0.14, 0.14, 0.055, this.fxGain);
  },

  life: function () {
    if (!this.canSfx(2)) return;
    this.book(0.36);
    const t = this.now();
    this.toneTo(262, "triangle", t, 0.09, 0.05, this.fxGain);
    this.toneTo(330, "triangle", t + 0.1, 0.09, 0.05, this.fxGain);
    this.toneTo(392, "triangle", t + 0.2, 0.14, 0.055, this.fxGain);
  },

  freeze: function () {
    if (!this.canSfx(1)) return;
    this.book(0.22);
    this.toneTo(740, "sine", this.now(), 0.16, 0.04, this.fxGain, 280);
  },

  spawn: function () {
    if (!this.canSfx(1)) return;
    this.book(0.2);
    const t = this.now();
    this.toneTo(180, "square", t, 0.05, 0.03, this.fxGain);
    this.toneTo(240, "triangle", t + 0.05, 0.08, 0.035, this.fxGain);
  },

  buy: function () {
    if (!this.canSfx(1)) return;
    this.book(0.18);
    const t = this.now();
    this.toneTo(330, "triangle", t, 0.06, 0.04, this.fxGain);
    this.toneTo(392, "triangle", t + 0.06, 0.08, 0.045, this.fxGain);
  },

  emp: function () {
    if (!this.canSfx(1)) return;
    this.book(0.28);
    const t = this.now();
    this.toneTo(140, "sawtooth", t, 0.2, 0.06, this.fxGain, 48);
    this.noiseTo(t, 0.16, 0.04, this.fxGain, 600);
  },

  bomb: function () {
    this.boom(true);
  },

  win: function () {
    this.setEngine(false);
    this.playSting("win");
  },

  lose: function () {
    this.setEngine(false);
    this.playSting("lose");
  }
};
