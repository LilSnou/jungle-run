/**
 * Bat — летучая мышь: летит по синусоиде на высоте головы героя.
 * НЕ побеждается прыжком сверху (летает) — от неё нужно уворачиваться:
 * уйди приседом (скольжением) либо отпрыгни вовремя.
 */
class Bat extends Enemy {
  static DRIFT = 42;   // px/с — сносит навстречу герою
  static AMPLITUDE = 7; // px — «машет крыльями» по вертикали

  #baseY;
  #phase;
  #amp;

  /**
   * @param {number} x мировая X
   * @param {number} altitude высота полёта над землёй (18 — на уровне головы)
   */
  constructor(x, altitude = 18) {
    const baseY = CONFIG.GROUND_Y - altitude;
    super(x, baseY, 10, 7);
    this.#baseY = baseY;
    this.#phase = Math.random() * Math.PI * 2;
    this.#amp = Bat.AMPLITUDE;
  }

  get stompable() { return false; } // сверху её не возьмёшь

  update(dt) {
    this.tick(dt);
    this.x -= Bat.DRIFT * dt;
    this.y = this.#baseY + Math.sin(this.animTime * 5 + this.#phase) * this.#amp;
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    this.drawSprite(ctx, cam, this.frameBy(0.12, 2, 'bat_'), -2, 0, true);
  }
}
