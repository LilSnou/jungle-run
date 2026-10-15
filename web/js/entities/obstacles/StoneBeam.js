/**
 * StoneBeam — упавшая каменная балка колонны в храме майя.
 * Наследует LowLog: проскальзывай или получай урон.
 */
class StoneBeam extends LowLog {
  constructor(x) {
    super(x);
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    const w = this.w * S;
    const h = this.h * S;

    // балка
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(x, y + S, w, h - S);
    ctx.fillStyle = '#7d838d';
    ctx.fillRect(x, y + S, w, S);
    ctx.fillStyle = '#4a4e56';
    ctx.fillRect(x, y + h - S, w, S);

    // резные каннелюры
    ctx.fillStyle = '#565b63';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + (3 + i * 5) * S, y + 3 * S, S, 3 * S);
    }
    // трещина
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(x + 9 * S, y + 2 * S, S, 3 * S);
    ctx.fillRect(x + 10 * S, y + 4 * S, 2 * S, S);

    // мхи и трава снизу
    ctx.fillStyle = '#3e7a3a';
    ctx.fillRect(x + 2 * S, y + h - 2 * S, 3 * S, S);
    ctx.fillRect(x + w - 7 * S, y + h - 2 * S, 4 * S, S);
  }
}
