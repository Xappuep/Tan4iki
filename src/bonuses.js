window.SR = window.SR || {};

SR.BONUS = {
  POWER: "power",
  SHIELD: "shield",
  TURBO: "turbo",
  REPAIR: "repair",
  FREEZE: "freeze",
  EMP: "emp",
  BOMB: "bomb",
  LIFE: "life"
};

SR.Bonuses = {
  SIZE: 20,
  LIFE_MS: 10000,
  SPEED_MS: 12000,
  FREEZE_MS: 6000,
  EMP_SLOW_MS: 3000,
  CHANCE: 0.48,
  FIRST_AFTER: 1,
  POWER_BIAS: 0.45,
  MAX_SCORE_POWER: 500,
  MAX_SCORE_REPAIR: 300,
  MAX_SCORE_LIFE: 500,
  TYPES: ["power", "shield", "turbo", "repair", "freeze", "emp", "bomb", "life"],
  LABELS: {
    power: "УСИЛЕНИЕ",
    shield: "ЩИТ",
    turbo: "СКОРОСТЬ",
    repair: "РЕМОНТ",
    freeze: "СТОП",
    emp: "ИМПУЛЬС",
    bomb: "ЗАЛП",
    life: "ЖИЗНЬ"
  },

  cellFree: function (game, c, r) {
    if (!SR.Map.inBounds(c, r)) return false;
    const type = game.grid[r][c];
    if (type !== SR.TILE.EMPTY && type !== SR.TILE.ICE) return false;
    const t = SR.CONST.TILE;
    const x = c * t + (t - this.SIZE) / 2;
    const y = r * t + (t - this.SIZE) / 2;
    const box = { x: x, y: y, w: this.SIZE, h: this.SIZE };
    const tanks = game.allTanks();
    for (let i = 0; i < tanks.length; i++) {
      if (SR.Collision.rects(box, SR.Collision.tankRect(tanks[i].x, tanks[i].y))) return false;
    }
    return true;
  },

  findCell: function (game, px, py) {
    const t = SR.CONST.TILE;
    const originC = Math.max(0, Math.min(SR.CONST.COLS - 1, Math.floor(px / t)));
    const originR = Math.max(0, Math.min(SR.CONST.ROWS - 1, Math.floor(py / t)));
    if (this.cellFree(game, originC, originR)) return { c: originC, r: originR };
    for (let rad = 1; rad < 8; rad++) {
      for (let dc = -rad; dc <= rad; dc++) {
        for (let dr = -rad; dr <= rad; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
          if (this.cellFree(game, originC + dc, originR + dr)) {
            return { c: originC + dc, r: originR + dr };
          }
        }
      }
    }
    return null;
  },

  pickType: function (game) {
    const hist = game.bonusHistory;
    const level = game.tankLevel || 1;
    let type;
    if (level < 4 && Math.random() < this.POWER_BIAS) {
      type = "power";
    } else {
      type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
    }
    if (hist.length >= 2 && hist[hist.length - 1] === hist[hist.length - 2]) {
      for (let n = 0; n < 10; n++) {
        if (level < 4 && Math.random() < this.POWER_BIAS) type = "power";
        else type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
        if (type !== hist[hist.length - 1]) break;
      }
    }
    return type;
  },

  // Один бонус на поле; первый — только после нескольких уничтожений; командир форсирует POWER.
  tryDrop: function (game, x, y, opt) {
    opt = opt || {};
    if (!opt.force) {
      if (game.bonuses.length > 0) return;
      if ((game.killed || 0) < this.FIRST_AFTER) return;
      if (Math.random() > this.CHANCE) return;
    }
    const cell = this.findCell(game, x, y);
    if (!cell) return;
    const type = opt.type || this.pickType(game);
    if (opt.force) game.bonuses.length = 0;
    const t = SR.CONST.TILE;
    game.bonusHistory.push(type);
    if (game.bonusHistory.length > 8) game.bonusHistory.shift();
    game.bonuses.push({
      type: type,
      x: cell.c * t + (t - this.SIZE) / 2,
      y: cell.r * t + (t - this.SIZE) / 2,
      life: this.LIFE_MS,
      born: 0
    });
  },

  update: function (game, dt) {
    game.freezeLeft = Math.max(0, game.freezeLeft - dt);
    game.baseGlow = Math.max(0, (game.baseGlow || 0) - dt);
    if (game.empRing) {
      game.empRing.t += dt;
      if (game.empRing.t > 280) game.empRing = null;
    }
    for (let i = game.bonuses.length - 1; i >= 0; i--) {
      const item = game.bonuses[i];
      item.born += dt;
      item.life -= dt;
      if (item.life <= 0) game.bonuses.splice(i, 1);
    }
    for (let i = game.floats.length - 1; i >= 0; i--) {
      game.floats[i].t += dt;
      if (game.floats[i].t >= game.floats[i].duration) game.floats.splice(i, 1);
    }
    this.collect(game);
  },

  collect: function (game) {
    if (!game.player || game.player.dead) return;
    const body = SR.Collision.tankRect(game.player.x, game.player.y);
    for (let i = game.bonuses.length - 1; i >= 0; i--) {
      const item = game.bonuses[i];
      if (!SR.Collision.rects(body, { x: item.x, y: item.y, w: this.SIZE, h: this.SIZE })) continue;
      this.apply(game, item.type);
      this.float(game, this.LABELS[item.type], item.x + 10, item.y);
      game.bonuses.splice(i, 1);
    }
  },

  float: function (game, text, x, y, duration) {
    game.floats.push({
      text: text,
      x: x,
      y: y,
      t: 0,
      duration: duration || 1000
    });
  },

  apply: function (game, type) {
    const player = game.player;
    if (type === SR.BONUS.POWER) {
      if (game.tankLevel < 4) {
        game.tankLevel += 1;
        player.applyLevel(game.tankLevel);
        player.flash = 420;
        this.float(game, "ТАНК УСИЛЕН", player.x + 14, player.y - 8, 1100);
        SR.Audio.upgrade();
      } else {
        game.score += this.MAX_SCORE_POWER;
        SR.Audio.bonus();
      }
      return;
    }
    if (type === SR.BONUS.SHIELD) {
      player.shieldCharges = 2;
      SR.Audio.bonus();
      return;
    }
    if (type === SR.BONUS.TURBO) {
      player.speedBoost = this.SPEED_MS;
      SR.Audio.bonus();
      return;
    }
    if (type === SR.BONUS.LIFE) {
      if (game.lives >= 5) game.score += this.MAX_SCORE_LIFE;
      else game.lives += 1;
      SR.Audio.life();
      return;
    }
    if (type === SR.BONUS.REPAIR) {
      if (game.baseHp < game.baseMaxHp) {
        game.baseHp = game.baseMaxHp;
        game.baseGlow = 500;
        SR.Audio.bonus();
      } else {
        game.score += this.MAX_SCORE_REPAIR;
        SR.Audio.bonus();
      }
      return;
    }
    if (type === SR.BONUS.FREEZE) {
      game.freezeLeft = this.FREEZE_MS;
      SR.Audio.freeze();
      return;
    }
    if (type === SR.BONUS.EMP) {
      this.pulse(game);
      return;
    }
    if (type === SR.BONUS.BOMB) this.detonate(game);
  },

  pulse: function (game) {
    SR.Audio.emp();
    for (let i = 0; i < game.bullets.length; i++) {
      if (game.bullets[i].ownerId !== "player") game.bullets[i].alive = false;
    }
    for (let i = 0; i < game.enemies.length; i++) {
      if (game.enemies[i].kind === "heavy") game.enemies[i].empSlow = this.EMP_SLOW_MS;
    }
    const mid = SR.CONST.COLS * SR.CONST.TILE / 2;
    game.empRing = { t: 0, x: mid, y: mid };
  },

  detonate: function (game) {
    SR.Audio.bomb();
    const list = game.enemies.slice();
    for (let i = 0; i < list.length; i++) {
      const enemy = list[i];
      if (enemy.dead) continue;
      enemy.invuln = 0;
      if (enemy.kind === "heavy" || enemy.kind === "commander") {
        enemy.hp -= 1;
        if (enemy.hp <= 0) game.destroyTank(enemy);
      } else {
        game.destroyTank(enemy);
      }
    }
  },

  draw: function (ctx, game, time) {
    for (let i = 0; i < game.bonuses.length; i++) this.drawOne(ctx, game.bonuses[i], time);
    this.drawFloats(ctx, game);
    if (game.empRing && game.empRing.t < 280) {
      const r = 12 + game.empRing.t * 0.9;
      ctx.strokeStyle = "rgba(180, 90, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(game.empRing.x - r, game.empRing.y - r, r * 2, r * 2);
    }
  },

  drawOne: function (ctx, item, time) {
    const grow = Math.min(1, item.born / 220);
    const pulse = 1 + Math.sin(time / 120) * 0.08;
    const blink = item.life < 2500 && Math.floor(time / 80) % 2 === 0;
    if (blink) return;
    const size = this.SIZE * grow * pulse;
    const x = Math.round(item.x + (this.SIZE - size) / 2);
    const y = Math.round(item.y + (this.SIZE - size) / 2 + Math.sin(time / 140) * 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / this.SIZE, size / this.SIZE);
    this.drawIcon(ctx, item.type, 0, 0, time);
    ctx.restore();
  },

  strokeBox: function (ctx, fill, x, y, w, h) {
    ctx.fillStyle = "#120e08";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  },

  drawIcon: function (ctx, type, x, y, time) {
    if (type === "power") this.iconPower(ctx, x, y);
    else if (type === "shield") this.iconShield(ctx, x, y, time);
    else if (type === "turbo") this.iconTurbo(ctx, x, y);
    else if (type === "life") this.iconLife(ctx, x, y);
    else if (type === "repair") this.iconRepair(ctx, x, y);
    else if (type === "freeze") this.iconFreeze(ctx, x, y);
    else if (type === "emp") this.iconEmp(ctx, x, y, time);
    else this.iconBomb(ctx, x, y, time);
  },

  iconPower: function (ctx, x, y) {
    this.strokeBox(ctx, "#8a1818", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#c41c24";
    ctx.fillRect(x + 3, y + 3, 14, 14);
    ctx.fillStyle = "#f0d060";
    ctx.fillRect(x + 9, y + 4, 3, 10);
    ctx.fillRect(x + 6, y + 7, 9, 3);
    ctx.fillRect(x + 7, y + 5, 7, 2);
    ctx.fillStyle = "#fff0c0";
    ctx.fillRect(x + 15, y + 3, 2, 2);
  },

  iconShield: function (ctx, x, y, time) {
    this.strokeBox(ctx, "#163a88", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#3a8bdc";
    ctx.fillRect(x + 7, y + 3, 7, 2);
    ctx.fillRect(x + 4, y + 5, 13, 8);
    ctx.fillRect(x + 6, y + 13, 9, 2);
    ctx.fillRect(x + 8, y + 15, 5, 2);
    ctx.fillStyle = "#d8f0ff";
    ctx.fillRect(x + 8, y + 7, 5, 5);
    const a = (time || 0) / 180;
    ctx.fillStyle = "#9ad8ff";
    ctx.fillRect(x + 2 + Math.round(Math.cos(a) * 7 + 7), y + 2 + Math.round(Math.sin(a) * 7 + 7), 2, 2);
    ctx.fillRect(x + 2 + Math.round(Math.cos(a + 2) * 7 + 7), y + 2 + Math.round(Math.sin(a + 2) * 7 + 7), 2, 2);
  },

  iconTurbo: function (ctx, x, y) {
    this.strokeBox(ctx, "#120e08", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#f0d024";
    ctx.fillRect(x + 11, y + 3, 4, 3);
    ctx.fillRect(x + 8, y + 6, 7, 3);
    ctx.fillRect(x + 5, y + 9, 8, 3);
    ctx.fillRect(x + 8, y + 12, 5, 3);
    ctx.fillRect(x + 4, y + 15, 6, 2);
    ctx.fillStyle = "#fffde0";
    ctx.fillRect(x + 3, y + 11, 2, 2);
    ctx.fillRect(x + 2, y + 14, 2, 2);
  },

  iconLife: function (ctx, x, y) {
    this.strokeBox(ctx, "#145c22", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#3dba4c";
    ctx.fillRect(x + 5, y + 8, 10, 8);
    ctx.fillRect(x + 6, y + 6, 8, 3);
    ctx.fillStyle = "#1a1c18";
    ctx.fillRect(x + 4, y + 9, 3, 7);
    ctx.fillRect(x + 13, y + 9, 3, 7);
    ctx.fillStyle = "#f4f0d8";
    ctx.fillRect(x + 9, y + 3, 2, 8);
    ctx.fillRect(x + 7, y + 5, 6, 2);
  },

  iconRepair: function (ctx, x, y) {
    this.strokeBox(ctx, "#c45c18", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#e07020";
    ctx.fillRect(x + 3, y + 3, 14, 14);
    ctx.fillStyle = "#fff8e8";
    ctx.fillRect(x + 9, y + 5, 3, 11);
    ctx.fillRect(x + 5, y + 9, 11, 3);
  },

  iconFreeze: function (ctx, x, y) {
    this.strokeBox(ctx, "#2a78b8", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#e8f8ff";
    ctx.fillRect(x + 10, y + 3, 2, 15);
    ctx.fillRect(x + 4, y + 9, 13, 2);
    ctx.fillRect(x + 6, y + 5, 2, 2);
    ctx.fillRect(x + 13, y + 5, 2, 2);
    ctx.fillRect(x + 6, y + 14, 2, 2);
    ctx.fillRect(x + 13, y + 14, 2, 2);
    ctx.fillStyle = "#b8ecff";
    ctx.fillRect(x + 3, y + 3, 2, 2);
    ctx.fillRect(x + 16, y + 16, 2, 2);
  },

  iconEmp: function (ctx, x, y, time) {
    this.strokeBox(ctx, "#4a1878", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#8a3cdc";
    ctx.fillRect(x + 5, y + 5, 11, 11);
    ctx.fillStyle = "#e0c0ff";
    ctx.fillRect(x + 8, y + 8, 5, 5);
    const w = 2 + Math.floor((time || 0) / 120) % 3;
    ctx.fillRect(x + 4, y + 10, w, 2);
    ctx.fillRect(x + 15 - w, y + 10, w, 2);
  },

  iconBomb: function (ctx, x, y, time) {
    this.strokeBox(ctx, "#2a2a28", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(x + 6, y + 7, 10, 9);
    ctx.fillRect(x + 7, y + 6, 8, 11);
    ctx.fillStyle = "#c41c24";
    ctx.fillRect(x + 10, y + 3, 2, 4);
    ctx.fillRect(x + 12, y + 3, 3, 2);
    ctx.fillStyle = Math.floor((time || 0) / 120) % 2 ? "#f0d060" : "#fff8d0";
    ctx.fillRect(x + 14, y + 2, 2, 2);
  },

  drawFloats: function (ctx, game) {
    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "center";
    for (let i = 0; i < game.floats.length; i++) {
      const f = game.floats[i];
      const k = f.t / f.duration;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = "#120e08";
      ctx.fillText(f.text, f.x + 1, f.y - k * 18 + 1);
      ctx.fillStyle = "#f4e8b0";
      ctx.fillText(f.text, f.x, f.y - k * 18);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
};
