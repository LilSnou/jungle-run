/**
 * LowLog — низко подвешенное бревно (в джунглях — на vines,
 * в деревне — на канатах). Его нельзя перепрыгнуть стоя —
 * нужно скользить под ним.
 */
class LowLog extends Obstacle {
  constructor(x) {
    super(x, CONFIG.GROUND_Y - 18, 24, 9);
  }

  /** Пока игрок скользит — мимо. Прыжок врезается в бревно. */
  get hitbox() {
    return { x: this.x, y: this.y + 1, w: this.w, h: this.h - 2 };
  }

  get isOverhead() { return true; }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    const w = this.w * S;
    const h = this.h * S;

    // верёвки/ vines вверх к кроне
    ctx.fillStyle = '#3f6b35';
    ctx.fillRect(x + 2 * S, y - 6 * S, S, 6 * S);
    ctx.fillRect(x + w - 3 * S, y - 6 * S, S, 6 * S);

    // бревно
    ctx.fillStyle = '#6b4a25';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#54381b';
    ctx.fillRect(x, y + h - S, w, S);
    ctx.fillStyle = '#845c30';
    ctx.fillRect(x, y + S, w, S);
    // годовые кольца на торце
    ctx.fillStyle = '#3d2a14';
    ctx.fillRect(x + S, y + 2 * S, S, S);
    ctx.fillRect(x + w - 2 * S, y + 2 * S, S, S);
    ctx.fillRect(x + w - 2 * S, y + 5 * S, S, S);
    // сук
    ctx.fillStyle = '#6b4a25';
    ctx.fillRect(x + 9 * S, y - 2 * S, 2 * S, 2 * S);
  }
}
