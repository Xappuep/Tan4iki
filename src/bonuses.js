window.SR = window.SR || {};

SR.BONUS = {
  POWER: "power",
  SHIELD: "shield",
  SPEED: "speed",
  LIFE: "life",
  REPAIR: "repair",
  FREEZE: "freeze",
  BOMB: "bomb"
};

SR.Bonuses = {
  SIZE: 20,
  LIFE_MS: 12000,
  SPEED_MS: 15000,
  FREEZE_MS: 7000,
  CHANCE: 0.3,
  MAX_SCORE_POWER: 500,
  MAX_SCORE_REPAIR: 300,
  TYPES: ["power", "shield", "speed", "life", "repair", "freeze", "bomb"],
  LABELS: {
    power: "МОЩЬ",
    shield: "ЩИТ",
    speed: "СКОРОСТЬ",
    life: "ЖИЗНЬ",
    repair: "РЕМОНТ",
    freeze: "СТУЖА",
    bomb: "БОМБА"
  },

  cellFree: function (game, c, r) {
    if (!SR.Map.inBounds(c, r)) return false;
    const type = game.grid[r][c];
    if (type === SR.TILE.BRICK || type === SR.TILE.STEEL || type === SR.TILE.WATER || type === SR.TILE.BASE) {
      return false;
    }
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

  tryDrop: function (game, x, y) {
    if (game.bonuses.length > 0) return;
    if (Math.random() > this.CHANCE) return;
    const cell = this.findCell(game, x, y);
    if (!cell) return;
    const t = SR.CONST.TILE;
    const type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
    game.bonuses.push({
      type: type,
      x: cell.c * t + (t - this.SIZE) / 2,
      y: cell.r * t + (t - this.SIZE) / 2,
      life: this.LIFE_MS,
      born: 0
    });
  },

  update: function (game, dt) {
    if (game.freezeLeft > 0) {
      game.freezeLeft = Math.max(0, game.freezeLeft - dt);
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
      if (game.tankLevel < 3) {
        game.tankLevel += 1;
        player.applyLevel(game.tankLevel);
        player.flash = 420;
        this.float(game, "ТАНК УСИЛЕН!", player.x + 14, player.y - 6, 1100);
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
    if (type === SR.BONUS.SPEED) {
      player.speedBoost = this.SPEED_MS;
      SR.Audio.bonus();
      return;
    }
    if (type === SR.BONUS.LIFE) {
      game.lives = Math.min(5, game.lives + 1);
      SR.Audio.bonus();
      return;
    }
    if (type === SR.BONUS.REPAIR) {
      if (game.baseHp < game.baseMaxHp) {
        game.baseHp = game.baseMaxHp;
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
    if (type === SR.BONUS.BOMB) {
      this.detonate(game);
    }
  },

  detonate: function (game) {
    SR.Audio.bomb();
    const list = game.enemies.slice();
    for (let i = 0; i < list.length; i++) {
      const enemy = list[i];
      if (enemy.dead) continue;
      const cx = enemy.x + SR.CONST.TANK / 2;
      const cy = enemy.y + SR.CONST.TANK / 2;
      game.addExplosion(cx, cy, true);
      enemy.invuln = 0;
      enemy.hp -= 1;
      if (enemy.hp <= 0) game.destroyTank(enemy);
    }
  },

  draw: function (ctx, game, time) {
    for (let i = 0; i < game.bonuses.length; i++) {
      this.drawOne(ctx, game.bonuses[i], time);
    }
    this.drawFloats(ctx, game);
  },

  drawOne: function (ctx, item, time) {
    const grow = Math.min(1, item.born / 220);
    const pulse = 1 + Math.sin(time / 120) * 0.08;
    const blink = item.life < 3000 && Math.floor(time / 90) % 2 === 0;
    if (blink) return;
    const size = this.SIZE * grow * pulse;
    const x = Math.round(item.x + (this.SIZE - size) / 2);
    const y = Math.round(item.y + (this.SIZE - size) / 2 + Math.sin(time / 140) * 2);
    ctx.save();
    ctx.translate(x, y);
    const s = size / this.SIZE;
    ctx.scale(s, s);
    this.drawIcon(ctx, item.type, 0, 0);
    const spark = Math.floor(time / 160) % 3;
    ctx.fillStyle = "#fff8d0";
    ctx.fillRect(1 + spark * 6, 1, 2, 2);
    ctx.fillRect(16 - spark * 5, 3, 2, 2);
    ctx.fillRect(8, 17 - spark, 2, 2);
    ctx.restore();
  },

  strokeBox: function (ctx, fill, x, y, w, h) {
    ctx.fillStyle = "#120e08";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  },

  drawIcon: function (ctx, type, x, y) {
    if (type === "power") this.iconPower(ctx, x, y);
    else if (type === "shield") this.iconShield(ctx, x, y);
    else if (type === "speed") this.iconSpeed(ctx, x, y);
    else if (type === "life") this.iconLife(ctx, x, y);
    else if (type === "repair") this.iconRepair(ctx, x, y);
    else if (type === "freeze") this.iconFreeze(ctx, x, y);
    else this.iconBomb(ctx, x, y);
  },

  iconPower: function (ctx, x, y) {
    this.strokeBox(ctx, "#c41c24", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#f0d060";
    ctx.fillRect(x + 9, y + 3, 3, 3);
    ctx.fillRect(x + 6, y + 5, 9, 3);
    ctx.fillRect(x + 4, y + 8, 13, 3);
    ctx.fillRect(x + 7, y + 11, 7, 3);
    ctx.fillRect(x + 9, y + 14, 3, 3);
    ctx.fillStyle = "#fff0c0";
    ctx.fillRect(x + 9, y + 8, 3, 8);
    ctx.fillRect(x + 8, y + 9, 5, 3);
  },

  iconShield: function (ctx, x, y) {
    this.strokeBox(ctx, "#1c4ea8", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#3a8bdc";
    ctx.fillRect(x + 7, y + 3, 7, 2);
    ctx.fillRect(x + 4, y + 5, 13, 8);
    ctx.fillRect(x + 6, y + 13, 9, 2);
    ctx.fillRect(x + 8, y + 15, 5, 2);
    ctx.fillStyle = "#d8f0ff";
    ctx.fillRect(x + 8, y + 7, 5, 5);
    ctx.fillStyle = "#8cd0ff";
    ctx.fillRect(x + 9, y + 8, 3, 3);
  },

  iconSpeed: function (ctx, x, y) {
    this.strokeBox(ctx, "#d4a017", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#fff06a";
    ctx.fillRect(x + 11, y + 3, 4, 3);
    ctx.fillRect(x + 8, y + 6, 7, 3);
    ctx.fillRect(x + 5, y + 9, 8, 3);
    ctx.fillRect(x + 8, y + 12, 5, 3);
    ctx.fillRect(x + 4, y + 15, 6, 2);
    ctx.fillStyle = "#fffde0";
    ctx.fillRect(x + 9, y + 7, 3, 6);
  },

  iconLife: function (ctx, x, y) {
    this.strokeBox(ctx, "#1e7a2c", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#4cdc5a";
    ctx.fillRect(x + 5, y + 5, 4, 4);
    ctx.fillRect(x + 12, y + 5, 4, 4);
    ctx.fillRect(x + 4, y + 8, 13, 5);
    ctx.fillRect(x + 6, y + 13, 9, 2);
    ctx.fillRect(x + 8, y + 15, 5, 2);
    ctx.fillStyle = "#d8ffd0";
    ctx.fillRect(x + 6, y + 7, 2, 2);
  },

  iconRepair: function (ctx, x, y) {
    this.strokeBox(ctx, "#e07020", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#ffe0b0";
    ctx.fillRect(x + 9, y + 4, 3, 13);
    ctx.fillRect(x + 4, y + 9, 13, 3);
    ctx.fillStyle = "#fff8e8";
    ctx.fillRect(x + 10, y + 6, 1, 9);
  },

  iconFreeze: function (ctx, x, y) {
    this.strokeBox(ctx, "#3a9cdc", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#e8f8ff";
    ctx.fillRect(x + 10, y + 3, 2, 15);
    ctx.fillRect(x + 4, y + 9, 13, 2);
    ctx.fillRect(x + 6, y + 5, 2, 2);
    ctx.fillRect(x + 13, y + 5, 2, 2);
    ctx.fillRect(x + 6, y + 14, 2, 2);
    ctx.fillRect(x + 13, y + 14, 2, 2);
    ctx.fillRect(x + 8, y + 7, 5, 2);
    ctx.fillRect(x + 8, y + 12, 5, 2);
  },

  iconBomb: function (ctx, x, y) {
    this.strokeBox(ctx, "#2a2a28", x + 1, y + 1, 18, 18);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(x + 6, y + 7, 10, 9);
    ctx.fillRect(x + 7, y + 6, 8, 11);
    ctx.fillStyle = "#c41c24";
    ctx.fillRect(x + 10, y + 3, 2, 4);
    ctx.fillRect(x + 12, y + 3, 3, 2);
    ctx.fillStyle = "#f0d060";
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
