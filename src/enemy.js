window.SR = window.SR || {};

SR.ENEMY_KINDS = {
  basic: { hp: 1, speed: 46, cooldown: 1150, score: 100, color: "basic", bulletSpeed: 150 },
  fast: { hp: 1, speed: 80, cooldown: 860, score: 200, color: "fast", bulletSpeed: 170 },
  heavy: { hp: 3, speed: 32, cooldown: 1400, score: 400, color: "heavy", bulletSpeed: 135 }
};

SR.Enemy = function (game, x, y, kind, id) {
  const spec = SR.ENEMY_KINDS[kind];
  this.game = game;
  this.id = id;
  this.kind = kind;
  this.x = x;
  this.y = y;
  this.dir = 2;
  this.speed = spec.speed;
  this.hp = spec.hp;
  this.maxHp = spec.hp;
  this.score = spec.score;
  this.shotDelay = spec.cooldown;
  this.bulletSpeed = spec.bulletSpeed || 150;
  this.dead = false;
  this.invuln = 500;
  this.shield = 0;
  this.strongShot = 0;
  this.cooldown = 700;
  this.thinkIn = 200;
};

SR.Enemy.prototype.cell = function () {
  const t = SR.CONST.TILE;
  const mid = SR.CONST.TANK / 2;
  return {
    c: Math.floor((this.x + mid) / t),
    r: Math.floor((this.y + mid) / t)
  };
};

SR.Enemy.prototype.dirToPoint = function (px, py) {
  const cx = this.x + SR.CONST.TANK / 2;
  const cy = this.y + SR.CONST.TANK / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
  return dy > 0 ? 2 : 0;
};

SR.Enemy.prototype.sees = function (target) {
  if (!target) return false;
  const a = this.cell();
  const t = SR.CONST.TILE;
  const mid = SR.CONST.TANK / 2;
  const b = {
    c: Math.floor((target.x + mid) / t),
    r: Math.floor((target.y + mid) / t)
  };
  if (a.c !== b.c && a.r !== b.r) return false;
  return SR.Collision.lineClear(this.game.grid, a.c, a.r, b.c, b.r);
};

SR.Enemy.prototype.chooseDir = function () {
  const player = this.game.player && !this.game.player.dead ? this.game.player : null;
  const base = SR.Map.spawnPixel(SR.SPAWN.base);
  const roll = Math.random();
  if (player && roll < 0.4) return this.dirToPoint(player.x, player.y);
  if (roll < 0.78) return this.dirToPoint(base.x, base.y);
  return Math.floor(Math.random() * 4);
};

SR.Enemy.prototype.update = function (dt) {
  if (this.dead) return;
  this.invuln = Math.max(0, this.invuln - dt);
  this.cooldown = Math.max(0, this.cooldown - dt);
  if (this.game.freezeLeft > 0) return;
  this.thinkIn -= dt;

  const player = this.game.player && !this.game.player.dead ? this.game.player : null;
  const basePos = SR.Map.spawnPixel(SR.SPAWN.base);
  const baseTarget = { x: basePos.x, y: basePos.y };
  let want = this.dir;

  if (player && this.sees(player)) {
    want = this.dirToPoint(player.x, player.y);
    if (this.cooldown <= 0) this.game.tryShoot(this);
  } else if (this.sees(baseTarget)) {
    want = this.dirToPoint(basePos.x, basePos.y);
    if (this.cooldown <= 0) this.game.tryShoot(this);
  } else if (this.thinkIn <= 0) {
    this.thinkIn = 380 + Math.random() * 720;
    want = this.chooseDir();
    if (this.cooldown <= 0 && Math.random() < 0.35) this.game.tryShoot(this);
  }

  const onIce = SR.Collision.onTile(this.game.grid, this, SR.TILE.ICE);
  let dist = this.speed * dt / 1000;
  if (onIce) dist *= 1.45;
  const moved = SR.Collision.controlTank(this, want, true, dist, this.game.grid, this.game.allTanks());
  if (!moved) {
    this.dir = this.chooseDir();
    SR.Collision.nudgeMove(this, this.dir, dist, this.game.grid, this.game.allTanks());
    if (this.cooldown <= 0) this.game.tryShoot(this);
  }
};
