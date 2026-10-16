/**
 * Enemy — абстрактный базовый класс врагов.
 *
 * Наследует Entity; конкретные враги (змея, ягуар, летучая мышь, воин)
 * наследуют этот класс и реализуют собственные update()/draw() —
 * пример полиморфизма: World вызывает их «не зная» кто это.
 */
class Enemy extends Entity {
  #animTime = 0;
  #stomped = false;
  #flash = 0;
  #falling = false;
  #fallVy = 0;

  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.world = null;
  }

  get damageOnTouch() { return !this.#falling; }
  get stompable() { return !this.#stomped && !this.#falling; }
  get animTime() { return this.#animTime; }
  get falling() { return this.#falling; }
  /** Летает ли враг (летучие мыши спокойно летают над ямами). */
  get flies() { return false; }

  /** Игрок прыгнул на голову: враг побеждён (исчезает с искрами). */
  onStomp(player) {
    this.#stomped = true;
    this.#flash = 0.12;
    this.world.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#f2e2b0', 8, -80);
    events.emit('enemy:stomped', { enemy: this });
    this.kill(); // победа «в прыжке» — враг умирает и исчезает
  }

  /** Игрок коснулся сбоку: враг «уходит», игрок получает урон (World решает). */
  onHit(player) { /* по умолчанию враг выживает */ }

  /** Тик анимации для потомков. */
  tick(dt) { this.#animTime += dt; }

  /**
   * Наземные враги у края ямы проваливаются в неё: начинают падать,
   * теряют способность наносить урон и исчезают в бездне.
   * Возвращает true, пока враг падает (потомки прерывают update).
   */
  groundFall(dt) {
    if (this.#falling) {
      this.#fallVy += CONFIG.GRAVITY * dt;
      this.y += this.#fallVy * dt;
      if (this.y > CONFIG.GROUND_Y + 80) this.kill();
      return true;
    }
    if (this.world && !this.world.isGroundAt(this.x + this.w / 2)) {
      this.#falling = true;
      this.#fallVy = 0;
    }
    return false;
  }

  /** Кадр по прошедшему времени: переключение раз в `interval` секунд. */
  frameBy(interval, count, prefix) {
    return prefix + (Math.floor(this.#animTime / interval) % count);
  }
}
