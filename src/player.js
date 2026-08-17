window.SR = window.SR || {};

SR.Player = function (game, x, y) {
  this.game = game;
  this.id = "player";
  this.x = x;
  this.y = y;
  this.dir = 0;
  this.baseSpeed = 96;
  this.speed = 96;
  this.dead = false;
  this.hp = 1;
  this.maxHp = 1;
  this.invuln = 2000;
  this.shieldCharges = 0;
  this.speedBoost = 0;
  this.flash = 0;
  this.cooldown = 0;
  this.shotCooldown = 360;
  this.maxBullets = 1;
  this.bulletSpeed = 170;
  this.bulletDamage = 1;
  this.pierce = 0;
  this.moved = false;
  this.slideDir = 0;
  this.applyLevel(game.tankLevel || 1);
  this.hp = this.maxHp;
};

SR.Player.prototype.applyLevel = function (level) {
  this.tankLevel = Math.max(1, Math.min(4, level || 1));
  this.maxBullets = this.tankLevel >= 4 ? 3 : (this.tankLevel >= 3 ? 2 : 1);
  this.shotCooldown = this.tankLevel >= 4 ? 200 : (this.tankLevel >= 2 ? 260 : 360);
  this.bulletSpeed = this.tankLevel >= 4 ? 260 : (this.tankLevel >= 2 ? 220 : 170);
  this.bulletDamage = this.tankLevel >= 4 ? 2 : 1;
  this.pierce = 0;
  this.maxHp = 1;
  this.hp = 1;
};

SR.Player.prototype.isProtected = function () {
  return this.invuln > 0;
};

SR.Player.prototype.update = function (dt, input) {
  if (this.dead) return;
  this.invuln = Math.max(0, this.invuln - dt);
  this.speedBoost = Math.max(0, this.speedBoost - dt);
  this.flash = Math.max(0, this.flash - dt);
  this.cooldown = Math.max(0, this.cooldown - dt);
  this.moved = false;
  this.speed = this.baseSpeed * (this.speedBoost > 0 ? 1.25 : 1);

  const onIce = SR.Collision.onTile(this.game.grid, this, SR.TILE.ICE);
  let dist = this.speed * dt / 1000;
  if (onIce) dist *= 1.45;

  const tanks = this.game.allTanks();
  const grid = this.game.grid;
  const want = input.dir;

  if (want !== null) {
    this.dir = want;
    this.slideDir = want;
    this.moved = SR.Collision.nudgeMove(this, want, dist, grid, tanks);
  } else if (onIce) {
    this.moved = SR.Collision.nudgeMove(this, this.slideDir, dist, grid, tanks);
  }

  if (this.moved) this.game.addDust(this);

  if (input.fire && this.cooldown <= 0) this.game.tryShoot(this);
};
