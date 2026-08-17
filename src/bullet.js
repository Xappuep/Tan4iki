window.SR = window.SR || {};

SR.Bullet = function (x, y, dir, ownerId, strong, extra) {
  extra = extra || {};
  this.x = x;
  this.y = y;
  this.dir = dir;
  this.ownerId = ownerId;
  this.strong = !!strong;
  this.speed = extra.speed || 280;
  this.size = extra.size || 6;
  this.damage = extra.damage || 1;
  this.alive = true;
};

SR.Bullet.prototype.rect = function () {
  return { x: this.x, y: this.y, w: this.size, h: this.size };
};

SR.Bullet.prototype.update = function (dt) {
  const dist = this.speed * dt / 1000;
  if (this.dir === 0) this.y -= dist;
  if (this.dir === 1) this.x += dist;
  if (this.dir === 2) this.y += dist;
  if (this.dir === 3) this.x -= dist;
  const field = SR.CONST.COLS * SR.CONST.TILE;
  if (this.x < -8 || this.y < -8 || this.x > field || this.y > field) this.alive = false;
};

SR.dirOffset = function (dir, length) {
  if (dir === 0) return { x: 0, y: -length };
  if (dir === 1) return { x: length, y: 0 };
  if (dir === 2) return { x: 0, y: length };
  return { x: -length, y: 0 };
};

SR.spawnBulletFromTank = function (tank) {
  const mid = SR.CONST.TANK / 2;
  const nose = SR.dirOffset(tank.dir, mid + 2);
  const level = tank.tankLevel || 1;
  return new SR.Bullet(
    tank.x + mid + nose.x - 3,
    tank.y + mid + nose.y - 3,
    tank.dir,
    tank.id,
    false,
    {
      speed: tank.bulletSpeed || 280,
      size: level >= 3 ? 8 : (level >= 2 ? 7 : 6),
      damage: tank.bulletDamage || 1
    }
  );
};
