/**
 * Spikes — каменные шипы храма на полную «грудь» героя (12px):
 * их надо перепрыгнуть. Рисуются процедурно (пиксельные треугольники),
 * хитбокс уже рисунка.
 */
class Spikes extends Obstacle {
  constructor(x, width = 16) {
    super(x, CONFIG.GROUND_Y - 12, width, 12);
  }

  get hitbox() {
    return { x: this.x + 3, y: this.y + 5, w: this.w - 6, h: this.h - 5 };
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x0 = Math.round(this.x - cam.x);
    const yb = Math.round(this.y + this.h - cam.y); // линия земли
    const spikes = Math.floor(this.w / 8);

    // каменная подложка
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(x0, yb - S, this.w * S, S);
    ctx.fillStyle = '#565b66';
    ctx.fillRect(x0, yb - 2 * S, this.w * S, S);

    for (let i = 0; i < spikes; i++) {
      const cx = x0 + i * 8 * S + 4 * S;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k === 0 ? '#e8edf5' : (k === 1 ? '#c2c9d4' : '#9aa3ad');
        const w = (k + 1) * 2 * S;
        ctx.fillRect(cx - w / 2, yb - (6 - k) * 2 * S, w, 2 * S);
      }
    }
  }
}
