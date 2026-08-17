window.SR = window.SR || {};

SR.Collision = {
  rects: function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  tankRect: function (x, y) {
    return { x: x, y: y, w: SR.CONST.TANK, h: SR.CONST.TANK };
  },

  blockedForTank: function (grid, x, y, size, tank) {
    const C = SR.CONST;
    const T = SR.TILE;
    if (x < 0 || y < 0 || x + size > C.COLS * C.TILE || y + size > C.ROWS * C.TILE) {
      return true;
    }
    const left = Math.floor(x / C.TILE);
    const right = Math.floor((x + size - 0.01) / C.TILE);
    const top = Math.floor(y / C.TILE);
    const bottom = Math.floor((y + size - 0.01) / C.TILE);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (!SR.Map.inBounds(c, r)) return true;
        const type = grid[r][c];
        if (type === T.BRICK) {
          if (SR.Brick.rectBlocked(grid, c, r, x, y, size, size)) return true;
          continue;
        }
        if (type === T.STEEL || type === T.WATER || type === T.BASE) {
          return true;
        }
        if (tank && tank.id === "player" && tank.game && SR.Campaign && SR.Campaign.isSpawnCell(tank.game, c, r)) {
          return true;
        }
      }
    }
    return false;
  },

  overlapsAnyTank: function (x, y, tanks, skip) {
    const self = SR.Collision.tankRect(x, y);
    for (let i = 0; i < tanks.length; i++) {
      const tank = tanks[i];
      if (!tank || tank === skip || tank.dead) continue;
      if (SR.Collision.rects(self, SR.Collision.tankRect(tank.x, tank.y))) return true;
    }
    return false;
  },

  moveTank: function (tank, dir, dist, grid, tanks) {
    if (dist <= 0) return false;
    let nx = tank.x;
    let ny = tank.y;
    if (dir === 0) ny -= dist;
    if (dir === 1) nx += dist;
    if (dir === 2) ny += dist;
    if (dir === 3) nx -= dist;
    if (SR.Collision.blockedForTank(grid, nx, ny, SR.CONST.TANK, tank)) return false;
    if (SR.Collision.overlapsAnyTank(nx, ny, tanks, tank)) return false;
    tank.x = nx;
    tank.y = ny;
    return true;
  },

  nudgeMove: function (tank, dir, dist, grid, tanks) {
    let step = dist;
    while (step > 0.35) {
      if (SR.Collision.moveTank(tank, dir, step, grid, tanks)) return true;
      step *= 0.5;
    }
    return false;
  },

  snapAxis: function (tank, wantDir, grid, tanks) {
    const align = SR.CONST.ALIGN;
    const vertical = wantDir === 0 || wantDir === 2;
    const axis = vertical ? "x" : "y";
    const snap = Math.round(tank[axis] / align) * align;
    if (Math.abs(tank[axis] - snap) > 2.5) return false;
    const old = tank[axis];
    tank[axis] = snap;
    if (SR.Collision.blockedForTank(grid, tank.x, tank.y, SR.CONST.TANK, tank) ||
        SR.Collision.overlapsAnyTank(tank.x, tank.y, tanks, tank)) {
      tank[axis] = old;
      return false;
    }
    tank.dir = wantDir;
    return true;
  },

  tryTurn: function (tank, wantDir, dist, grid, tanks) {
    if (wantDir === tank.dir) return true;
    if (SR.Collision.snapAxis(tank, wantDir, grid, tanks)) return true;
    SR.Collision.nudgeMove(tank, tank.dir, dist, grid, tanks);
    return SR.Collision.snapAxis(tank, wantDir, grid, tanks);
  },

  controlTank: function (tank, wantDir, shouldMove, dist, grid, tanks) {
    if (wantDir !== null && wantDir !== tank.dir) {
      const turned = SR.Collision.tryTurn(tank, wantDir, dist, grid, tanks);
      if (!turned) return false;
    }
    if (shouldMove || wantDir !== null) {
      return SR.Collision.nudgeMove(tank, tank.dir, dist, grid, tanks);
    }
    return false;
  },

  onTile: function (grid, tank, type) {
    const cx = tank.x + SR.CONST.TANK / 2;
    const cy = tank.y + SR.CONST.TANK / 2;
    const cell = SR.Map.tileAtPixel(grid, cx, cy);
    return cell && cell.type === type;
  },

  lineClear: function (grid, c1, r1, c2, r2) {
    const T = SR.TILE;
    if (c1 !== c2 && r1 !== r2) return false;
    const t = SR.CONST.TILE;
    const x1 = c1 * t + t / 2;
    const y1 = r1 * t + t / 2;
    const x2 = c2 * t + t / 2;
    const y2 = r2 * t + t / 2;
    const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i <= steps; i++) {
      const x = x1 + (x2 - x1) * i / steps;
      const y = y1 + (y2 - y1) * i / steps;
      const cell = SR.Map.tileAtPixel(grid, x, y);
      if (!cell) return false;
      if (cell.type === T.STEEL) return false;
      if (cell.type === T.BRICK && SR.Brick.solidAt(grid, x, y)) return false;
    }
    return true;
  }
};
