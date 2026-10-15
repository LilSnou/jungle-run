/**
 * Vine — жгут из лиан, свисающих на пути в джунглях.
 * Наследует LowLog (тот же хитбокс и контракт «под ним скользят»),
 * но рисуется по-своему — пример повторного использования через наследование.
 */
class Vine extends LowLog {
  constructor(x) {
    super(x);
    this.#leafPhase = Math.random() * Math.PI * 2;
  }

  #leafPhase;

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    const w = this.w * S;
    const h = this.h * S;

    // низ жгута — под низом хитбокса: жгут висит, под ним свободно про скольжение
    const bot = y + this.h + 1;
    const bt = bot - (h - 2 * S); // верх жгута

    // свисающие стебли — вверх к кроне за экран
    ctx.fillStyle = '#2f6b35';
    for (let i = 0; i < 4; i++) {
      const vx = x + 2 * S + i * 6 * S;
      ctx.fillRect(vx, -2, S, bt + 2);
    }

    // жгут лиан
    ctx.fillStyle = '#3f7a3a';
    ctx.fillRect(x, bt, w, h - 2 * S);
    ctx.fillStyle = '#2f5f2c';
    ctx.fillRect(x, bot - S, w, S);

    // листья (слегка колышутся)
    const sway = Math.round(Math.sin(this.world ? this.world.time * 2 + this.#leafPhase : 0) * S);
    ctx.fillStyle = '#4e9a3f';
    for (let i = 0; i < 5; i++) {
      const lx = x + i * 5 * S + sway;
      ctx.fillRect(lx, bt - S, 3 * S, S + (i % 2) * S);
      ctx.fillRect(lx + S, bt - 2 * S, S, S);
    }
    ctx.fillStyle = '#66b84f';
    ctx.fillRect(x + 3 * S, bt - S, 2 * S, S);
    ctx.fillRect(x + w - 6 * S, bt - S, 2 * S, S);
  }
}
