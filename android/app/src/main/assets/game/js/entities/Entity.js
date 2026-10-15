/**
 * Entity — абстрактный базовый класс всех игровых объектов.
 *
 * ООП-принципы здесь:
 *  • Абстракция  — update()/draw() объявлены, но не реализованы:
 *                  каждый потомок сам решает, как он живёт и рисуется.
 *  • Инкапсуляция — координаты, размер и состояние «мёртвости» скрыты
 *                  за приватными полями; наружу — только геттеры.
 *  • Наследование — Player, Enemy, Obstacle, Item наследуют этот класс
 *                  и переопределяют виртуальные методы (полиморфизм).
 */
class Entity {
  #x;
  #y;
  #w;
  #h;
  #dead = false;
  #world = null;

  constructor(x, y, w, h) {
    this.#x = x;
    this.#y = y;
    this.#w = w;
    this.#h = h;
  }

  get x() { return this.#x; }
  set x(v) { this.#x = v; }
  get y() { return this.#y; }
  set y(v) { this.#y = v; }
  get w() { return this.#w; }
  set w(v) { this.#w = v; }
  get h() { return this.#h; }
  set h(v) { this.#h = v; }

  get world() { return this.#world; }
  set world(v) { this.#world = v; }

  get isDead() { return this.#dead; }

  /** Пометить сущность удалённой. */
  kill() { this.#dead = true; }

  /** Хитбокс для столкновений. Некоторые объекты переопределяют. */
  get hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /** Пересекается ли с другой сущностью. */
  overlaps(other) { return rectsOverlap(this.hitbox, other.hitbox); }

  /** Обновление состояния (каждый кадр). */
  update(dt) { /* абстрактно */ }

  /** Отрисовка (каждый кадр). */
  draw(ctx, cam) { /* абстрактно */ }

  /**
   * Универсальный рисунок спрайта с масштабом CONFIG.SCALE.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number,y:number}} cam   камера
   * @param {string} name   имя спрайта в SpriteStore
   * @param {number} ax     смещение спрайта по X (в пикселях спрайта)
   * @param {number} ay     смещение по Y
   * @param {boolean} flip  зеркально отразить
   */
  drawSprite(ctx, cam, name, ax = 0, ay = 0, flip = false) {
    const sprite = flip ? SpriteStore.getFlipped(name) : SpriteStore.get(name);
    const S = CONFIG.SCALE;
    const dx = Math.round(this.x + ax * S - cam.x);
    const dy = Math.round(this.y + ay * S - cam.y);
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, dx, dy, sprite.width * S, sprite.height * S);
  }

  /** Камера «следит» за игроком вертикально, если он падает в яму. */
  get isProjectile() { return false; }
  get damageOnTouch() { return false; }
  get stompable() { return false; }
}
