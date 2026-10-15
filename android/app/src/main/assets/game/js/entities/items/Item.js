/**
 * Item — абстрактный базовый класс подбираемых предметов
 * (золотые идолы, сердца). Поколебавшись в воздухе, они ждут героя.
 */
class Item extends Entity {
  #phase = Math.random() * Math.PI * 2;
  #baseY;
  #time = 0;

  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.#baseY = y;
  }

  get collectible() { return true; }
  get baseY() { return this.#baseY; }
  get time() { return this.#time; }
  get phase() { return this.#phase; }

  /** Поднять/опустить точку парения (используется генератором уровня). */
  setBaseY(v) { this.#baseY = v; this.y = v; }

  update(dt) {
    this.#time += dt;
    this.y = this.#baseY + Math.sin(this.#time * 3 + this.#phase) * 2;
  }

  /** Игрок подобрал предмет (каждый предмет решает сам, что делать). */
  onCollect(player) { /* абстрактно */ }
}
