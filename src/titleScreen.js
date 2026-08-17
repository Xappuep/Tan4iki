window.SR = window.SR || {};

SR.Title = {
  mode: "off",
  t: 0,
  selected: 0,
  blockUntil: 0,
  alarmPlayed: false,
  themeReady: false,
  reduced: false,
  hits: [],
  SIZE: 416,
  INTRO_MS: 3500,
  SOUND_KEY: "steelFrontiersSound",

  ITEMS: ["start", "help", "sound"],

  active: function () {
    return this.mode === "intro" || this.mode === "menu" || this.mode === "help";
  },

  prefersReduced: function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  },

  begin: function () {
    this.reduced = this.prefersReduced();
    this.mode = "intro";
    this.t = 0;
    this.selected = 0;
    this.blockUntil = 0;
    this.alarmPlayed = false;
    this.themeReady = false;
    this.hits = [];
    SR.Audio.loadMute();
  },

  showMenu: function () {
    this.mode = "menu";
    this.t = this.INTRO_MS;
    this.hits = [];
    this.themeReady = true;
    try {
      SR.Audio.playMenu();
    } catch (err) {}
  },

  close: function () {
    this.mode = "off";
    this.t = 0;
    this.hits = [];
  },

  skipIntro: function () {
    if (this.mode !== "intro") return;
    this.showMenu();
    this.blockUntil = (typeof performance !== "undefined" ? performance.now() : Date.now()) + 220;
  },

  update: function (dt) {
    if (this.mode !== "intro") return;
    this.t += dt;
    if (!this.alarmPlayed && this.t >= 40) {
      this.alarmPlayed = true;
      try { SR.Audio.alarm(); } catch (err) {}
    }
    const limit = this.reduced ? 700 : this.INTRO_MS;
    if (this.t >= limit) this.showMenu();
  },

  canvasPoint: function (canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const src = event.changedTouches ? event.changedTouches[0] : event;
    return {
      x: (src.clientX - rect.left) * canvas.width / rect.width,
      y: (src.clientY - rect.top) * canvas.height / rect.height
    };
  },

  hitItem: function (pt) {
    for (let i = 0; i < this.hits.length; i++) {
      const h = this.hits[i];
      if (pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h) return h.id;
    }
    return null;
  },

  activate: function (id) {
    try {
      if (id === "start" || id === "help") SR.Audio.confirm();
    } catch (err) {}
    if (id === "start" && this.onStart) this.onStart();
    else if (id === "help") this.mode = "help";
    else if (id === "sound") {
      SR.Audio.setEnabled(!SR.Audio.enabled);
      if (SR.Audio.enabled) SR.Audio.playMenu();
    }
  },

  handleKey: function (event) {
    if (!this.active()) return false;
    const code = event.code;
    const steer = code === "Space" || event.key === " " || code === "Enter" ||
      code === "ArrowUp" || code === "ArrowDown" || code === "KeyW" || code === "KeyS";
    if (steer) event.preventDefault();
    if (this.mode === "intro") {
      this.skipIntro();
      return true;
    }
    if (this.mode === "help") {
      if (event.code === "Enter" || event.code === "Space" || event.key === " " || event.code === "Escape") {
        this.mode = "menu";
      }
      return true;
    }
    const down = event.code === "KeyS" || event.code === "ArrowDown" || event.key === "s" || event.key === "ы";
    const up = event.code === "KeyW" || event.code === "ArrowUp" || event.key === "w" || event.key === "ц";
    if (down && !event.repeat) {
      this.selected = (this.selected + 1) % this.ITEMS.length;
      SR.Audio.nav();
    }
    if (up && !event.repeat) {
      this.selected = (this.selected + this.ITEMS.length - 1) % this.ITEMS.length;
      SR.Audio.nav();
    }
    if ((event.code === "Enter" || event.code === "Space" || event.key === " ") && !event.repeat) {
      this.activate(this.ITEMS[this.selected]);
    }
    return true;
  },

  handlePointer: function (canvas, event) {
    if (!this.active()) return false;
    if (this.mode === "intro") {
      this.skipIntro();
      return true;
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now < (this.blockUntil || 0)) return true;
    if (this.mode === "help") {
      this.mode = "menu";
      return true;
    }
    const id = this.hitItem(this.canvasPoint(canvas, event));
    if (id) {
      this.selected = Math.max(0, this.ITEMS.indexOf(id));
      this.activate(id);
    }
    return true;
  },

  handleMove: function (canvas, event) {
    if (this.mode !== "menu") return;
    const id = this.hitItem(this.canvasPoint(canvas, event));
    if (id && this.ITEMS.indexOf(id) >= 0) this.selected = this.ITEMS.indexOf(id);
  },

  draw: function (ctx, time) {
    const size = this.SIZE;
    ctx.imageSmoothingEnabled = false;
    this.drawScene(ctx, time, size);
    if (this.mode === "intro") this.drawIntroCopy(ctx, size);
    if (this.mode === "menu") this.drawMenu(ctx, size);
    if (this.mode === "help") this.drawHelp(ctx, size);
  },

  sceneTime: function () {
    return this.reduced ? this.INTRO_MS : this.t;
  },

  drawScene: function (ctx, time, size) {
    const st = this.sceneTime();
    ctx.fillStyle = "#10140c";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#1a1c12";
    for (let y = 6; y < size; y += 16) {
      for (let x = 6; x < size; x += 16) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = "#242010";
    ctx.fillRect(0, size - 70, size, 70);
    ctx.fillStyle = "#1a180c";
    for (let x = 4; x < size; x += 10) ctx.fillRect(x, size - 66, 2, 2);

    const hq = { baseHp: 2, baseMaxHp: 2 };
    SR.Render.drawBase(ctx, 192, 360, time, hq);
    this.drawLamp(ctx, 204, 348, time, st >= 0);

    if (st >= 800) this.drawPlayerIntro(ctx, time, st);
    if (st >= 1700) this.drawEnemiesIntro(ctx, time, st);
    if (this.mode === "menu" || this.mode === "help") {
      ctx.fillStyle = "rgba(8, 10, 6, 0.42)";
      ctx.fillRect(0, 0, size, size);
    }
  },

  drawLamp: function (ctx, x, y, time, on) {
    const blink = this.reduced ? true : Math.floor(time / 280) % 2 === 0;
    ctx.fillStyle = "#2a120c";
    ctx.fillRect(x, y, 8, 6);
    ctx.fillStyle = on && blink ? "#a03028" : "#4a1814";
    ctx.fillRect(x + 2, y + 1, 4, 3);
  },

  drawPlayerIntro: function (ctx, time, st) {
    const arrive = this.reduced ? 1 : Math.max(0, Math.min(1, (st - 800) / 700));
    const x = -36 + arrive * 168;
    const y = 372;
    const turned = this.reduced || st >= 1550;
    const tank = { x: x, y: y, dir: turned ? 0 : 1, tankLevel: 1, invuln: 0, shieldCharges: 0, flash: 0 };
    SR.Render.drawTank(ctx, tank, "player", time, null);
    if (!this.reduced && st < 1500) {
      const puffs = [0.15, 0.4, 0.7];
      for (let i = 0; i < puffs.length; i++) {
        const age = arrive - puffs[i];
        if (age < 0 || age > 0.35) continue;
        const a = 1 - age / 0.35;
        ctx.fillStyle = "rgba(168, 148, 96, " + (0.45 * a) + ")";
        ctx.fillRect(x - 4 - i * 6, y + 18, 6, 4);
      }
    }
  },

  drawEnemiesIntro: function (ctx, time, st) {
    const kinds = ["basic", "fast", "heavy"];
    const xs = [56, 194, 322];
    for (let i = 0; i < 3; i++) {
      const appear = 1700 + i * 220;
      if (st < appear) continue;
      const tank = { x: xs[i], y: 28, dir: 2, tankLevel: 1, invuln: 0, shieldCharges: 0, flash: 0 };
      SR.Render.drawTank(ctx, tank, kinds[i], time, null);
      ctx.strokeStyle = "rgba(40, 12, 8, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(xs[i] - 1, 27, 30, 30);
    }
    if (!this.reduced && st < 2500) {
      const scan = ((st - 1700) / 800) * 90;
      ctx.fillStyle = "rgba(196, 92, 38, 0.18)";
      ctx.fillRect(40, 18 + scan, 336, 3);
    }
  },

  drawIntroCopy: function (ctx, size) {
    const st = this.sceneTime();
    if (st < 2500 && !this.reduced) {
      ctx.fillStyle = "#c8bca0";
      ctx.font = "bold 12px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("НАЖМИТЕ, ЧТОБЫ ПРОПУСТИТЬ", size / 2, size - 14);
      ctx.textAlign = "left";
      return;
    }
    this.drawTitle(ctx, size, st);
  },

  drawTitle: function (ctx, size, st) {
    const k = this.reduced ? 1 : Math.max(0, Math.min(1, (st - 2500) / 280));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = "center";
    ctx.font = "bold 26px Courier New";
    ctx.fillStyle = "#2a1c08";
    ctx.fillText("СТАЛЬНЫЕ РУБЕЖИ", size / 2 + 3, 58 + 3);
    ctx.fillStyle = "#8a6a10";
    ctx.fillText("СТАЛЬНЫЕ РУБЕЖИ", size / 2 + 1, 59);
    ctx.fillStyle = "#d4a017";
    ctx.fillText("СТАЛЬНЫЕ РУБЕЖИ", size / 2, 58);
    if (!this.reduced) {
      const sweep = ((st - 2500) / 1000) * 280;
      ctx.fillStyle = "rgba(255, 244, 176, 0.28)";
      ctx.fillRect(size / 2 - 140 + sweep, 36, 18, 28);
    }
    ctx.font = "bold 14px Courier New";
    ctx.fillStyle = "#2a2412";
    ctx.fillText("ЗАЩИТИ ШТАБ. УДЕРЖИ РУБЕЖ.", size / 2 + 2, 82 + 2);
    ctx.fillStyle = "#e8dcc4";
    ctx.fillText("ЗАЩИТИ ШТАБ. УДЕРЖИ РУБЕЖ.", size / 2, 82);
    ctx.restore();
    ctx.textAlign = "left";
  },

  drawMenu: function (ctx, size) {
    this.drawTitle(ctx, size, this.INTRO_MS);
    const x = 58;
    const y = 128;
    const w = 300;
    const h = 232;
    ctx.fillStyle = "#120e08";
    ctx.fillRect(x + 4, y + 4, w, h);
    ctx.fillStyle = "#1c2118";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#8a6a10";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    const rows = [
      { id: "start", text: "НАЧАТЬ КАМПАНИЮ", pick: true },
      { id: "help", text: "УПРАВЛЕНИЕ", pick: true },
      { id: "record", text: "РЕКОРД: " + SR.Game.loadBest(), pick: false },
      { id: "sound", text: "ЗВУК: " + (SR.Audio.enabled ? "ВКЛ." : "ВЫКЛ."), pick: true }
    ];
    this.hits = [];
    ctx.font = "bold 16px Courier New";
    for (let i = 0; i < rows.length; i++) {
      const ry = y + 28 + i * 46;
      const row = rows[i];
      const active = row.pick && this.ITEMS[this.selected] === row.id;
      if (row.pick) this.hits.push({ id: row.id, x: x + 10, y: ry - 8, w: w - 20, h: 40 });
      if (active) {
        ctx.fillStyle = "rgba(212, 160, 23, 0.16)";
        ctx.fillRect(x + 12, ry - 6, w - 24, 36);
        ctx.fillStyle = "#d4a017";
        ctx.fillRect(x + 18, ry + 6, 10, 8);
        ctx.fillRect(x + 20, ry + 2, 6, 4);
      }
      ctx.fillStyle = active ? "#f4e8b0" : (row.pick ? "#e8dcc4" : "#b5a88c");
      ctx.fillText(row.text, x + 40, ry + 16);
    }
    ctx.font = "12px Courier New";
    ctx.fillStyle = "#8ab4cc";
    ctx.fillText("W/S · ENTER · КАСАНИЕ", x + 40, y + h - 16);
  },

  drawHelp: function (ctx, size) {
    this.drawTitle(ctx, size, this.INTRO_MS);
    const x = 48;
    const y = 118;
    const w = 320;
    const h = 236;
    ctx.fillStyle = "#120e08";
    ctx.fillRect(x + 4, y + 4, w, h);
    ctx.fillStyle = "#1c2118";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#8a6a10";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.textAlign = "center";
    ctx.font = "bold 20px Courier New";
    ctx.fillStyle = "#d4a017";
    ctx.fillText("УПРАВЛЕНИЕ", size / 2, y + 40);
    ctx.font = "bold 15px Courier New";
    ctx.fillStyle = "#e8dcc4";
    ctx.fillText("WASD или стрелки — движение", size / 2, y + 84);
    ctx.fillText("Пробел — огонь · E — импульс", size / 2, y + 112);
    ctx.fillStyle = "#c8bca0";
    ctx.fillText("Кампания: 6 рубежей", size / 2, y + 150);
    ctx.fillText("Между рубежами — Полевой арсенал.", size / 2, y + 172);
    ctx.fillStyle = "#8ab4cc";
    ctx.font = "bold 14px Courier New";
    ctx.fillText("ENTER / КЛИК — НАЗАД", size / 2, y + 210);
    ctx.textAlign = "left";
  }
};
