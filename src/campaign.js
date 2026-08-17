window.SR = window.SR || {};

SR.Campaign = {
  CHARS: { E: 0, B: 1, S: 2, W: 3, F: 4, I: 5, X: 6 },

  parse: function (lines) {
    const grid = [];
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r].replace(/\s/g, "");
      const row = [];
      for (let c = 0; c < line.length; c++) {
        const v = this.CHARS[line.charAt(c)];
        row.push(v === undefined ? 0 : v);
      }
      grid.push(row);
    }
    return grid;
  },

  LEVELS: [],

  current: function (game) {
    return this.LEVELS[game.campaignIndex || 0] || this.LEVELS[0];
  },

  walkable: function (type, allowBrick) {
    const T = SR.TILE;
    if (type === T.EMPTY || type === T.ICE) return true;
    if (type === T.FOREST) return true;
    if (allowBrick && type === T.BRICK) return true;
    return false;
  },

  findBase: function (grid) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === SR.TILE.BASE) return { c: c, r: r };
      }
    }
    return null;
  },

  hasPath: function (grid, from, goal) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const seen = {};
    const q = [from];
    seen[from.c + "," + from.r] = true;
    while (q.length) {
      const cur = q.shift();
      if (Math.abs(cur.c - goal.c) + Math.abs(cur.r - goal.r) === 1) return true;
      for (let i = 0; i < 4; i++) {
        const nc = cur.c + dirs[i][0];
        const nr = cur.r + dirs[i][1];
        const key = nc + "," + nr;
        if (seen[key] || !SR.Map.inBounds(nc, nr)) continue;
        const type = grid[nr][nc];
        if (type === SR.TILE.BASE) continue;
        if (!this.walkable(type, true)) continue;
        seen[key] = true;
        q.push({ c: nc, r: nr });
      }
    }
    return false;
  },

  directShot: function (grid, from, goal) {
    if (from.c !== goal.c && from.r !== goal.r) return false;
    const dc = Math.sign(goal.c - from.c);
    const dr = Math.sign(goal.r - from.r);
    let c = from.c + dc;
    let r = from.r + dr;
    while (c !== goal.c || r !== goal.r) {
      if (!SR.Map.inBounds(c, r)) return false;
      const type = grid[r][c];
      if (type === SR.TILE.STEEL || type === SR.TILE.WATER) return false;
      c += dc;
      r += dr;
    }
    return true;
  },

  validateLevel: function (level) {
    const issues = [];
    const grid = this.parse(level.rows);
    if (grid.length !== SR.CONST.ROWS) issues.push("число рядов карты не 13");
    const base = this.findBase(grid);
    if (!base) issues.push("на карте нет штаба");
    const spawns = level.spawns || [];
    if (spawns.length < 2) issues.push("мало точек появления");
    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      const tag = "(" + s.c + "," + s.r + ")";
      if (!SR.Map.inBounds(s.c, s.r)) {
        issues.push("респ " + tag + " вне карты");
        continue;
      }
      const type = grid[s.r][s.c];
      if (type === SR.TILE.WATER || type === SR.TILE.STEEL || type === SR.TILE.BRICK || type === SR.TILE.FOREST || type === SR.TILE.BASE) {
        issues.push("респ " + tag + " стоит в непроходимой клетке");
      }
      if (base && s.c === base.c && s.r === base.r) issues.push("респ " + tag + " совпадает со штабом");
      if (base && s.c === base.c) issues.push("респ " + tag + " на одной вертикали со штабом");
      if (base && s.r === base.r) issues.push("респ " + tag + " на одной горизонтали со штабом");
      if (base && this.directShot(grid, s, base)) issues.push("респ " + tag + " имеет прямую линию выстрела до штаба");
      if (base && !this.hasPath(grid, s, base)) issues.push("респ " + tag + " не имеет пути к штабу");
    }
    const p = level.player;
    if (!p || !SR.Map.inBounds(p.c, p.r) || !this.walkable(grid[p.r][p.c], false)) {
      issues.push("точка игрока недоступна");
    }
    return issues;
  },

  validateAll: function () {
    let ok = true;
    for (let i = 0; i < this.LEVELS.length; i++) {
      const level = this.LEVELS[i];
      const issues = this.validateLevel(level);
      if (issues.length) {
        ok = false;
        console.warn("[Стальные рубежи] карта не прошла проверку: " + level.name);
        for (let k = 0; k < issues.length; k++) console.warn("  — " + issues[k]);
      }
    }
    if (ok) console.log("[Стальные рубежи] все шесть карт прошли проверку респа.");
    return ok;
  },

  isSpawnCell: function (game, c, r) {
    const pts = (game && game.enemySpawns) || [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].c === c && pts[i].r === r) return true;
    }
    return false;
  },

  nextInterval: function () {
    return 3000;
  },

  firstDelay: function () {
    return 3000;
  }
};

SR.Campaign.LEVELS = [
  {
    id: 1,
    name: "РУБЕЖ 1 — ПЕРВАЯ ЛИНИЯ",
    short: "Рубеж 1 · первая линия",
    reward: 200,
    player: { c: 2, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 0, r: 3 }],
    queue: ["basic", "basic", "basic", "fast", "basic", "basic", "fast", "basic"],
    rows: [
      "ES.........SE",
      "E....B.B....E",
      "E..B.....B..E",
      "ES.........SE",
      "E....BBB....E",
      "E.....S.....E",
      "E...........E",
      "E..B.....B..E",
      "E....BBB....E",
      "E....BSB....E",
      "E...BBBBB...E",
      "E...BBBBB...E",
      "E...BBXBB...E"
    ]
  },
  {
    id: 2,
    name: "РУБЕЖ 2 — ВОДНЫЙ БАРЬЕР",
    short: "Рубеж 2 · водный барьер",
    reward: 300,
    player: { c: 2, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 0, r: 4 }],
    queue: ["basic", "fast", "basic", "fast", "basic", "fast", "basic", "fast", "basic", "fast"],
    rows: [
      "ES.WW.S.WW.SE",
      "E..WW.S.WW..E",
      "WW.WW.S.WW.WW",
      "WW....S....WW",
      "ES.BB.S.BB.SE",
      "E..BB.S.BB..E",
      "E.....S.....E",
      "E..FF.S.FF..E",
      "E....BBB....E",
      "E....BSB....E",
      "E...BBBBB...E",
      "E...BBBBB...E",
      "E...BBXBB...E"
    ]
  },
  {
    id: 3,
    name: "РУБЕЖ 3 — ЛЕДЯНОЙ КОРИДОР",
    short: "Рубеж 3 · ледяной коридор",
    reward: 400,
    player: { c: 9, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 12, r: 3 }],
    queue: ["basic", "fast", "basic", "heavy", "fast", "basic", "fast", "heavy", "basic", "fast", "basic", "fast"],
    rows: [
      "ES.IIIIIII.SE",
      "E..I.....I..E",
      "EBBI.BBB.IBBE",
      "ES.I.....I.SE",
      "E..IIIIIII..E",
      "E.....S.....E",
      "E.BB.....BB.E",
      "E.BB.III.BB.E",
      "E....BBB....E",
      "E.F..BSB..F.E",
      "E...BBBBB...E",
      "E...BBBBB...E",
      "E...BBXBB...E"
    ]
  },
  {
    id: 4,
    name: "РУБЕЖ 4 — КРЕПОСТНОЙ УЗЕЛ",
    short: "Рубеж 4 · крепостной узел",
    reward: 500,
    player: { c: 2, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 0, r: 5 }],
    queue: ["basic", "sapper", "heavy", "fast", "sapper", "basic", "heavy", "fast", "sapper", "basic", "heavy", "fast", "sapper", "basic"],
    rows: [
      "ES..S...S..SE",
      "E...S.B.S...E",
      "SS..S.B.S..SS",
      "E...S...S...E",
      "E.BBS.B.SBB.E",
      "ES..S...S..SE",
      "E...SSSSS...E",
      "E.BB.....BB.E",
      "E.B..BBB..B.E",
      "E.B..BSB..B.E",
      "SS..BBBBB..SS",
      "E...BBBBB...E",
      "E...BBXBB...E"
    ]
  },
  {
    id: 5,
    name: "РУБЕЖ 5 — РАЗРУШЕННЫЙ КВАРТАЛ",
    short: "Рубеж 5 · разрушенный квартал",
    reward: 650,
    player: { c: 3, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 12, r: 4 }],
    queue: ["fast", "basic", "sapper", "heavy", "fast", "basic", "sapper", "fast", "heavy", "basic", "sapper", "fast", "heavy", "basic", "fast", "sapper"],
    rows: [
      "ES.B.B.B.B.SE",
      "E.B.B.B.B.B.E",
      "E.B.BBB.B.B.E",
      "E.B.....B.B.E",
      "ES.B.B.B.B.SE",
      "E.B.B.S.B.B.E",
      "E.B.B...B.B.E",
      "E...B.B.B...E",
      "E.BBB.B.BBB.E",
      "E.B..BSB..B.E",
      "E.B.BBBBB.B.E",
      "E...BBBBB...E",
      "E...BBXBB...E"
    ]
  },
  {
    id: 6,
    name: "РУБЕЖ 6 — ПОСЛЕДНИЙ ПЕРИМЕТР",
    short: "Рубеж 6 · последний периметр",
    reward: 800,
    player: { c: 2, r: 12 },
    spawns: [{ c: 0, r: 0 }, { c: 12, r: 0 }, { c: 0, r: 4 }],
    queue: ["fast", "heavy", "sapper", "basic", "fast", "heavy", "sapper", "fast", "basic", "heavy", "sapper", "fast", "heavy", "basic", "sapper", "fast", "heavy", "commander"],
    rows: [
      "ES.S.W.W.S.SE",
      "E..S.W.W.S..E",
      "SS.S.....S.SS",
      "E..S.BBB.S..E",
      "ES.S.BSB.S.SE",
      "E....S.S....E",
      "E.BB.S.S.BB.E",
      "E.BB.....BB.E",
      "E.I..BBB..I.E",
      "E.I..BSB..I.E",
      "SS..BBBBB..SS",
      "E.F.BBBBB.F.E",
      "E...BBXBB...E"
    ]
  }
];
