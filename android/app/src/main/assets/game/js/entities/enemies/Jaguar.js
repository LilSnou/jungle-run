/**
 * Jaguar — гепард/ягуар: мирно стоит, затем бросается на героя.
 * Побеждается прыжком на голову. Демонстрирует «триггерное» поведение.
 */
class Jaguar extends Enemy {
  static TRIGGER_RANGE = 150; // px — когда начинает гнаться
  static CHARGE_ACCEL = 260;  // px/с^2
  static CHARGE_MAX = 150;    // px/с

  #chargeSpeed = 0;
  #charging = false;

  constructor(x) {
    super(x, CONFIG.GROUND_Y - 8, 13, 8);
  }

  update(dt) {
    this.tick(dt);
    const player = this.world.player;
    const dx = player.x - this.x;

    if (!this.#charging && dx < Jaguar.TRIGGER_RANGE && dx > -30) {
      this.#charging = true;
      events.emit('enemy:alert', { enemy: this });
    }

    if (this.#charging) {
      this.#chargeSpeed = Math.min(Jaguar.CHARGE_MAX, this.#chargeSpeed + Jaguar.CHARGE_ACCEL * dt);
      this.x -= this.#chargeSpeed * dt;
      // Пыль под лапами
      if (Math.floor(this.#chargeSpeed * dt * 10) % 3 === 0) {
        this.world.spawnParticles(this.x + 4, CONFIG.GROUND_Y - 1, '#c7b58d', 1, -20);
      }
    }
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    const frame = this.#charging ? this.frameBy(0.09, 2, 'jaguar_') : 'jaguar_0';
    this.drawSprite(ctx, cam, frame, -2, -1, true);
  }
}
