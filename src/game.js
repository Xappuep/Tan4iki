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
  this.resetWorld();
};

SR.Game.prototype.resetWorld = function () {
  this.grid = SR.Map.create();
  this.player = null;
  this.enemies = [];
  this.bullets = [];
  this.bonuses = [];
  this.explosions = [];
  this.score = 0;
  this.lives = SR.CONST.PLAYER_LIVES;
  this.remaining = SR.CONST.TOTAL_ENEMIES;
  this.spawnQueue = this.buildQueue();
  this.spawnWait = 0;
  this.respawnWait = 0;
  this.enemySerial = 0;
  this.ended = false;
  this.status = "Бой";
};

SR.Game.prototype.buildQueue = function () {
  return [
    "basic", "basic", "fast", "basic",
    "fast", "heavy", "basic", "fast",
    "basic", "heavy", "fast", "basic",
    "fast", "heavy", "basic", "fast"
  ];
};

SR.Game.prototype.allTanks = function () {
  const list = this.enemies.slice();
  if (this.player && !this.player.dead) list.push(this.player);
  return list;
};

SR.Game.prototype.start = function () {
  this.resetWorld();
  this.state = "playing";
  this.ended = false;
  this.spawnPlayer();
  this.spawnWait = 0;
  this.trySpawnEnemies(true);
  this.updateHud();
};

SR.Game.prototype.stop = function () {
  this.state = "menu";
};

SR.Game.prototype.spawnPlayer = function () {
  const spots = [SR.SPAWN.player, { c: 9, r: 12 }];
  const tanks = this.enemies;
  let pos = SR.Map.spawnPixel(spots[0]);
  for (let i = 0; i < spots.length; i++) {
    const candidate = SR.Map.spawnPixel(spots[i]);
    if (!SR.Collision.overlapsAnyTank(candidate.x, candidate.y, tanks, null)) {
      pos = candidate;
      break;
    }
  }
  this.player = new SR.Player(this, pos.x, pos.y);
  this.respawnWait = 0;
};

SR.Game.prototype.trySpawnEnemies = function (initial) {
  const max = initial ? 3 : SR.CONST.MAX_ENEMIES;
  while (this.enemies.length < max && this.spawnQueue.length > 0) {
    if (!this.placeEnemy(this.spawnQueue[0])) break;
    this.spawnQueue.shift();
  }
};

SR.Game.prototype.placeEnemy = function (kind) {
  const tanks = this.allTanks();
  const points = SR.SPAWN.enemies;
  const start = Math.floor(Math.random() * points.length);
  for (let i = 0; i < points.length; i++) {
    const cell = points[(start + i) % points.length];
    const pos = SR.Map.spawnPixel(cell);
    if (SR.Collision.blockedForTank(this.grid, pos.x, pos.y, SR.CONST.TANK)) continue;
    if (SR.Collision.overlapsAnyTank(pos.x, pos.y, tanks, null)) continue;
    this.enemySerial += 1;
    this.enemies.push(new SR.Enemy(this, pos.x, pos.y, kind, "e" + this.enemySerial));
    return true;
  }
  return false;
};

SR.Game.prototype.tryShoot = function (tank) {
  if (tank.cooldown > 0 || tank.dead) return;
  for (let i = 0; i < this.bullets.length; i++) {
    if (this.bullets[i].ownerId === tank.id) return;
  }
  this.bullets.push(SR.spawnBulletFromTank(tank));
  tank.cooldown = tank.id === "player" ? 280 : tank.shotDelay;
  SR.Audio.shot();
};

SR.Game.prototype.update = function (dt) {
  if (this.state !== "playing" || this.ended) return;

  if (this.player && !this.player.dead) this.player.update(dt, this.input);
  for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(dt);
  for (let i = 0; i < this.bullets.length; i++) this.bullets[i].update(dt);
  this.resolveBullets();
  if (this.ended) {
    this.updateHud();
    return;
  }
  this.collectBonuses();

  for (let i = this.explosions.length - 1; i >= 0; i--) {
    this.explosions[i].t += dt;
    if (this.explosions[i].t >= this.explosions[i].duration) this.explosions.splice(i, 1);
  }

  this.enemies = this.enemies.filter(function (e) { return !e.dead; });
  this.bullets = this.bullets.filter(function (b) { return b.alive; });

  if (this.player && this.player.dead) {
    this.respawnWait -= dt;
    if (this.respawnWait <= 0 && this.lives > 0) this.spawnPlayer();
  }

  this.spawnWait -= dt;
  if (this.spawnWait <= 0) {
    this.trySpawnEnemies(false);
    this.spawnWait = 420;
  }

  this.checkEnd();
  this.updateHud();
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
  const cx = bullet.x + bullet.size / 2;
  const cy = bullet.y + bullet.size / 2;
  const cell = SR.Map.tileAtPixel(this.grid, cx, cy);
  if (!cell) return;
  if (cell.type === SR.TILE.BRICK) {
    this.grid[cell.r][cell.c] = SR.TILE.EMPTY;
    bullet.alive = false;
    SR.Audio.hit();
    this.addExplosion(cx, cy, false);
  } else if (cell.type === SR.TILE.STEEL) {
    if (bullet.strong) {
      this.grid[cell.r][cell.c] = SR.TILE.EMPTY;
      this.addExplosion(cx, cy, false);
    }
    bullet.alive = false;
    SR.Audio.hit();
  } else if (cell.type === SR.TILE.BASE) {
    bullet.alive = false;
    this.addExplosion(cx, cy, true);
    this.finish("lose", "Штаб уничтожен");
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
    if (tank.isProtected && tank.isProtected()) {
      SR.Audio.hit();
      return;
    }
    if (tank.invuln > 0) {
      SR.Audio.hit();
      return;
    }
    tank.hp -= 1;
    SR.Audio.hit();
    if (tank.hp <= 0) this.destroyTank(tank);
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
    }
  }
};

SR.Game.prototype.destroyTank = function (tank) {
  if (!tank || tank.dead) return;
  tank.dead = true;
  const cx = tank.x + SR.CONST.TANK / 2;
  const cy = tank.y + SR.CONST.TANK / 2;
  this.addExplosion(cx, cy, tank.id !== "player");
  SR.Audio.boom();
  if (tank.id === "player") {
    this.lives -= 1;
    this.respawnWait = 900;
    if (this.lives <= 0) this.finish("lose", "Машины резерва кончились");
    return;
  }
  this.remaining -= 1;
  this.score += tank.score;
  if (Math.random() < 0.28) this.dropBonus(cx, cy);
};

SR.Game.prototype.dropBonus = function (x, y) {
  const types = [
    { type: "shot", mark: "У" },
    { type: "shield", mark: "Щ" },
    { type: "life", mark: "Ж" }
  ];
  const pick = types[Math.floor(Math.random() * types.length)];
  this.bonuses.push({
    x: Math.max(8, Math.min(x - 8, SR.CONST.COLS * SR.CONST.TILE - 24)),
    y: Math.max(8, Math.min(y - 8, SR.CONST.ROWS * SR.CONST.TILE - 24)),
    type: pick.type,
    mark: pick.mark
  });
};

SR.Game.prototype.collectBonuses = function () {
  if (!this.player || this.player.dead) return;
  const body = SR.Collision.tankRect(this.player.x, this.player.y);
  for (let i = this.bonuses.length - 1; i >= 0; i--) {
    const item = this.bonuses[i];
    if (!SR.Collision.rects(body, { x: item.x, y: item.y, w: 16, h: 16 })) continue;
    if (item.type === "shot") this.player.strongShot = 12000;
    if (item.type === "shield") this.player.shield = 6000;
    if (item.type === "life") this.lives = Math.min(5, this.lives + 1);
    this.bonuses.splice(i, 1);
    SR.Audio.bonus();
  }
};

SR.Game.prototype.addExplosion = function (x, y, big) {
  this.explosions.push({ x: x, y: y, t: 0, duration: big ? 420 : 260, big: big });
};

SR.Game.prototype.checkEnd = function () {
  if (this.ended) return;
  if (this.remaining <= 0 && this.enemies.length === 0) {
    this.finish("win", "Рубеж удержан. Противник разбит.");
  }
};

SR.Game.prototype.finish = function (result, text) {
  if (this.ended) return;
  this.ended = true;
  this.state = result;
  this.status = result === "win" ? "Победа" : "Поражение";
  if (result === "win") SR.Audio.win();
  else SR.Audio.lose();
  this.saveBest();
  this.updateHud();
  if (typeof this.onEnd === "function") this.onEnd(result, text, this.score);
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
  this.hud.enemies.textContent = String(this.remaining);
  this.hud.status.textContent = this.status;
  this.hud.lives.innerHTML = "";
  const n = Math.max(0, this.lives);
  for (let i = 0; i < n; i++) {
    const pip = document.createElement("span");
    pip.className = "life-pip";
    this.hud.lives.appendChild(pip);
  }
};

SR.Game.prototype.frame = function (time) {
  const dt = this.lastTime ? Math.min(32, time - this.lastTime) : 16;
  this.lastTime = time;
  if (this.state === "playing") this.update(dt);
  SR.Render.draw(this.ctx, this, time);
  this.raf = requestAnimationFrame(this.frame.bind(this));
};

SR.Game.prototype.loop = function () {
  cancelAnimationFrame(this.raf);
  this.lastTime = 0;
  this.raf = requestAnimationFrame(this.frame.bind(this));
};
