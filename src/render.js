window.SR = window.SR || {};

SR.PALETTE = {
  ground: "#3a3018",
  groundDot: "#2a2412",
  brick: "#c45c26",
  brickDark: "#8b3a12",
  brickLight: "#e08a4a",
  mortar: "#4a2a14",
  steel: "#8a93a0",
  steelDark: "#4e5864",
  steelLight: "#d0d6de",
  water: "#1e5f8a",
  waterLight: "#3a8bb8",
  forest: "#1f6b3a",
  forestLight: "#2f9e56",
  forestDark: "#0f3d22",
  ice: "#b8d4e8",
  iceLight: "#e8f4fc",
  iceLine: "#7aa0bc",
  base: "#d4a017",
  baseDark: "#8a6a10",
  core: "#f4e8b0",
  bullet: "#f4f0d8",
  strong: "#f4c430",
  playerBody: "#3dba4c",
  playerDark: "#1e7a2c",
  playerLight: "#8eec6a",
  basicBody: "#c9a227",
  basicDark: "#7a6414",
  basicLight: "#e8d36a",
  fastBody: "#3db8c9",
  fastDark: "#1b6e7a",
  fastLight: "#8eecf4",
  heavyBody: "#b04232",
  heavyDark: "#6a241c",
  heavyLight: "#e07868",
  tread: "#1a1c18",
  explosion: "#f4c430",
  explosionHot: "#f4f0d8",
  explosionRed: "#c45c26"
};

SR.Render = {
  draw: function (ctx, game, time) {
    const size = SR.CONST.COLS * SR.CONST.TILE;
    ctx.fillStyle = SR.PALETTE.ground;
    ctx.fillRect(0, 0, size, size);
    this.drawGround(ctx, size);
    this.drawTiles(ctx, game.grid, time, false);
    this.drawBonuses(ctx, game.bonuses, time);
    if (game.player && !game.player.dead) this.drawTank(ctx, game.player, "player", time);
    for (let i = 0; i < game.enemies.length; i++) {
      const enemy = game.enemies[i];
      if (!enemy.dead) this.drawTank(ctx, enemy, enemy.kind, time);
    }
    this.drawTiles(ctx, game.grid, time, true);
    this.drawBullets(ctx, game.bullets);
    this.drawExplosions(ctx, game.explosions);
  },

  drawGround: function (ctx, size) {
    ctx.fillStyle = SR.PALETTE.groundDot;
    for (let y = 4; y < size; y += 8) {
      for (let x = 4; x < size; x += 8) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  },

  drawTiles: function (ctx, grid, time, forestOnly) {
    const t = SR.CONST.TILE;
    for (let r = 0; r < SR.CONST.ROWS; r++) {
      for (let c = 0; c < SR.CONST.COLS; c++) {
        const type = grid[r][c];
        const x = c * t;
        const y = r * t;
        if (forestOnly) {
          if (type === SR.TILE.FOREST) {
            ctx.globalAlpha = 0.82;
            this.drawForest(ctx, x, y);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        if (type === SR.TILE.BRICK) this.drawBrick(ctx, x, y);
        else if (type === SR.TILE.STEEL) this.drawSteel(ctx, x, y);
        else if (type === SR.TILE.WATER) this.drawWater(ctx, x, y, time);
        else if (type === SR.TILE.ICE) this.drawIce(ctx, x, y);
        else if (type === SR.TILE.BASE) this.drawBase(ctx, x, y, time);
      }
    }
  },

  drawBrick: function (ctx, x, y) {
    ctx.fillStyle = SR.PALETTE.mortar;
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = SR.PALETTE.brick;
    ctx.fillRect(x, y, 15, 15);
    ctx.fillRect(x + 17, y, 15, 15);
    ctx.fillRect(x, y + 17, 15, 15);
    ctx.fillRect(x + 17, y + 17, 15, 15);
    ctx.fillStyle = SR.PALETTE.brickLight;
    ctx.fillRect(x + 1, y + 1, 8, 3);
    ctx.fillRect(x + 18, y + 1, 8, 3);
    ctx.fillRect(x + 1, y + 18, 8, 3);
    ctx.fillRect(x + 18, y + 18, 8, 3);
    ctx.fillStyle = SR.PALETTE.brickDark;
    ctx.fillRect(x + 11, y + 11, 4, 4);
    ctx.fillRect(x + 28, y + 11, 4, 4);
    ctx.fillRect(x + 11, y + 28, 4, 4);
    ctx.fillRect(x + 28, y + 28, 4, 4);
  },

  drawSteel: function (ctx, x, y) {
    ctx.fillStyle = SR.PALETTE.steelDark;
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = SR.PALETTE.steel;
    ctx.fillRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = SR.PALETTE.steelLight;
    ctx.fillRect(x + 4, y + 4, 12, 3);
    ctx.fillRect(x + 4, y + 4, 3, 12);
    ctx.fillStyle = SR.PALETTE.steelDark;
    ctx.fillRect(x + 8, y + 8, 4, 4);
    ctx.fillRect(x + 20, y + 8, 4, 4);
    ctx.fillRect(x + 8, y + 20, 4, 4);
    ctx.fillRect(x + 20, y + 20, 4, 4);
    ctx.fillStyle = SR.PALETTE.steelLight;
    ctx.fillRect(x + 9, y + 9, 2, 2);
    ctx.fillRect(x + 21, y + 9, 2, 2);
    ctx.fillRect(x + 9, y + 21, 2, 2);
    ctx.fillRect(x + 21, y + 21, 2, 2);
  },

  drawWater: function (ctx, x, y, time) {
    ctx.fillStyle = SR.PALETTE.water;
    ctx.fillRect(x, y, 32, 32);
    const wave = Math.floor(time / 220) % 4;
    ctx.fillStyle = SR.PALETTE.waterLight;
    for (let i = 0; i < 3; i++) {
      const yy = y + 6 + i * 8 + wave;
      ctx.fillRect(x + 3, yy, 10, 2);
      ctx.fillRect(x + 18, yy + 2, 10, 2);
    }
  },

  drawIce: function (ctx, x, y) {
    ctx.fillStyle = SR.PALETTE.ice;
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = SR.PALETTE.iceLight;
    ctx.fillRect(x + 2, y + 2, 14, 8);
    ctx.fillStyle = SR.PALETTE.iceLine;
    ctx.fillRect(x + 4, y + 18, 18, 2);
    ctx.fillRect(x + 16, y + 8, 2, 16);
  },

  drawForest: function (ctx, x, y) {
    ctx.fillStyle = SR.PALETTE.forestDark;
    ctx.fillRect(x + 2, y + 10, 12, 16);
    ctx.fillRect(x + 14, y + 8, 16, 18);
    ctx.fillStyle = SR.PALETTE.forest;
    ctx.fillRect(x + 4, y + 4, 14, 14);
    ctx.fillRect(x + 12, y + 2, 16, 16);
    ctx.fillStyle = SR.PALETTE.forestLight;
    ctx.fillRect(x + 8, y + 6, 6, 6);
    ctx.fillRect(x + 18, y + 8, 6, 6);
  },

  drawBase: function (ctx, x, y, time) {
    ctx.fillStyle = SR.PALETTE.baseDark;
    ctx.fillRect(x + 2, y + 4, 28, 26);
    ctx.fillStyle = SR.PALETTE.base;
    ctx.fillRect(x + 4, y + 6, 24, 22);
    ctx.fillStyle = SR.PALETTE.steelDark;
    ctx.fillRect(x + 8, y + 12, 16, 12);
    const pulse = 0.5 + Math.sin(time / 180) * 0.5;
    ctx.fillStyle = pulse > 0.45 ? SR.PALETTE.core : SR.PALETTE.base;
    ctx.fillRect(x + 12, y + 14, 8, 8);
    ctx.fillStyle = SR.PALETTE.core;
    ctx.fillRect(x + 14, y + 8, 4, 6);
  },

  colorsFor: function (kind) {
    if (kind === "fast") {
      return { body: SR.PALETTE.fastBody, dark: SR.PALETTE.fastDark, light: SR.PALETTE.fastLight };
    }
    if (kind === "heavy") {
      return { body: SR.PALETTE.heavyBody, dark: SR.PALETTE.heavyDark, light: SR.PALETTE.heavyLight };
    }
    if (kind === "basic") {
      return { body: SR.PALETTE.basicBody, dark: SR.PALETTE.basicDark, light: SR.PALETTE.basicLight };
    }
    return { body: SR.PALETTE.playerBody, dark: SR.PALETTE.playerDark, light: SR.PALETTE.playerLight };
  },

  drawTank: function (ctx, tank, kind, time) {
    if (tank.invuln > 0 && Math.floor(time / 90) % 2 === 0) return;
    const pal = this.colorsFor(kind);
    if (kind === "heavy" && tank.hp < tank.maxHp) {
      pal.body = tank.hp === 1 ? "#6a241c" : "#8a3428";
    }
    ctx.save();
    ctx.translate(tank.x + SR.CONST.TANK / 2, tank.y + SR.CONST.TANK / 2);
    ctx.rotate(tank.dir * Math.PI / 2);
    ctx.translate(-SR.CONST.TANK / 2, -SR.CONST.TANK / 2);
    ctx.fillStyle = SR.PALETTE.tread;
    ctx.fillRect(1, 2, 5, 24);
    ctx.fillRect(22, 2, 5, 24);
    ctx.fillStyle = pal.dark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(2, 4 + i * 5, 3, 2);
      ctx.fillRect(23, 4 + i * 5, 3, 2);
    }
    ctx.fillStyle = pal.body;
    ctx.fillRect(6, 6, 16, 18);
    ctx.fillStyle = pal.light;
    ctx.fillRect(8, 8, 12, 6);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(9, 12, 10, 8);
    ctx.fillStyle = pal.body;
    ctx.fillRect(12, 0, 4, 12);
    ctx.fillStyle = pal.light;
    ctx.fillRect(13, 0, 2, 8);
    ctx.restore();

    if (tank.shield > 0) {
      ctx.strokeStyle = SR.PALETTE.core;
      ctx.lineWidth = 2;
      ctx.strokeRect(tank.x - 2, tank.y - 2, SR.CONST.TANK + 4, SR.CONST.TANK + 4);
    }
  },

  drawBullets: function (ctx, bullets) {
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      ctx.fillStyle = b.strong ? SR.PALETTE.strong : SR.PALETTE.bullet;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
    }
  },

  drawBonuses: function (ctx, bonuses, time) {
    for (let i = 0; i < bonuses.length; i++) {
      const item = bonuses[i];
      const bob = Math.round(Math.sin(time / 140) * 2);
      const x = item.x;
      const y = item.y + bob;
      ctx.fillStyle = SR.PALETTE.baseDark;
      ctx.fillRect(x + 1, y + 1, 16, 16);
      ctx.fillStyle = SR.PALETTE.base;
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = "#1a1408";
      if (item.type === "shot") {
        ctx.fillRect(x + 7, y + 3, 2, 10);
        ctx.fillRect(x + 5, y + 5, 6, 2);
        ctx.fillRect(x + 6, y + 11, 4, 2);
      } else if (item.type === "shield") {
        ctx.fillRect(x + 4, y + 4, 8, 2);
        ctx.fillRect(x + 4, y + 10, 8, 2);
        ctx.fillRect(x + 4, y + 4, 2, 8);
        ctx.fillRect(x + 10, y + 4, 2, 8);
      } else {
        ctx.fillRect(x + 7, y + 3, 2, 10);
        ctx.fillRect(x + 4, y + 7, 8, 2);
      }
    }
  },

  drawExplosions: function (ctx, explosions) {
    for (let i = 0; i < explosions.length; i++) {
      const e = explosions[i];
      const k = e.t / e.duration;
      const r = (e.big ? 10 : 6) + k * (e.big ? 18 : 12);
      ctx.fillStyle = k < 0.35 ? SR.PALETTE.explosionHot : (k < 0.7 ? SR.PALETTE.explosion : SR.PALETTE.explosionRed);
      ctx.fillRect(e.x - r, e.y - r / 2, r * 2, r);
      ctx.fillRect(e.x - r / 2, e.y - r, r, r * 2);
      ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
    }
  }
};
