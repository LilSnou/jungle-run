/**
 * Jaguar — крупный ягуар в полный рост (12px — «на уровне» героя):
 * мирно стоит, затем бросается на героя. Побеждается прыжком на голову.
 * Демонстрирует «триггерное» поведение.
 */
class Jaguar extends Enemy {
  static TRIGGER_RANGE = 250; // px — замечает героя раньше и бросается раньше
  static CHARGE_ACCEL = 520;  // px/с^2 — разгон быстрее
  static CHARGE_MAX = 205;    // px/с — и максимальная скорость выше

  #chargeSpeed = 0;
  #charging = false;

  constructor(x) {
    // хитбокс 14px — по ширине видимого тела (с хвостом арт ещё шире)
    super(x, CONFIG.GROUND_Y - 12, 14, 12);
  }

  update(dt) {
    this.tick(dt);
    if (this.groundFall(dt)) return;   // у края ямы — проваливается в неё
    const player = this.world.player;
    const dx = player.x - this.x;

    if (!this.#charging && dx < Jaguar.TRIGGER_RANGE && dx > -30) {
      this.#charging = true;
      events.emit('enemy:alert', { enemy: this });
    }

    if (this.#charging) {
      this.#chargeSpeed = Math.min(Jaguar.CHARGE_MAX, this.#chargeSpeed + Jaguar.CHARGE_ACCEL * dt);
      this.x -= this.#chargeSpeed * dt;
      // пыль под лапами
      if (Math.floor(this.#chargeSpeed * dt * 10) % 3 === 0) {
        this.world.spawnParticles(this.x + 4, CONFIG.GROUND_Y - 1, '#c7b58d', 1, -20);
      }
    }
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    // кадры бега 1..5 при разгоне, покой — кадр 0 (как в Godot Jaguar)
    const frame = this.#charging
      ? 'jaguar_' + (1 + Math.floor(this.animTime / 0.09) % 5)
      : 'jaguar_0';
    // якорь (-1,-2): арт 16x14 центрируется, низ лап ровно на земле
    this.drawSprite(ctx, cam, frame, -1, -2, true);
  }
}
