window.SR = window.SR || {};

SR.PALETTE = {
  ground: "#3a3018",
  groundDot: "#2a2412",
  brick: "#c45c26",
  brickDark: "#8b3a12",
  brickLight: "#e08a4a",
  mortar: "#4a2a14",
  steel: "#7a8a9c",
  steelDark: "#3a4a5c",
  steelLight: "#c8d4e0",
  water: "#1e5f8a",
  waterLight: "#3a8bb8",
  forest: "#1f6b3a",
  forestLight: "#2f9e56",
  forestDark: "#0f3d22",
  ice: "#c8e4f4",
  iceLight: "#eef8fc",
  iceLine: "#8ab4cc",
  base: "#d4a017",
  baseDark: "#8a6a10",
  core: "#f4e8b0",
  bullet: "#f4f0d8",
  strong: "#f4c430",
  playerBody: "#5a8a32",
  playerDark: "#2a4e1c",
  playerLight: "#c4b04a",
  basicBody: "#c44a22",
  basicDark: "#7a2410",
  basicLight: "#e87848",
  fastBody: "#e09028",
  fastDark: "#8a5410",
  fastLight: "#f4c450",
  heavyBody: "#6a1838",
  heavyDark: "#3a0c24",
  heavyLight: "#a04068",
  sapperBody: "#a84820",
  sapperDark: "#5c2410",
  sapperLight: "#d87840",
  commanderBody: "#7a1430",
  commanderDark: "#3c0818",
  commanderLight: "#f0d060",
  tread: "#1a1c18",
  wheel: "#2e2e2a",
  wheelHub: "#6a6a62",
  starRed: "#d41c24",
  starDark: "#7a1014",
  starGold: "#f0d060",
  starGoldDark: "#b88818",
  starGlow: "#ffe9a0",
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
    this.drawTiles(ctx, game.grid, time, false, game);
    this.drawSpawnWarn(ctx, game);
    this.drawDust(ctx, game.dust);
    if (game.player && !game.player.dead) this.drawTank(ctx, game.player, "player", time, game);
    for (let i = 0; i < game.enemies.length; i++) {
      const enemy = game.enemies[i];
      if (!enemy.dead) this.drawTank(ctx, enemy, enemy.kind, time, game);
    }
    this.drawTiles(ctx, game.grid, time, true, game);
    SR.Bonuses.draw(ctx, game, time);
    this.drawBullets(ctx, game.bullets);
    this.drawSparks(ctx, game.sparks);
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

  drawTiles: function (ctx, grid, time, forestOnly, game) {
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
        if (type === SR.TILE.BRICK) SR.Brick.drawCell(ctx, grid, c, r);
        else if (type === SR.TILE.STEEL) this.drawSteel(ctx, x, y);
        else if (type === SR.TILE.WATER) this.drawWater(ctx, x, y, time);
        else if (type === SR.TILE.ICE) this.drawIce(ctx, x, y);
        else if (type === SR.TILE.BASE) this.drawBase(ctx, x, y, time, game);
      }
    }
  },

  drawSpawnWarn: function (ctx, game) {
    const w = game.spawnWarn;
    if (!w) return;
    const t = SR.CONST.TILE;
    const on = Math.floor(w.t / 90) % 2 === 0;
    const x = w.c * t;
    const y = w.r * t;
    ctx.fillStyle = on ? "#d4a017" : "#6a5420";
    ctx.fillRect(x + 1, y + 1, t - 2, 2);
    ctx.fillRect(x + 1, y + t - 3, t - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, t - 2);
    ctx.fillRect(x + t - 3, y + 1, 2, t - 2);
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + t - 7, y + 4, 3, 3);
    ctx.fillRect(x + 4, y + t - 7, 3, 3);
    ctx.fillRect(x + t - 7, y + t - 7, 3, 3);
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

  drawBase: function (ctx, x, y, time, game) {
    const cx = x + 16;
    const cy = y + 15;
    const hurt = game && game.baseHp < game.baseMaxHp;
    const glow = game && game.baseGlow > 0;
    ctx.fillStyle = "#2a2412";
    ctx.fillRect(x + 4, y + 24, 24, 6);
    ctx.fillStyle = SR.PALETTE.starGoldDark;
    ctx.fillRect(x + 6, y + 23, 20, 4);
    ctx.fillStyle = glow ? "#fff4b0" : SR.PALETTE.starGold;
    ctx.fillRect(x + 8, y + 22, 16, 3);

    const pulse = 0.55 + Math.sin(time / (hurt ? 90 : 160)) * 0.45;
    ctx.save();
    ctx.globalAlpha = glow ? 0.55 : (0.22 + pulse * (hurt ? 0.5 : 0.28));
    ctx.fillStyle = glow ? "#fff4b0" : (hurt ? "#c45c26" : SR.PALETTE.starGlow);
    this.starPath(ctx, cx, cy, 15, 6.5);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = SR.PALETTE.starGoldDark;
    this.starPath(ctx, cx + 1, cy + 1, 13.5, 5.6);
    ctx.fill();
    ctx.fillStyle = glow ? "#fff0a0" : (hurt ? "#a07820" : SR.PALETTE.starGold);
    this.starPath(ctx, cx, cy, 13.5, 5.6);
    ctx.fill();
    ctx.fillStyle = SR.PALETTE.starDark;
    this.starPath(ctx, cx, cy, 11.5, 4.6);
    ctx.fill();
    ctx.fillStyle = hurt ? "#6a1014" : (pulse > 0.5 ? SR.PALETTE.starRed : "#b0141c");
    this.starPath(ctx, cx, cy, 11.2, 4.5);
    ctx.fill();
    ctx.fillStyle = glow ? "#fff8d0" : (hurt ? "#c9a227" : SR.PALETTE.starGold);
    this.starPath(ctx, cx, cy, 5.2, 2.1);
    ctx.fill();
    ctx.fillStyle = SR.PALETTE.starGlow;
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    if (hurt) {
      ctx.fillStyle = "#2a2412";
      ctx.fillRect(cx - 6, cy, 12, 2);
      ctx.fillRect(cx + 2, cy - 5, 2, 8);
      if (Math.floor(time / 140) % 2 === 0) {
        ctx.fillStyle = "#f4c430";
        ctx.fillRect(x + 14, y + 1, 4, 4);
        ctx.fillRect(x + 15, y + 5, 2, 4);
      }
    }
  },

  starPath: function (ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  },

  px: function (ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  },

  colorsFor: function (kind, tank) {
    if (kind === "fast") {
      return { body: SR.PALETTE.fastBody, dark: SR.PALETTE.fastDark, light: SR.PALETTE.fastLight };
    }
    if (kind === "heavy") {
      return { body: SR.PALETTE.heavyBody, dark: SR.PALETTE.heavyDark, light: SR.PALETTE.heavyLight };
    }
    if (kind === "sapper") {
      return { body: SR.PALETTE.sapperBody, dark: SR.PALETTE.sapperDark, light: SR.PALETTE.sapperLight };
    }
    if (kind === "commander") {
      return { body: SR.PALETTE.commanderBody, dark: SR.PALETTE.commanderDark, light: SR.PALETTE.commanderLight };
    }
    if (kind === "basic") {
      return { body: SR.PALETTE.basicBody, dark: SR.PALETTE.basicDark, light: SR.PALETTE.basicLight };
    }
    const level = tank && tank.tankLevel ? tank.tankLevel : 1;
    if (level >= 4) {
      return { body: "#6e9a3c", dark: "#243c14", light: "#f4d060" };
    }
    if (level >= 3) {
      return { body: "#628c38", dark: "#245018", light: "#e0c050" };
    }
    if (level >= 2) {
      return { body: "#5e8a36", dark: "#2a4e1c", light: "#d4b84a" };
    }
    return { body: SR.PALETTE.playerBody, dark: SR.PALETTE.playerDark, light: SR.PALETTE.playerLight };
  },

  drawTank: function (ctx, tank, kind, time, game) {
    if (tank.invuln > 0 && Math.floor(time / 90) % 2 === 0) return;
    const pal = this.colorsFor(kind, tank);
    if (kind === "heavy" && tank.hp < tank.maxHp) {
      pal.body = tank.hp === 1 ? "#4a1028" : "#5a1430";
    }
    ctx.save();
    ctx.translate(tank.x + SR.CONST.TANK / 2, tank.y + SR.CONST.TANK / 2);
    ctx.rotate(tank.dir * Math.PI / 2);
    ctx.translate(-SR.CONST.TANK / 2, -SR.CONST.TANK / 2);
    if (kind === "player") this.drawT34(ctx, pal, tank.tankLevel || 1);
    else if (kind === "basic") this.drawPz3(ctx, pal);
    else if (kind === "fast") this.drawPz4(ctx, pal);
    else if (kind === "sapper") this.drawSapper(ctx, pal);
    else if (kind === "commander") this.drawCommander(ctx, pal);
    else this.drawPz5(ctx, pal);
    ctx.restore();

    if (game && game.freezeLeft > 0 && kind !== "player") {
      ctx.fillStyle = "rgba(120, 200, 255, 0.38)";
      ctx.fillRect(tank.x, tank.y, SR.CONST.TANK, SR.CONST.TANK);
      ctx.fillStyle = "#e8f8ff";
      ctx.fillRect(tank.x + 4, tank.y + 2, 2, 6);
      ctx.fillRect(tank.x + 12, tank.y + 1, 2, 5);
      ctx.fillRect(tank.x + 20, tank.y + 8, 2, 6);
      ctx.fillRect(tank.x + 8, tank.y + 16, 2, 5);
      ctx.fillRect(tank.x + 16, tank.y + 18, 2, 4);
      ctx.fillRect(tank.x + 6, tank.y + 10, 6, 2);
      ctx.fillRect(tank.x + 16, tank.y + 4, 6, 2);
    }

    if (tank.shieldCharges > 0) {
      const cx = tank.x + SR.CONST.TANK / 2;
      const cy = tank.y + SR.CONST.TANK / 2;
      const flash = tank.flash > 0;
      ctx.strokeStyle = flash ? "#ffffff" : (tank.shieldCharges > 1 ? "#8cd0ff" : "#3a8bdc");
      ctx.lineWidth = flash ? 3 : 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        const px = cx + Math.cos(a) * 18;
        const py = cy + Math.sin(a) * 18;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = flash ? "rgba(200, 236, 255, 0.28)" : (tank.shieldCharges > 1 ? "rgba(140, 208, 255, 0.12)" : "rgba(58, 139, 220, 0.08)");
      ctx.fill();
    }

    if (tank.flash > 0) {
      ctx.strokeStyle = "#fff8d0";
      ctx.lineWidth = 2;
      ctx.strokeRect(tank.x - 3, tank.y - 3, SR.CONST.TANK + 6, SR.CONST.TANK + 6);
    }
  },

  drawTracks: function (ctx, x, y, h, wide) {
    const w = wide ? 6 : 5;
    this.px(ctx, SR.PALETTE.tread, x, y, w, h);
    this.px(ctx, SR.PALETTE.tread, 28 - x - w, y, w, h);
  },

  drawT34: function (ctx, pal, level) {
    this.drawTracks(ctx, 0, 3, 23, true);
    for (let i = 0; i < 5; i++) {
      const wy = 4 + i * 4;
      this.px(ctx, SR.PALETTE.wheel, 1, wy, 4, 4);
      this.px(ctx, SR.PALETTE.wheel, 23, wy, 4, 4);
      this.px(ctx, SR.PALETTE.wheelHub, 2, wy + 1, 2, 2);
      this.px(ctx, SR.PALETTE.wheelHub, 24, wy + 1, 2, 2);
    }
    if (level >= 3) {
      this.px(ctx, pal.light, 0, 8, 2, 12);
      this.px(ctx, pal.light, 26, 8, 2, 12);
      this.px(ctx, pal.dark, 0, 10, 2, 3);
      this.px(ctx, pal.dark, 26, 10, 2, 3);
    }
    this.px(ctx, pal.dark, 5, 18, 3, 6);
    this.px(ctx, pal.dark, 20, 18, 3, 6);
    this.px(ctx, pal.body, 6, 9, 16, 15);
    this.px(ctx, pal.body, 7, 6, 14, 5);
    this.px(ctx, pal.light, 8, 7, 12, 3);
    if (level >= 2) {
      this.px(ctx, pal.light, 7, 15, 14, 2);
    }
    if (level >= 4) {
      this.px(ctx, pal.light, 6, 11, 16, 3);
      this.px(ctx, pal.dark, 6, 14, 16, 1);
      this.px(ctx, "#f4e8b0", 5, 12, 2, 6);
      this.px(ctx, "#f4e8b0", 21, 12, 2, 6);
    } else if (level >= 3) {
      this.px(ctx, pal.light, 6, 14, 16, 3);
      this.px(ctx, pal.dark, 6, 17, 16, 1);
    }
    this.px(ctx, pal.dark, 8, 20, 12, 3);
    this.px(ctx, pal.dark, 9, 21, 3, 2);
    this.px(ctx, pal.dark, 16, 21, 3, 2);
    this.px(ctx, pal.body, 8, 8, 12, 10);
    this.px(ctx, pal.body, 7, 10, 14, 7);
    this.px(ctx, pal.light, 10, 9, 8, 3);
    this.px(ctx, pal.dark, 10, 12, 8, 4);
    const barrel = level >= 4 ? 13 : (level >= 2 ? 12 : 10);
    if (level >= 4) {
      this.px(ctx, pal.dark, 8, 0, 3, barrel);
      this.px(ctx, pal.light, 9, 0, 1, barrel - 1);
      this.px(ctx, pal.dark, 17, 0, 3, barrel);
      this.px(ctx, pal.light, 18, 0, 1, barrel - 1);
      this.px(ctx, pal.light, 7, 0, 5, 2);
      this.px(ctx, pal.light, 16, 0, 5, 2);
    } else {
      this.px(ctx, pal.dark, 12, 0, 4, barrel);
      this.px(ctx, pal.light, 13, 0, 2, barrel - 1);
      this.px(ctx, pal.dark, 11, 0, 6, 2);
      if (level >= 2) {
        this.px(ctx, pal.light, 11, 0, 6, 2);
        this.px(ctx, pal.body, 12, 2, 4, 2);
      }
    }
    this.px(ctx, pal.light, 13, 8, 2, 2);
  },

  drawPz3: function (ctx, pal) {
    this.drawTracks(ctx, 1, 4, 21, false);
    for (let i = 0; i < 6; i++) {
      const wy = 5 + i * 3;
      this.px(ctx, SR.PALETTE.wheel, 2, wy, 3, 3);
      this.px(ctx, SR.PALETTE.wheel, 23, wy, 3, 3);
    }
    this.px(ctx, pal.body, 6, 8, 16, 16);
    this.px(ctx, pal.dark, 6, 8, 16, 2);
    this.px(ctx, pal.light, 7, 10, 14, 3);
    this.px(ctx, pal.body, 9, 7, 10, 9);
    this.px(ctx, pal.dark, 10, 9, 8, 5);
    this.px(ctx, pal.light, 12, 6, 4, 2);
    this.px(ctx, pal.dark, 13, 2, 2, 6);
    this.px(ctx, pal.body, 13, 2, 2, 5);
    this.px(ctx, pal.dark, 12, 1, 4, 2);
  },

  drawPz4: function (ctx, pal) {
    this.px(ctx, pal.dark, 0, 8, 2, 14);
    this.px(ctx, pal.dark, 26, 8, 2, 14);
    this.drawTracks(ctx, 2, 3, 23, false);
    for (let i = 0; i < 4; i++) {
      const wy = 5 + i * 5;
      this.px(ctx, SR.PALETTE.wheel, 3, wy, 3, 4);
      this.px(ctx, SR.PALETTE.wheel, 22, wy, 3, 4);
    }
    this.px(ctx, pal.body, 6, 8, 16, 16);
    this.px(ctx, pal.light, 7, 9, 14, 3);
    this.px(ctx, pal.body, 8, 6, 12, 11);
    this.px(ctx, pal.dark, 9, 8, 10, 6);
    this.px(ctx, pal.light, 10, 7, 8, 2);
    this.px(ctx, pal.dark, 12, 0, 4, 8);
    this.px(ctx, pal.body, 13, 0, 2, 8);
    this.px(ctx, pal.dark, 11, 0, 6, 2);
    this.px(ctx, pal.light, 12, 0, 1, 2);
    this.px(ctx, pal.light, 15, 0, 1, 2);
  },

  drawPz5: function (ctx, pal) {
    this.drawTracks(ctx, 0, 2, 25, true);
    for (let i = 0; i < 4; i++) {
      const wy = 4 + i * 5;
      this.px(ctx, SR.PALETTE.wheel, 1, wy, 5, 4);
      this.px(ctx, SR.PALETTE.wheel, 22, wy, 5, 4);
      this.px(ctx, SR.PALETTE.wheelHub, 2, wy + 1, 2, 2);
      this.px(ctx, SR.PALETTE.wheelHub, 23, wy + 1, 2, 2);
    }
    this.px(ctx, pal.body, 6, 10, 16, 14);
    this.px(ctx, pal.body, 7, 6, 14, 6);
    this.px(ctx, pal.body, 8, 4, 12, 4);
    this.px(ctx, pal.light, 8, 6, 12, 3);
    this.px(ctx, pal.dark, 8, 20, 12, 3);
    this.px(ctx, pal.dark, 9, 8, 3, 3);
    this.px(ctx, pal.dark, 16, 11, 3, 3);
    this.px(ctx, pal.body, 8, 7, 12, 10);
    this.px(ctx, pal.body, 7, 9, 14, 7);
    this.px(ctx, pal.light, 10, 8, 8, 3);
    this.px(ctx, pal.dark, 10, 11, 8, 4);
    this.px(ctx, pal.dark, 12, 0, 4, 8);
    this.px(ctx, pal.body, 13, 0, 2, 9);
    this.px(ctx, pal.dark, 11, 0, 6, 2);
    this.px(ctx, pal.light, 12, 0, 1, 2);
    this.px(ctx, pal.light, 15, 0, 1, 2);
    this.px(ctx, pal.dark, 13, 8, 2, 2);
  },

  drawSapper: function (ctx, pal) {
    this.drawTracks(ctx, 1, 4, 21, false);
    for (let i = 0; i < 5; i++) {
      const wy = 5 + i * 4;
      this.px(ctx, SR.PALETTE.wheel, 2, wy, 3, 3);
      this.px(ctx, SR.PALETTE.wheel, 23, wy, 3, 3);
    }
    this.px(ctx, pal.body, 6, 9, 16, 15);
    this.px(ctx, pal.dark, 6, 9, 16, 2);
    this.px(ctx, pal.light, 8, 12, 12, 3);
    this.px(ctx, pal.body, 9, 8, 10, 8);
    this.px(ctx, "#d8d0b8", 12, 1, 4, 9);
    this.px(ctx, pal.dark, 11, 1, 6, 2);
    this.px(ctx, pal.light, 10, 16, 8, 3);
    this.px(ctx, "#2a2412", 13, 18, 2, 4);
  },

  drawCommander: function (ctx, pal) {
    this.drawTracks(ctx, 0, 2, 25, true);
    for (let i = 0; i < 4; i++) {
      const wy = 4 + i * 5;
      this.px(ctx, SR.PALETTE.wheel, 1, wy, 5, 4);
      this.px(ctx, SR.PALETTE.wheel, 22, wy, 5, 4);
    }
    this.px(ctx, pal.body, 5, 8, 18, 16);
    this.px(ctx, pal.light, 6, 9, 16, 3);
    this.px(ctx, pal.dark, 7, 13, 14, 6);
    this.px(ctx, pal.light, 8, 6, 12, 4);
    this.px(ctx, pal.light, 4, 12, 2, 8);
    this.px(ctx, pal.light, 22, 12, 2, 8);
    this.px(ctx, pal.dark, 11, 0, 6, 8);
    this.px(ctx, pal.light, 12, 0, 4, 7);
    this.px(ctx, pal.light, 10, 0, 8, 2);
    this.px(ctx, "#fff4b0", 13, 10, 2, 2);
  },

  drawBullets: function (ctx, bullets) {
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      ctx.fillStyle = b.pierce > 0 || b.damage > 1 ? "#f4c430" : (b.size > 6 ? "#fff6c8" : SR.PALETTE.bullet);
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
    }
  },

  drawDust: function (ctx, dust) {
    if (!dust) return;
    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      const k = 1 - d.t / d.duration;
      if (d.brick) {
        ctx.fillStyle = k > 0.45 ? "#6a4a28" : "#4a341c";
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
        continue;
      }
      ctx.fillStyle = d.turbo ? "rgba(210, 190, 120, " + (0.45 * k) + ")" : "rgba(40, 36, 24, " + (0.4 * k) + ")";
      ctx.fillRect(Math.round(d.x), Math.round(d.y), d.turbo ? 3 : 2, d.turbo ? 3 : 2);
    }
  },

  drawSparks: function (ctx, sparks) {
    if (!sparks) return;
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      const k = 1 - s.t / s.duration;
      let color = "#fff8d0";
      if (s.kind === "brick") color = "#e08a4a";
      else if (s.kind === "steel") color = "#c8d4e0";
      else if (s.kind === "water") color = "#7ec8e8";
      else if (s.kind === "tank") color = "#f4c430";
      ctx.fillStyle = color;
      ctx.globalAlpha = k;
      ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4);
      ctx.fillRect(Math.round(s.x) - 5, Math.round(s.y), 10, 2);
      ctx.fillRect(Math.round(s.x), Math.round(s.y) - 5, 2, 10);
    }
    ctx.globalAlpha = 1;
  },

  drawExplosions: function (ctx, explosions) {
    for (let i = 0; i < explosions.length; i++) this.drawBurst(ctx, explosions[i]);
  },

  drawBurst: function (ctx, e) {
    const t = e.t;
    const parts = e.parts || [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (t < p.delay || t > p.delay + p.life) continue;
      const u = (t - p.delay) / p.life;
      const x = e.x + p.x + p.vx * (t - p.delay) / 1000;
      const y = e.y + p.y + p.vy * (t - p.delay) / 1000 + p.g * u * u * 10;
      ctx.globalAlpha = Math.max(0, 1 - u);
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (p.grow ? 1 + u : 1 - u * 0.3)));
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
      if (p.cloud) {
        ctx.fillRect(Math.round(x + 2), Math.round(y - 1), s - 1, s - 1);
        ctx.fillRect(Math.round(x - 1), Math.round(y + 2), s - 1, s);
      }
    }
    ctx.globalAlpha = 1;
  }
};

SR.makeBurst = function (x, y, kind, extra, big) {
  extra = extra || {};
  if (kind === "tank") return SR.makeTankBurst(x, y, extra);
  const colors = kind === "steel" ? ["#c8d4e0", "#7a8a9c"] : (kind === "base" ? ["#f0d060", "#c45c26"] : ["#e08a4a", "#8b3a12"]);
  const parts = [];
  const n = big ? 8 : 5;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 18 + Math.random() * 40;
    parts.push({
      x: Math.cos(a) * 2,
      y: Math.sin(a) * 2,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      g: 4,
      size: 2 + (i % 2),
      color: colors[i % colors.length],
      delay: 0,
      life: 160 + Math.random() * 50,
      cloud: false,
      grow: false
    });
  }
  return { x: x, y: y, t: 0, duration: 200, kind: kind, parts: parts };
};

SR.makeTankBurst = function (x, y, extra) {
  const player = !!extra.player;
  const heavy = !!extra.heavy;
  const pal = extra.palette || ["#c44a22", "#7a2410", "#e87848"];
  const dur = player ? 760 : (heavy ? 800 : 680);
  const parts = [];
  const flashN = player ? 7 : 5;
  for (let i = 0; i < flashN; i++) {
    parts.push({
      x: (Math.random() * 10 - 5),
      y: (Math.random() * 8 - 4),
      vx: Math.random() * 16 - 8,
      vy: Math.random() * 16 - 8,
      g: 0,
      size: 3 + (i % 3),
      color: i < 2 ? "#fff8d0" : "#f4c430",
      delay: 0,
      life: 90 + Math.random() * 30,
      cloud: true,
      grow: true
    });
  }
  const fireN = heavy ? 13 : (player ? 11 : 9);
  const fireCol = ["#f4c430", "#e07020", "#c41c24", "#8a1818"];
  for (let i = 0; i < fireN; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 22 + Math.random() * (heavy ? 70 : 52);
    parts.push({
      x: Math.cos(a) * 3,
      y: Math.sin(a) * 2,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 8,
      g: 6 + Math.random() * 4,
      size: 2 + (i % 3),
      color: fireCol[i % fireCol.length],
      delay: 40 + Math.random() * 50,
      life: 180 + Math.random() * 80,
      cloud: i % 3 === 0,
      grow: false
    });
  }
  const debrisN = heavy ? 7 : 5;
  for (let i = 0; i < debrisN; i++) {
    const a = -0.2 + Math.random() * (Math.PI + 0.4);
    const sp = 30 + Math.random() * 50;
    parts.push({
      x: Math.random() * 4 - 2,
      y: Math.random() * 4 - 2,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 20,
      g: 14,
      size: 2,
      color: pal[i % pal.length],
      delay: 60 + Math.random() * 40,
      life: 280 + Math.random() * 80,
      cloud: false,
      grow: false
    });
  }
  const smokeN = heavy ? 10 : (player ? 8 : 6);
  const smokeCol = ["#5a5048", "#3a342c", "#7a6a58"];
  for (let i = 0; i < smokeN; i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({
      x: Math.cos(a) * 4,
      y: Math.sin(a) * 3,
      vx: Math.cos(a) * (8 + Math.random() * 16),
      vy: Math.sin(a) * 10 - 6,
      g: -2,
      size: 3 + (i % 3),
      color: smokeCol[i % smokeCol.length],
      delay: 220 + Math.random() * 80,
      life: 280 + Math.random() * 90,
      cloud: true,
      grow: true
    });
  }
  return { x: x, y: y, t: 0, duration: dur, kind: "tank", parts: parts, player: player, heavy: heavy };
};

