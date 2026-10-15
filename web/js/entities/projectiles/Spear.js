/**
 * Spear — копьё, брошенное воином. Летит горизонтально на уровне пояса:
 * его нужно перепрыгнуть. Пример снаряда (полиморфный «обычный враг» —
 * тот же контракт damageOnTouch, но своё поведение).
 */
class Spear extends Enemy {
  static SPEED = 210; // px/с

  constructor(x, y) {
    super(x, y - 2, 12, 4);
  }

  get stompable() { return false; }

  update(dt) {
    this.tick(dt);
    this.x -= Spear.SPEED * dt;
    if (this.x < this.world.camera.x - 20) this.kill();
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    // древко
    ctx.fillStyle = '#8a6a3d';
    ctx.fillRect(x, y + S, this.w * S, S);
    // остриё слева
    ctx.fillStyle = '#c8ccd8';
    ctx.fillRect(x, y + S, S * 2, S);
    ctx.fillStyle = '#5c5e6b';
    ctx.fillRect(x + S * 2, y, S, S * 3);
  }
}
