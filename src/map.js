window.SR = window.SR || {};

SR.TILE = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  WATER: 3,
  FOREST: 4,
  ICE: 5,
  BASE: 6
};

SR.CONST = {
  TILE: 32,
  COLS: 13,
  ROWS: 13,
  TANK: 28,
  ALIGN: 8,
  MAX_ENEMIES: 4,
  TOTAL_ENEMIES: 16,
  PLAYER_LIVES: 3,
  STORAGE_KEY: "steelFrontiersBest"
};

SR.SPAWN = {
  player: { c: 3, r: 12 },
  enemies: [
    { c: 0, r: 0 },
    { c: 6, r: 0 },
    { c: 12, r: 0 }
  ],
  base: { c: 6, r: 12 }
};

SR.Map = {
  create: function () {
    const T = SR.TILE;
    const E = T.EMPTY;
    const B = T.BRICK;
    const S = T.STEEL;
    const W = T.WATER;
    const F = T.FOREST;
    const I = T.ICE;
    const X = T.BASE;

    return [
      [E, E, B, E, E, E, E, E, E, E, B, E, E],
      [E, E, B, E, B, B, E, B, B, E, B, E, E],
      [B, B, E, E, B, E, S, E, B, E, E, B, B],
      [W, W, E, F, E, E, E, E, E, F, E, W, W],
      [W, W, E, F, B, B, E, B, B, F, E, W, W],
      [E, E, E, E, B, S, E, S, B, E, E, E, E],
      [E, B, B, E, E, E, E, E, E, E, B, B, E],
      [E, B, B, E, I, I, I, I, I, E, B, B, E],
      [E, E, E, E, E, B, B, B, E, E, E, E, E],
      [B, B, E, F, E, B, S, B, E, F, E, B, B],
      [E, E, E, F, E, B, B, B, E, F, E, E, E],
      [E, E, B, E, B, B, B, B, B, E, B, E, E],
      [E, E, E, E, B, B, X, B, B, E, E, E, E]
    ];
  },

  clone: function (grid) {
    return grid.map(function (row) {
      return row.slice();
    });
  },

  inBounds: function (c, r) {
    return c >= 0 && r >= 0 && c < SR.CONST.COLS && r < SR.CONST.ROWS;
  },

  tileAtPixel: function (grid, px, py) {
    const t = SR.CONST.TILE;
    const c = Math.floor(px / t);
    const r = Math.floor(py / t);
    if (!SR.Map.inBounds(c, r)) return null;
    return { c: c, r: r, type: grid[r][c] };
  },

  spawnPixel: function (cell) {
    const t = SR.CONST.TILE;
    const pad = (t - SR.CONST.TANK) / 2;
    return {
      x: cell.c * t + pad,
      y: cell.r * t + pad
    };
  }
};
