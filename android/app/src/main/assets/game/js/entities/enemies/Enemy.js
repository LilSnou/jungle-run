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

  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.world = null;
  }

  get damageOnTouch() { return true; }
  get stompable() { return !this.#stomped; }
  get animTime() { return this.#animTime; }

  /** Игрок прыгнул на голову: враг побеждён. */
  onStomp(player) {
    this.#stomped = true;
    this.#flash = 0.12;
    this.world.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#f2e2b0', 8, -80);
    events.emit('enemy:stomped', { enemy: this });
  }

  /** Игрок коснулся сбоку: враг «уходит», игрок получает урон (World решает). */
  onHit(player) { /* по умолчанию враг выживает */ }

  /** Тик анимации для потомков. */
  tick(dt) { this.#animTime += dt; }

  /** Кадр по прошедшему времени: переключение раз в `interval` секунд. */
  frameBy(interval, count, prefix) {
    return prefix + (Math.floor(this.#animTime / interval) % count);
  }
}
