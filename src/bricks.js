window.SR = window.SR || {};

SR.Brick = {
  HP: 2,
  HALF: 16,

  attach: function (grid) {
    const rows = SR.CONST.ROWS;
    const cols = SR.CONST.COLS;
    const hp = [];
    for (let r = 0; r < rows; r++) {
      hp[r] = [];
      for (let c = 0; c < cols; c++) {
        hp[r][c] = grid[r][c] === SR.TILE.BRICK ? [2, 2, 2, 2] : null;
      }
    }
    grid.brickHp = hp;
    return grid;
  },

  copy: function (from, to) {
    this.attach(to);
    if (!from.brickHp) return to;
    for (let r = 0; r < SR.CONST.ROWS; r++) {
      for (let c = 0; c < SR.CONST.COLS; c++) {
        const src = from.brickHp[r][c];
        to.brickHp[r][c] = src ? src.slice() : null;
      }
    }
    return to;
  },

  hpAt: function (grid, c, r, q) {
    const row = grid.brickHp && grid.brickHp[r];
    const cell = row && row[c];
    if (!cell) return 0;
    return cell[q] || 0;
  },

  quadOf: function (px, py, c, r) {
    const t = SR.CONST.TILE;
    const h = this.HALF;
    const lx = px - c * t;
    const ly = py - r * t;
    const right = lx >= h ? 1 : 0;
    const bottom = ly >= h ? 2 : 0;
    return right + bottom;
  },

  quadRect: function (c, r, q) {
    const t = SR.CONST.TILE;
    const h = this.HALF;
    return {
      x: c * t + (q & 1) * h,
      y: r * t + (q >> 1) * h,
      w: h,
      h: h
    };
  },

  solidAt: function (grid, px, py) {
    const cell = SR.Map.tileAtPixel(grid, px, py);
    if (!cell || cell.type !== SR.TILE.BRICK) return false;
    return this.hpAt(grid, cell.c, cell.r, this.quadOf(px, py, cell.c, cell.r)) > 0;
  },

  rectBlocked: function (grid, c, r, x, y, w, h) {
    if (!grid.brickHp || !grid.brickHp[r] || !grid.brickHp[r][c]) return true;
    const hp = grid.brickHp[r][c];
    for (let q = 0; q < 4; q++) {
      if (hp[q] <= 0) continue;
      const qr = this.quadRect(c, r, q);
      if (x < qr.x + qr.w && x + w > qr.x && y < qr.y + qr.h && y + h > qr.y) return true;
    }
    return false;
  },

  leadPoint: function (bullet) {
    const s = bullet.size;
    if (bullet.dir === 0) return { x: bullet.x + s / 2, y: bullet.y };
    if (bullet.dir === 1) return { x: bullet.x + s, y: bullet.y + s / 2 };
    if (bullet.dir === 2) return { x: bullet.x + s / 2, y: bullet.y + s };
    return { x: bullet.x, y: bullet.y + s / 2 };
  },

  pickHit: function (grid, bullet) {
    const t = SR.CONST.TILE;
    const x = bullet.x;
    const y = bullet.y;
    const s = bullet.size;
    const left = Math.floor(x / t);
    const right = Math.floor((x + s - 0.01) / t);
    const top = Math.floor(y / t);
    const bottom = Math.floor((y + s - 0.01) / t);
    let best = null;
    let bestKey = Infinity;
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (!SR.Map.inBounds(c, r)) continue;
        if (grid[r][c] !== SR.TILE.BRICK) continue;
        const hp = grid.brickHp && grid.brickHp[r] && grid.brickHp[r][c];
        if (!hp) continue;
        for (let q = 0; q < 4; q++) {
          if (hp[q] <= 0) continue;
          const qr = this.quadRect(c, r, q);
          if (!(x < qr.x + qr.w && x + s > qr.x && y < qr.y + qr.h && y + s > qr.y)) continue;
          let key;
          if (bullet.dir === 0) key = -(qr.y + qr.h);
          else if (bullet.dir === 1) key = qr.x;
          else if (bullet.dir === 2) key = qr.y;
          else key = -(qr.x + qr.w);
          if (key < bestKey) {
            bestKey = key;
            best = {
              c: c,
              r: r,
              q: q,
              x: Math.round(qr.x + qr.w / 2),
              y: Math.round(qr.y + qr.h / 2)
            };
          }
        }
      }
    }
    return best;
  },

  damage: function (grid, c, r, q, amount) {
    const hp = grid.brickHp && grid.brickHp[r] && grid.brickHp[r][c];
    if (!hp || q < 0 || q > 3 || hp[q] <= 0) {
      return { damaged: false, destroyed: false, cleared: false };
    }
    const dmg = amount >= 2 ? 2 : 1;
    const before = hp[q];
    hp[q] = Math.max(0, hp[q] - dmg);
    const destroyed = before > 0 && hp[q] === 0;
    let cleared = false;
    if (hp[0] <= 0 && hp[1] <= 0 && hp[2] <= 0 && hp[3] <= 0) {
      grid[r][c] = SR.TILE.EMPTY;
      grid.brickHp[r][c] = null;
      cleared = true;
    }
    return { damaged: true, destroyed: destroyed, cleared: cleared, hp: hp[q] };
  },

  addImpactFx: function (game, x, y, destroyed) {
    const colors = destroyed ? ["#c45c26", "#8b3a12", "#e08a4a", "#4a2a14"] : ["#c45c26", "#8b3a12", "#e08a4a"];
    const parts = [];
    const n = destroyed ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4;
      const sp = destroyed ? 22 + (i % 3) * 10 : 14 + (i % 3) * 8;
      parts.push({
        x: (i % 3) - 1,
        y: (i % 2) - 1,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (destroyed ? 8 : 4),
        g: destroyed ? 10 : 7,
        size: 1 + (i % 2),
        color: colors[i % colors.length],
        delay: 0,
        life: destroyed ? 200 : 140,
        cloud: false,
        grow: false
      });
    }
    game.explosions.push({
      x: x,
      y: y,
      t: 0,
      duration: destroyed ? 240 : 160,
      kind: destroyed ? "rubble" : "chip",
      parts: parts
    });
    if (destroyed) {
      for (let i = 0; i < 4; i++) {
        game.dust.push({
          x: x + (i % 2) * 4 - 3,
          y: y + ((i / 2) | 0) * 3 - 2,
          t: 0,
          duration: 150 + i * 12,
          brick: true
        });
      }
      if (game.dust.length > 40) game.dust.splice(0, game.dust.length - 40);
    }
  },

  variant: function (c, r, q) {
    return (c * 3 + r * 5 + q * 7) % 3;
  },

  drawCell: function (ctx, grid, c, r) {
    const hp = grid.brickHp && grid.brickHp[r] && grid.brickHp[r][c];
    if (!hp) return;
    for (let q = 0; q < 4; q++) {
      if (hp[q] > 0) this.drawQuad(ctx, c, r, q, hp[q], this.variant(c, r, q));
    }
  },

  drawQuad: function (ctx, c, r, q, hp, variant) {
    const qr = this.quadRect(c, r, q);
    const x = qr.x;
    const y = qr.y;
    const mortar = "#3d2410";
    const deep = "#7a2e10";
    const body = hp === 2 ? "#c45c26" : "#a84a1c";
    const light = "#e08a4a";
    const dark = "#8b3a12";
    ctx.fillStyle = mortar;
    ctx.fillRect(x, y, 16, 16);

    const rows = this.rowLayout(variant);
    for (let row = 0; row < 4; row++) {
      const by = y + row * 4;
      const segs = rows[row];
      let bx = x;
      for (let i = 0; i < segs.length; i++) {
        const bw = segs[i];
        if (bw > 0) {
          ctx.fillStyle = (hp === 1 && (row + i + variant) % 3 === 0) ? deep : body;
          ctx.fillRect(bx, by, bw, 3);
          if (hp === 2 || (row + i) % 2 === 0) {
            ctx.fillStyle = light;
            ctx.fillRect(bx + 1, by, Math.max(1, bw - 2), 1);
          }
          ctx.fillStyle = dark;
          ctx.fillRect(bx, by + 2, bw, 1);
        }
        bx += bw + 1;
      }
    }

    if (hp === 1) this.drawDamage(ctx, x, y, c, r, q, mortar, deep);
  },

  rowLayout: function (variant) {
    if (variant === 1) {
      return [
        [8, 7],
        [3, 8, 3],
        [7, 8],
        [4, 6, 4]
      ];
    }
    if (variant === 2) {
      return [
        [3, 7, 4],
        [8, 7],
        [4, 7, 3],
        [7, 8]
      ];
    }
    return [
      [7, 8],
      [4, 7, 3],
      [8, 7],
      [3, 7, 4]
    ];
  },

  drawDamage: function (ctx, x, y, c, r, q, mortar, deep) {
    const seed = (c * 17 + r * 11 + q * 9) & 3;
    ctx.fillStyle = "#2a1408";
    if (seed === 0) {
      ctx.fillRect(x + 4, y + 2, 1, 3);
      ctx.fillRect(x + 5, y + 5, 1, 3);
      ctx.fillRect(x + 6, y + 8, 1, 2);
    } else if (seed === 1) {
      ctx.fillRect(x + 9, y + 1, 1, 4);
      ctx.fillRect(x + 8, y + 5, 1, 2);
      ctx.fillRect(x + 10, y + 7, 1, 3);
    } else if (seed === 2) {
      ctx.fillRect(x + 2, y + 6, 3, 1);
      ctx.fillRect(x + 5, y + 7, 1, 3);
      ctx.fillRect(x + 6, y + 10, 2, 1);
    } else {
      ctx.fillRect(x + 11, y + 3, 1, 4);
      ctx.fillRect(x + 10, y + 7, 2, 1);
      ctx.fillRect(x + 12, y + 8, 1, 3);
    }
    ctx.fillStyle = mortar;
    if (seed < 2) {
      ctx.fillRect(x + 13, y, 3, 3);
      ctx.fillRect(x + 14, y + 3, 2, 1);
    } else {
      ctx.fillRect(x, y + 13, 3, 3);
      ctx.fillRect(x + 3, y + 14, 2, 2);
    }
    ctx.fillStyle = deep;
    ctx.fillRect(x + 1, y + 12, 2, 1);
  }
};
