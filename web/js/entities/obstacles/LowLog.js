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

    // низ бревна — ровно под низом хитбокса (бревно висит, а не лежит на земле)
    const bot = y + this.h + 1;
    const top = bot - h;

    // vines/верёвки — вверх к кроне за пределы экрана
    ctx.fillStyle = '#3f6b35';
    ctx.fillRect(x + 2 * S, -2, S, top + 2);
    ctx.fillRect(x + w - 3 * S, -2, S, top + 2);
    ctx.fillStyle = '#2f5f2c';
    ctx.fillRect(x + 2 * S, -2, 1, top + 2);
    ctx.fillRect(x + w - 3 * S, -2, 1, top + 2);

    // бревно
    ctx.fillStyle = '#6b4a25';
    ctx.fillRect(x, top, w, h);
    ctx.fillStyle = '#54381b';
    ctx.fillRect(x, top + h - S, w, S);
    ctx.fillStyle = '#845c30';
    ctx.fillRect(x, top + S, w, S);
    // годовые кольца на торце
    ctx.fillStyle = '#3d2a14';
    ctx.fillRect(x + S, top + 3 * S, S, S);
    ctx.fillRect(x + w - 2 * S, top + 3 * S, S, S);
    ctx.fillRect(x + w - 2 * S, top + 6 * S, S, S);
    // сук
    ctx.fillStyle = '#54381b';
    ctx.fillRect(x + 9 * S, top - S, 2 * S, S);
  }
}
