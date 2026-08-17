window.SR = window.SR || {};

SR.Collision = {
  rects: function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  tankRect: function (x, y) {
    return { x: x, y: y, w: SR.CONST.TANK, h: SR.CONST.TANK };
  },

  blockedForTank: function (grid, x, y, size) {
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
        if (type === T.BRICK || type === T.STEEL || type === T.WATER || type === T.BASE) {
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
    if (SR.Collision.blockedForTank(grid, nx, ny, SR.CONST.TANK)) return false;
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
    if (Math.abs(tank[axis] - snap) > 1.25) return false;
    const old = tank[axis];
    tank[axis] = snap;
    if (SR.Collision.blockedForTank(grid, tank.x, tank.y, SR.CONST.TANK) ||
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
    const dc = Math.sign(c2 - c1);
    const dr = Math.sign(r2 - r1);
    let c = c1;
    let r = r1;
    while (c !== c2 || r !== r2) {
      c += dc;
      r += dr;
      if (!SR.Map.inBounds(c, r)) return false;
      const type = grid[r][c];
      if (type === T.BRICK || type === T.STEEL) return false;
    }
    return true;
  }
};
