window.SR = window.SR || {};

SR.Game = function (canvas, hud) {
  this.canvas = canvas;
  this.ctx = canvas.getContext("2d");
  this.ctx.imageSmoothingEnabled = false;
  this.hud = hud;
  this.state = "menu";
  this.input = { dir: null, fire: false };
  this.lastTime = 0;
  this.raf = 0;
  this.resetCampaign();
  this.resetWorld();
};

SR.Game.prototype.resetWorld = function () {
  this.grid = SR.Map.create();
  this.player = null;
  this.enemies = [];
  this.bullets = [];
  this.bonuses = [];
  this.explosions = [];
  this.floats = [];
  this.dust = [];
  this.sparks = [];
  this.killed = 0;
  this.remaining = 0;
  this.levelTotal = 0;
  this.spawnQueue = [];
  this.spawnWait = 0;
  this.respawnWait = 0;
  this.enemySerial = 0;
  this.ended = false;
  this.status = "Бой";
  this.freezeLeft = 0;
  this.baseMaxHp = 2;
  this.baseGlow = 0;
  this.empRing = null;
  this.bonusHistory = [];
  this.spawnWarn = null;
  this.enemySpawns = (SR.SPAWN && SR.SPAWN.enemies) || [];
  this.baseCell = (SR.SPAWN && SR.SPAWN.base) || { c: 6, r: 12 };
};

SR.Game.prototype.resetCampaign = function () {
  this.campaignIndex = 0;
  this.supply = 0;
  this.score = 0;
  this.lives = SR.CONST.PLAYER_LIVES;
  this.tankLevel = 1;
  this.speedRanks = 0;
  this.reloadRanks = 0;
  this.ammoBoost = 0;
  this.shieldRanks = 0;
  this.empCharges = 0;
  this.baseHp = 2;
  this.baseMaxHp = 2;
};

SR.Game.prototype.buildQueue = function () {
  const level = SR.Campaign.current(this);
  return (level.queue || []).slice();
};

SR.Game.prototype.allTanks = function () {
  const list = this.enemies.slice();
  if (this.player && !this.player.dead) list.push(this.player);
  return list;
};

SR.Game.prototype.livingEnemyCount = function () {
  let n = 0;
  for (let i = 0; i < this.enemies.length; i++) {
    if (!this.enemies[i].dead) n += 1;
  }
  return n;
};

SR.Game.prototype.specialCount = function () {
  let n = 0;
  for (let i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].dead) continue;
    const kind = this.enemies[i].kind;
    if (kind === "heavy" || kind === "sapper" || kind === "commander") n += 1;
  }
  return n;
};

SR.Game.prototype.start = function () {
  this.startCampaign();
};

SR.Game.prototype.startCampaign = function () {
  this.resetCampaign();
  this.startLevel();
};

SR.Game.prototype.startLevel = function () {
  const level = SR.Campaign.current(this);
  const grid = SR.Campaign.parse(level.rows);
  if (SR.Brick) SR.Brick.attach(grid);
  this.grid = grid;
  this.player = null;
  this.enemies = [];
  this.bullets = [];
  this.bonuses = [];
  this.explosions = [];
  this.floats = [];
  this.dust = [];
  this.sparks = [];
  this.killed = 0;
  this.spawnQueue = level.queue.slice();
  this.levelTotal = level.queue.length;
  this.remaining = this.levelTotal;
  this.spawnWait = SR.Campaign.firstDelay();
  this.spawnWarn = null;
  this.respawnWait = 0;
  this.enemySerial = 0;
  this.ended = false;
  this.state = "playing";
  this.status = "Бой";
  this.freezeLeft = 0;
  this.baseGlow = 0;
  this.empRing = null;
  this.bonusHistory = [];
  this.enemySpawns = level.spawns.slice();
  this.baseCell = SR.Campaign.findBase(grid) || { c: 6, r: 12 };
  this.playerCell = level.player;
  this.levelName = level.name;
  this.levelReward = level.reward;
  if (this.baseHp == null) this.baseHp = this.baseMaxHp;
  this.baseHp = Math.max(1, Math.min(this.baseMaxHp, this.baseHp));
  this.empCharges = this.empCharges || 0;
  try { this.spawnPlayer(); } catch (err) { console.error(err); }
  if (this.player) {
    this.player.shieldCharges = Math.min(2, this.shieldRanks || 0);
    this.player.applyLevel(this.tankLevel);
  }
  this.updateHud();
  this.syncChrome();
  try { SR.Audio.playBattle(); } catch (err) {}
};

SR.Game.prototype.syncChrome = function () {
  const sub = document.getElementById("subtitle");
  if (sub) sub.textContent = (SR.Campaign.current(this).short || this.levelName || "");
  const empBtn = document.getElementById("btn-emp");
  if (empBtn) {
    if ((this.empCharges || 0) > 0 && this.state === "playing") empBtn.classList.remove("hidden");
    else empBtn.classList.add("hidden");
  }
};

SR.Game.prototype.stop = function () {
  this.state = "menu";
  this.clearTemps();
  try {
    SR.Audio.setEngine(false);
    SR.Audio.playMenu();
  } catch (err) {}
};

SR.Game.prototype.clearTemps = function () {
  this.freezeLeft = 0;
  this.baseGlow = 0;
  this.empRing = null;
  this.bonuses = [];
  this.floats = [];
  this.dust = [];
  this.sparks = [];
  this.explosions = [];
  this.bullets = [];
};

SR.Game.prototype.spawnPlayer = function () {
  const level = SR.Campaign.current(this);
  const spots = [this.playerCell || level.player, { c: 9, r: 12 }, { c: 2, r: 12 }];
  const tanks = this.enemies;
  let pos = SR.Map.spawnPixel(spots[0]);
  for (let i = 0; i < spots.length; i++) {
    if (!spots[i] || SR.Campaign.isSpawnCell(this, spots[i].c, spots[i].r)) continue;
    const candidate = SR.Map.spawnPixel(spots[i]);
    if (SR.Collision.blockedForTank(this.grid, candidate.x, candidate.y, SR.CONST.TANK)) continue;
    if (!SR.Collision.overlapsAnyTank(candidate.x, candidate.y, tanks, null)) {
      pos = candidate;
      break;
    }
  }
  this.player = new SR.Player(this, pos.x, pos.y);
  this.respawnWait = 0;
};

SR.Game.prototype.spawnCellOccupied = function (c, r) {
  if (this.spawnWarn && this.spawnWarn.c === c && this.spawnWarn.r === r) return true;
  for (let i = 0; i < this.enemies.length; i++) {
    const enemy = this.enemies[i];
    if (enemy.dead) continue;
    const cell = enemy.cell();
    if (cell.c === c && cell.r === r) return true;
  }
  return false;
};

SR.Game.prototype.pickSpawnCell = function () {
  const points = this.enemySpawns || [];
  if (!points.length) return null;
  const tanks = this.allTanks();
  const start = this.enemySerial % points.length;
  for (let i = 0; i < points.length; i++) {
    const cell = points[(start + i) % points.length];
    const pos = SR.Map.spawnPixel(cell);
    if (SR.Collision.blockedForTank(this.grid, pos.x, pos.y, SR.CONST.TANK)) continue;
    if (SR.Collision.overlapsAnyTank(pos.x, pos.y, tanks, null)) continue;
    return cell;
  }
  return null;
};

SR.Game.prototype.placeEnemy = function (kind, cell) {
  const points = cell ? [cell] : (this.enemySpawns || []);
  const tanks = this.allTanks();
  for (let i = 0; i < points.length; i++) {
    const spot = points[i];
    const pos = SR.Map.spawnPixel(spot);
    if (SR.Collision.blockedForTank(this.grid, pos.x, pos.y, SR.CONST.TANK)) continue;
    if (SR.Collision.overlapsAnyTank(pos.x, pos.y, tanks, null)) continue;
    this.enemySerial += 1;
    this.enemies.push(new SR.Enemy(this, pos.x, pos.y, kind, "e" + this.enemySerial));
    return true;
  }
  return false;
};

SR.Game.prototype.updateSpawn = function (dt) {
  if (this.spawnQueue.length <= 0) {
    this.spawnWarn = null;
    return;
  }
  if (this.livingEnemyCount() >= SR.CONST.MAX_ENEMIES) {
    this.spawnWarn = null;
    return;
  }
  const nextKind = this.spawnQueue[0];
  const special = nextKind === "heavy" || nextKind === "sapper" || nextKind === "commander";
  if (special && this.specialCount() >= 2) {
    this.spawnWarn = null;
    return;
  }
  this.spawnWait -= dt;
  if (this.spawnWait > 800) {
    this.spawnWarn = null;
    return;
  }
  if (!this.spawnWarn) {
    const cell = this.pickSpawnCell();
    if (!cell) {
      this.spawnWait = Math.max(this.spawnWait, 400);
      return;
    }
    this.spawnWarn = { c: cell.c, r: cell.r, t: 0, duration: 800 };
  }
  this.spawnWarn.t += dt;
  if (this.spawnWait > 0) return;
  const kind = this.spawnQueue[0];
  const placed = this.placeEnemy(kind, this.spawnWarn);
  this.spawnWarn = null;
  if (placed) {
    this.spawnQueue.shift();
    this.spawnWait = SR.Campaign.nextInterval(this.campaignIndex || 0);
    try { SR.Audio.spawn(); } catch (err) {}
  } else {
    this.spawnWait = 400;
  }
};

SR.Game.prototype.tryShoot = function (tank) {
  if (tank.cooldown > 0 || tank.dead) return;
  if (tank.spawnProtection) return;
  const maxShots = tank.maxBullets || 1;
  let owned = 0;
  for (let i = 0; i < this.bullets.length; i++) {
    if (this.bullets[i].ownerId === tank.id) owned += 1;
  }
  if (owned >= maxShots) return;
  this.bullets.push(SR.spawnBulletFromTank(tank));
  tank.cooldown = tank.id === "player" ? (tank.shotCooldown || 280) : tank.shotDelay;
  if (tank.id === "player") SR.Audio.shot(tank.tankLevel || 1);
  else SR.Audio.enemyShot();
};

SR.Game.prototype.update = function (dt) {
  if (this.state !== "playing" || this.ended) return;

  if (this.player && !this.player.dead) this.player.update(dt, this.input);
  try {
    if (this.player && !this.player.dead) {
      SR.Audio.setEngine(true, this.player.moved, this.player.speed);
    } else {
      SR.Audio.setEngine(false);
    }
  } catch (err) {}
  for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(dt);
  for (let i = 0; i < this.bullets.length; i++) this.bullets[i].update(dt);
  this.resolveBullets();
  if (this.ended) {
    this.updateHud();
    return;
  }
  SR.Bonuses.update(this, dt);
  this.tickFx(this.explosions, dt);
  this.tickFx(this.dust, dt);
  this.tickFx(this.sparks, dt);

  for (let i = 0; i < this.enemies.length; i++) {
    if (this.enemies[i].dead) this.enemies[i].explodeLeft = (this.enemies[i].explodeLeft || 0) - dt;
  }
  this.enemies = this.enemies.filter(function (e) { return !e.dead || e.explodeLeft > 0; });
  this.bullets = this.bullets.filter(function (b) { return b.alive; });

  if (this.player && this.player.dead) {
    this.respawnWait -= dt;
    if (this.respawnWait <= 0 && this.lives > 0) {
      this.spawnPlayer();
      if (this.player) {
        this.player.shieldCharges = Math.min(2, this.shieldRanks || 0);
        this.player.applyLevel(this.tankLevel);
      }
    }
  }

  this.updateSpawn(dt);

  this.checkEnd();
  this.updateHud();
  this.syncChrome();
};

SR.Game.prototype.tickFx = function (list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].t += dt;
    if (list[i].t >= list[i].duration) list.splice(i, 1);
  }
};

SR.Game.prototype.resolveBullets = function () {
  for (let i = 0; i < this.bullets.length; i++) {
    const bullet = this.bullets[i];
    if (!bullet.alive) continue;
    this.hitTiles(bullet);
    if (!bullet.alive) continue;
    this.hitTanks(bullet);
    if (!bullet.alive) continue;
    this.hitOtherBullets(bullet);
  }
};

SR.Game.prototype.hitTiles = function (bullet) {
  const lead = SR.Brick.leadPoint(bullet);
  const brickHit = SR.Brick.pickHit(this.grid, bullet);
  if (brickHit) {
    const result = SR.Brick.damage(this.grid, brickHit.c, brickHit.r, brickHit.q, bullet.damage || 1);
    SR.Brick.addImpactFx(this, brickHit.x, brickHit.y, result.destroyed);
    SR.Audio.hit(result.destroyed ? "brickBreak" : "brick");
    bullet.alive = false;
    return;
  }
  const cx = lead.x;
  const cy = lead.y;
  const cell = SR.Map.tileAtPixel(this.grid, cx, cy);
  if (!cell) return;
  if (cell.type === SR.TILE.BRICK) return;
  if (cell.type === SR.TILE.WATER && !bullet.splashed) {
    bullet.splashed = true;
    this.addSpark(cx, cy, "water");
    SR.Audio.hit("water");
    return;
  }
  if (cell.type === SR.TILE.STEEL) {
    if (bullet.strong) {
      this.grid[cell.r][cell.c] = SR.TILE.EMPTY;
      this.addExplosion(cx, cy, false, "steel");
    }
    this.addSpark(cx, cy, "steel");
    bullet.alive = false;
    SR.Audio.hit("steel");
  } else if (cell.type === SR.TILE.BASE) {
    bullet.alive = false;
    this.addExplosion(cx, cy, true, "base");
    this.addSpark(cx, cy, "brick");
    this.baseHp -= 1;
    SR.Audio.hit("base");
    if (this.baseHp <= 0) this.finish("lose", "Штаб уничтожен");
  }
};

SR.Game.prototype.hitTanks = function (bullet) {
  const tanks = this.allTanks();
  for (let i = 0; i < tanks.length; i++) {
    const tank = tanks[i];
    if (tank.dead || tank.id === bullet.ownerId) continue;
    const friendly = bullet.ownerId !== "player" && tank.id !== "player";
    if (friendly) continue;
    if (!SR.Collision.rects(bullet.rect(), SR.Collision.tankRect(tank.x, tank.y))) continue;
    bullet.alive = false;
    this.addSpark(bullet.x + bullet.size / 2, bullet.y + bullet.size / 2, "tank");
    if (tank.isProtected && tank.isProtected()) {
      SR.Audio.hit("enemy");
      return;
    }
    if (tank.invuln > 0) {
      SR.Audio.hit("enemy");
      return;
    }
    if (tank.shieldCharges > 0) {
      tank.shieldCharges -= 1;
      tank.flash = 220;
      SR.Audio.shield();
      return;
    }
    tank.hp -= (bullet.damage || 1);
    SR.Audio.hit(tank.id === "player" ? "player" : "enemy");
    if (tank.hp <= 0) this.destroyTank(tank);
    else if (tank.id === "player") tank.invuln = 450;
    return;
  }
};

SR.Game.prototype.hitOtherBullets = function (bullet) {
  for (let i = 0; i < this.bullets.length; i++) {
    const other = this.bullets[i];
    if (other === bullet || !other.alive) continue;
    if (SR.Collision.rects(bullet.rect(), other.rect())) {
      bullet.alive = false;
      other.alive = false;
      this.addSpark(bullet.x, bullet.y, "steel");
    }
  }
};

SR.Game.prototype.destroyTank = function (tank) {
  if (!tank || tank.dead) return;
  tank.dead = true;
  const cx = tank.x + SR.CONST.TANK / 2;
  const cy = tank.y + SR.CONST.TANK / 2;
  const player = tank.id === "player";
  const heavy = tank.kind === "heavy" || tank.kind === "commander";
  const pal = SR.Render.colorsFor(player ? "player" : tank.kind, tank);
  const burst = this.addExplosion(cx, cy, player || heavy, "tank", {
    player: player,
    heavy: heavy,
    palette: [pal.body, pal.dark, pal.light]
  });
  tank.explodeLeft = burst.duration;
  SR.Audio.boom(player || heavy);
  if (player) {
    SR.Audio.setEngine(false);
    this.lives -= 1;
    this.respawnWait = Math.max(900, burst.duration + 120);
    if (this.player) {
      this.player.speedBoost = 0;
      this.player.shieldCharges = 0;
    }
    if (this.lives <= 0) this.finish("lose", "Машины резерва кончились");
    return;
  }
  this.remaining -= 1;
  this.killed += 1;
  this.score += tank.score;
  this.supply = (this.supply || 0) + tank.score;
  if (tank.kind === "commander") {
    SR.Bonuses.tryDrop(this, cx, cy, { force: true, type: "power" });
  } else {
    SR.Bonuses.tryDrop(this, cx, cy);
  }
};

SR.Game.prototype.addExplosion = function (x, y, big, kind, extra) {
  extra = extra || {};
  const burst = SR.makeBurst(x, y, kind || "puff", extra, big);
  this.explosions.push(burst);
  return burst;
};

SR.Game.prototype.addSpark = function (x, y, kind) {
  this.sparks.push({ x: x, y: y, t: 0, duration: 140, kind: kind || "tank" });
};

SR.Game.prototype.addDust = function (tank) {
  const rear = SR.dirOffset(tank.dir, -10);
  const turbo = tank.speedBoost > 0;
  const exhaust = (tank.tankLevel || 1) >= 3;
  if (!turbo && !exhaust) return;
  this.dust.push({
    x: tank.x + SR.CONST.TANK / 2 + rear.x + (Math.random() * 4 - 2),
    y: tank.y + SR.CONST.TANK / 2 + rear.y + (Math.random() * 4 - 2),
    t: 0,
    duration: turbo ? 280 : 180,
    turbo: turbo,
    exhaust: exhaust
  });
  if (this.dust.length > 32) this.dust.shift();
};

SR.Game.prototype.checkEnd = function () {
  if (this.ended) return;
  if (this.spawnQueue.length === 0 && this.livingEnemyCount() === 0 && this.killed >= (this.levelTotal || 0)) {
    this.finish("win", "Рубеж удержан. Противник разбит.");
  }
};

SR.Game.prototype.finish = function (result, text) {
  if (this.ended) return;
  this.ended = true;
  this.state = result;
  this.status = result === "win" ? "Победа" : "Поражение";
  this.freezeLeft = 0;
  this.baseGlow = 0;
  this.empRing = null;
  this.bonuses = [];
  this.floats = [];
  this.dust = [];
  this.sparks = [];
  this.bullets = [];
  try {
    SR.Audio.setEngine(false);
    if (result === "win") SR.Audio.win();
    else SR.Audio.lose();
  } catch (err) {}
  if (result === "win") this.supply = (this.supply || 0) + (this.levelReward || 0);
  this.saveBest();
  this.updateHud();
  const last = result === "win" && (this.campaignIndex || 0) >= SR.Campaign.LEVELS.length - 1;
  if (typeof this.onEnd === "function") {
    this.onEnd(result, text, this.score, {
      last: last,
      reward: this.levelReward || 0,
      supply: this.supply || 0,
      index: this.campaignIndex || 0,
      name: this.levelName
    });
  }
};

SR.Game.prototype.saveBest = function () {
  const best = Math.max(this.score, SR.Game.loadBest());
  try {
    localStorage.setItem(SR.CONST.STORAGE_KEY, String(best));
  } catch (err) {}
};

SR.Game.loadBest = function () {
  try {
    return Number(localStorage.getItem(SR.CONST.STORAGE_KEY) || 0);
  } catch (err) {
    return 0;
  }
};

SR.Game.prototype.updateHud = function () {
  if (!this.hud) return;
  this.hud.score.textContent = String(this.score);
  this.hud.best.textContent = String(Math.max(this.score, SR.Game.loadBest()));
  if (this.hud.killed) this.hud.killed.textContent = String(this.killed || 0);
  if (this.hud.enemies) this.hud.enemies.textContent = (this.killed || 0) + " / " + (this.levelTotal || 0);
  if (this.hud.supply) this.hud.supply.textContent = String(this.supply || 0);
  this.hud.status.textContent = this.status;
  this.hud.lives.innerHTML = "";
  const n = Math.max(0, this.lives);
  for (let i = 0; i < n; i++) {
    const pip = document.createElement("span");
    pip.className = "life-pip";
    this.hud.lives.appendChild(pip);
  }
  const level = this.tankLevel || 1;
  if (this.hud.tankLevel) this.hud.tankLevel.textContent = String(level);
  if (this.hud.tankBars) {
    const cells = [];
    for (let i = 1; i <= 4; i++) cells.push(i <= level ? "■" : "□");
    this.hud.tankBars.textContent = cells.join(" ");
  }
  const p = this.player;
  if (this.hud.shield) this.hud.shield.textContent = String(p && !p.dead ? p.shieldCharges : 0);
  if (this.hud.effects) {
    const bits = [];
    if (p && !p.dead && p.speedBoost > 0) bits.push("Скорость " + Math.ceil(p.speedBoost / 1000) + "с");
    if (this.freezeLeft > 0) bits.push("Стоп " + Math.ceil(this.freezeLeft / 1000) + "с");
    if ((this.empCharges || 0) > 0) bits.push("Импульс E");
    if (this.baseHp < this.baseMaxHp && this.baseHp > 0) bits.push("Штаб повреждён");
    this.hud.effects.textContent = bits.length ? bits.join(" · ") : "Нет";
  }
};

SR.Game.prototype.frame = function (time) {
  const dt = this.lastTime ? Math.min(32, time - this.lastTime) : 16;
  this.lastTime = time;
  try {
    SR.Audio.tick(this);
    if (SR.Title && SR.Title.active()) {
      SR.Title.update(dt);
      SR.Title.draw(this.ctx, time);
    } else {
      if (this.state === "playing") this.update(dt);
      SR.Render.draw(this.ctx, this, time);
    }
  } catch (err) {
    console.error(err);
  }
  this.raf = requestAnimationFrame(this.frame.bind(this));
};

SR.Game.prototype.tryEmp = function () {
  if (this.state !== "playing" || this.ended) return;
  if ((this.empCharges || 0) <= 0) return;
  this.empCharges -= 1;
  SR.Bonuses.pulse(this);
  this.updateHud();
  this.syncChrome();
};

SR.Game.prototype.advanceLevel = function () {
  this.campaignIndex = (this.campaignIndex || 0) + 1;
  this.startLevel();
};

SR.Game.prototype.loop = function () {
  cancelAnimationFrame(this.raf);
  this.lastTime = 0;
  this.raf = requestAnimationFrame(this.frame.bind(this));
};

