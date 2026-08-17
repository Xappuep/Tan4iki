window.SR = window.SR || {};

SR.Player = function (game, x, y) {
  this.game = game;
  this.id = "player";
  this.x = x;
  this.y = y;
  this.dir = 0;
  this.speed = 96;
  this.dead = false;
  this.hp = 1;
  this.invuln = 2000;
  this.shield = 0;
  this.strongShot = 0;
  this.cooldown = 0;
  this.moved = false;
  this.slideDir = 0;
};

SR.Player.prototype.isProtected = function () {
  return this.invuln > 0 || this.shield > 0;
};

SR.Player.prototype.update = function (dt, input) {
  if (this.dead) return;
  this.invuln = Math.max(0, this.invuln - dt);
  this.shield = Math.max(0, this.shield - dt);
  this.strongShot = Math.max(0, this.strongShot - dt);
  this.cooldown = Math.max(0, this.cooldown - dt);
  this.moved = false;

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

  if (input.fire && this.cooldown <= 0) this.game.tryShoot(this);
};
