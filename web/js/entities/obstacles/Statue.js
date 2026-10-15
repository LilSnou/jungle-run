/**
 * Statue — высокий каменный идол майя. Перепрыгивается двойным
 * прыжком (высота 30px — на пределе обычного прыжка), особенно
 * неприятна в связке с другими препятствиями.
 */
class Statue extends Obstacle {
  constructor(x) {
    super(x, CONFIG.GROUND_Y - 30, 12, 30);
  }

  get hitbox() {
    return { x: this.x + 1, y: this.y + 2, w: this.w - 2, h: this.h - 2 };
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    const w = this.w * S;
    const h = this.h * S;

    // тело
    ctx.fillStyle = '#6a6f78';
    ctx.fillRect(x, y + 2 * S, w, h - 2 * S);
    // «шапка»
    ctx.fillStyle = '#7d838d';
    ctx.fillRect(x - S, y, w + 2 * S, 3 * S);
    // лицо
    ctx.fillStyle = '#4a4e56';
    ctx.fillRect(x + 2 * S, y + 5 * S, 2 * S, 2 * S);   // глаз
    ctx.fillRect(x + 6 * S, y + 5 * S, 2 * S, 2 * S);   // глаз
    ctx.fillRect(x + 3 * S, y + 10 * S, 4 * S, S);      // рот
    ctx.fillRect(x + 4 * S, y + 7 * S, 2 * S, 2 * S);   // нос
    // узоры
    ctx.fillStyle = '#565b63';
    ctx.fillRect(x + S, y + 14 * S, w - 2 * S, S);
    ctx.fillRect(x + S, y + 20 * S, w - 2 * S, S);
    // мох
    ctx.fillStyle = '#3e7a3a';
    ctx.fillRect(x + S, y + 3 * S, 2 * S, S);
    ctx.fillRect(x + w - 4 * S, y + 16 * S, 2 * S, 2 * S);
    ctx.fillRect(x + 2 * S, y + h - 4 * S, 3 * S, S);
    // основание
    ctx.fillStyle = '#565b63';
    ctx.fillRect(x - S, y + h - 3 * S, w + 2 * S, 3 * S);
  }
}
