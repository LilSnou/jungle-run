/**
 * LowLog — базовый класс «подвешенных» препятствий (порт Godot Overhead):
 * деревянное бревно, жгут лиан, верёвка-ловушка, каменная балка.
 *
 * Висят над землёй (под ним можно проскользнуть, а прыжок врезается),
 * слегка покачиваются и тянутся канатами к кроне/потолку за верх экрана —
 * как в Godot и в web-версии.
 *
 * Рисунок — спрайт из общего пиксель-арта в масштабе 0.5 (2 арт-пикселя
 * на мировую единицу): визуал совпадает с хитбоксом (контракт «хитбокс
 * ≈ визуал»). Потомки задают арт/цвет каната через конструктор.
 */
class LowLog extends Obstacle {
  static SWAY = 0.8;    // амплитуда покачивания, мировых px
  static HANG_TO = -2;  // линии подвеса идут к самому верху экрана

  #art;
  #swayT;

  /**
   * @param {number} x     мировая X
   * @param {string} art   имя спрайта (log1 | log2 | vine1 | ropetrap | stonebeam)
   * @param {number} w     ширина хитбокса
   * @param {number} h     высота хитбокса
   * @param {number} y     верх хитбокса
   */
  constructor(x, art = 'log1', w = 24, h = 9, y = CONFIG.GROUND_Y - 18) {
    super(x, y, w, h);
    this.#art = art;
    this.#swayT = x * 0.07; // у каждой пары — своя фаза покачивания
    this.ropeColor = '#d9b382'; // цвет каната (потомки переопределяют)
    this.isChain = false;       // цепь со «звеньями» вместо гладкого каната
  }

  get isOverhead() { return true; }

  /** Хитбокс чуть уже рисунка (как в Godot): край арта не «бьёт» зря. */
  get hitbox() {
    return { x: this.x, y: this.y + 1, w: this.w, h: this.h - 2 };
  }

  update(dt) {
    this.#swayT += dt;
  }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);

    // канаты/цепи от верха экрана до верха спрайта (арт-якорь ay = +1)
    const ytop = Math.round(LowLog.HANG_TO - cam.y);
    const bottom = y + 1;
    if (bottom > ytop) {
      for (const lx of [2, this.w - 3]) {
        ctx.fillStyle = this.ropeColor;
        ctx.fillRect(x + lx, ytop, 1, bottom - ytop);
        if (this.isChain) {
          ctx.fillStyle = '#8d8f9c';
          for (let yy = ytop + 1; yy < bottom; yy += 4) {
            ctx.fillRect(x + lx, yy, 1, 2);
          }
        }
      }
    }

    // спрайт: покачивание ±SWAY по X; низ арта = низ хитбокса + 1
    const sway = LowLog.SWAY * Math.sin(this.#swayT * 1.7);
    this.drawSprite(ctx, cam, this.#art, sway, 1, false, 0.5);
  }
}
