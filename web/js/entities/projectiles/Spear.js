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
    // арт 12x4 = хитбокс; копьё летит остриём влево (рисунок Godot Spear)
    this.drawSprite(ctx, cam, 'spear', 0, 0, false);
  }
}
