/**
 * Pit — провал в земле. Особое препятствие: оно не «бьёт» игрока,
 * оно убирает землю под ним. Мир спрашивает isGroundAt(x) — если
 * земли нет, герой падает (Player сам решает, что делать).
 */
class Pit extends Obstacle {
  constructor(x, width = 40) {
    super(x, CONFIG.GROUND_Y, width, CONFIG.HEIGHT - CONFIG.GROUND_Y + 20);
  }

  get damageOnTouch() { return false; } // урон — через падение
  get isPit() { return true; }

  /** Кровать ямы пересекается только если игрок уже упал. */
  get hitbox() {
    return { x: this.x + 2, y: this.y + 10, w: this.w - 4, h: this.h - 10 };
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x0 = Math.round(this.x - cam.x);
    const w = Math.round(this.w * S);
    const yTop = Math.round(this.y - cam.y);

    // темнота
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x0, yTop, w, CONFIG.HEIGHT * 2);

    // стены
    ctx.fillStyle = '#2b2016';
    ctx.fillRect(x0, yTop, 3 * S, CONFIG.HEIGHT);
    ctx.fillRect(x0 + w - 3 * S, yTop, 3 * S, CONFIG.HEIGHT);
    ctx.fillStyle = '#43331f';
    ctx.fillRect(x0 + 3 * S, yTop, S, CONFIG.HEIGHT);
    ctx.fillRect(x0 + w - 4 * S, yTop, S, CONFIG.HEIGHT);

    // кости внизу (жуткая деталь)
    ctx.fillStyle = '#cfc7ae';
    ctx.fillRect(x0 + 8 * S, yTop + 22 * S, 3 * S, S);
    ctx.fillRect(x0 + w - 12 * S, yTop + 25 * S, 2 * S, S);
    ctx.fillRect(x0 + w / 2, yTop + 28 * S, S, S);
  }
}
