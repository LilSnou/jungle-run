/**
 * Bat — летучая мышь: летит по синусоиде на высоте головы героя.
 * НЕ побеждается прыжком сверху (летает) — от неё нужно уворачиваться:
 * уйди приседом (скольжением) либо отпрыгни вовремя.
 */
class Bat extends Enemy {
  static DRIFT = 42;   // px/с — сносит навстречу герою
  static AMPLITUDE = 3; // px — лёгкое покачивание (крылья машут кадрами)

  #baseY;
  #phase;
  #amp;

  /**
   * @param {number} x мировая X
   * @param {number} altitude высота полёта над землёй (19 — на уровне головы;
   *   нижняя точка мыши (141) не задевает скользящего героя, а верхняя (135)
   *   гарантированно пересекается с бегущим)
   */
  constructor(x, altitude = 19) {
    const baseY = CONFIG.GROUND_Y - altitude;
    super(x, baseY, 13, 7);
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
    // якорь (-0.5,-1): арт 14x8 центрируется по хитбоксу (Godot Bat)
    this.drawSprite(ctx, cam, this.frameBy(0.12, 4, 'bat_'), -0.5, -1, true);
  }
}
