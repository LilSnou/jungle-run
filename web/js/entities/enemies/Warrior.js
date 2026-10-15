/**
 * Warrior — воин племени: стоит на месте, замечает героя и метает
 * копьё на уровне пояса. Копьё нужно перепрыгнуть; самого воина
 * можно обыграть стомпом.
 */
class Warrior extends Enemy {
  static ALERT_RANGE = 170;
  static WINDUP = 0.45;   // с — замах
  static COOLDOWN = 1.7;  // с — пауза между бросками
  static SPEAR_ALTITUDE = 11;

  #state = 'idle';        // idle | windup | throw
  #timer = 0;

  constructor(x) {
    // хитбокс 13px — по видимому телу с диадемой (арт 16x15)
    super(x, CONFIG.GROUND_Y - 15, 13, 15);
  }

  update(dt) {
    this.tick(dt);
    const player = this.world.player;
    const dx = player.x - this.x;

    switch (this.#state) {
      case 'idle':
        if (this.#timer <= 0 && dx < Warrior.ALERT_RANGE && dx > 40) {
          this.#state = 'windup';
          this.#timer = Warrior.WINDUP;
          events.emit('enemy:alert', { enemy: this });
        }
        break;
      case 'windup':
        this.#timer -= dt;
        if (this.#timer <= 0) {
          this.#state = 'throw';
          this.#timer = 0.15;
          this.world.spawnProjectile(new Spear(
            this.x - 6,
            CONFIG.GROUND_Y - Warrior.SPEAR_ALTITUDE,
          ));
          events.emit('warrior:throw');
        }
        break;
      case 'throw':
        this.#timer -= dt;
        if (this.#timer <= 0) {
          this.#state = 'idle';
          this.#timer = Warrior.COOLDOWN;
        }
        break;
    }

    if (this.#state === 'idle' && this.#timer > 0) this.#timer -= dt;
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    const frame = this.#state === 'windup' ? 'warrior_1' : this.frameBy(0.6, 2, 'warrior_');
    // якорь: арт 16x15 центрируется, ступни ровно на земле
    this.drawSprite(ctx, cam, frame, -4.75, -7.5, true);
  }
}
