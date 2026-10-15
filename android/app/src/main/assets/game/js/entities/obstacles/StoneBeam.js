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

    // низ балки — под низом хитбокса (под ней можно проскользнуть)
    const bot = y + this.h + 1;
    const top = bot - (h - S);

    // балка
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(x, top, w, h - S);
    ctx.fillStyle = '#7d838d';
    ctx.fillRect(x, top, w, S);
    ctx.fillStyle = '#4a4e56';
    ctx.fillRect(x, bot - S, w, S);

    // резные каннелюры
    ctx.fillStyle = '#565b63';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + (3 + i * 5) * S, top + 3 * S, S, 3 * S);
    }
    // трещина
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(x + 9 * S, top + 2 * S, S, 3 * S);
    ctx.fillRect(x + 10 * S, top + 4 * S, 2 * S, S);

    // цепи вверх к потолку храма — балка подвешена, под ней свободно про скольжение
    ctx.fillStyle = '#565b63';
    ctx.fillRect(x + 2 * S, -2, S, top + 2);
    ctx.fillRect(x + w - 3 * S, -2, S, top + 2);
    ctx.fillStyle = '#8d8f9c';
    for (let yy = -2; yy < top; yy += 4) {
      ctx.fillRect(x + 2 * S, yy + 1, S, 2);
      ctx.fillRect(x + w - 3 * S, yy + 1, S, 2);
    }

    // мхи и трава на балке
    ctx.fillStyle = '#3e7a3a';
    ctx.fillRect(x + 6 * S, bot - 2 * S, 3 * S, S);
    ctx.fillRect(x + w - 12 * S, bot - 2 * S, 4 * S, S);
  }
}
