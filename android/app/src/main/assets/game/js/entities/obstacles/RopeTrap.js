/**
 * RopeTrap — верёвка-ловушка между двумя деревянными столбиками
 * в деревне аборигенов. Наследует LowLog.
 */
class RopeTrap extends LowLog {
  constructor(x) {
    super(x);
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    const w = this.w * S;
    const h = this.h * S;

    // столбики
    ctx.fillStyle = '#6b4a25';
    ctx.fillRect(x - S, y - 4 * S, 2 * S, h + 4 * S);
    ctx.fillRect(x + w - S, y - 4 * S, 2 * S, h + 4 * S);
    ctx.fillStyle = '#845c30';
    ctx.fillRect(x - S, y - 4 * S, S, h + 4 * S);
    // резные навершия столбиков
    ctx.fillStyle = '#c9832e';
    ctx.fillRect(x - 2 * S, y - 6 * S, 4 * S, 2 * S);
    ctx.fillRect(x + w - 2 * S, y - 6 * S, 4 * S, 2 * S);

    // провисшая верёвка
    ctx.fillStyle = '#d9b382';
    ctx.fillRect(x, y + S, w, S);
    ctx.fillRect(x + 2 * S, y + 2 * S, w - 4 * S, S);
    ctx.fillStyle = '#a58a5f';
    ctx.fillRect(x + 4 * S, y + 3 * S, w - 8 * S, S);

    // лохмотья/флажки на верёвке
    ctx.fillStyle = '#b03027';
    ctx.fillRect(x + 5 * S, y + 3 * S, 2 * S, 3 * S);
    ctx.fillStyle = '#3fae4a';
    ctx.fillRect(x + w - 8 * S, y + 3 * S, 2 * S, 3 * S);
  }
}
