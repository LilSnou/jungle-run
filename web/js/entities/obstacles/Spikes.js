/**
 * Spikes — каменные шипы храма: их надо перепрыгнуть (присед не спасает —
 * хитбокс стыкуется с землёй). Хитбокс = визуал, как в Godot Spikes:
 * ячейка 8x7 мировых (арт 16x14 в масштабе 0.5), низ рисунка утоплен
 * на 1px в траву — шипы стоят на земле, а не «парят».
 */
class Spikes extends Obstacle {
  static CELL = 8;    // мировая ширина ячейки
  static CELL_H = 7;  // высота рисунка ячейки

  constructor(x, width = 16) {
    const cells = Math.max(1, Math.round(width / Spikes.CELL));
    super(
      x,
      CONFIG.GROUND_Y - Spikes.CELL_H + 1,
      Spikes.CELL * cells,
      Spikes.CELL_H - 1,
    );
  }

  draw(ctx, cam) {
    const art = SpriteStore.get('spikes'); // арт 16x14 — рисунок ОДНОЙ ячейки
    const cells = Math.round(this.w / Spikes.CELL);
    const y = Math.round(this.y - cam.y);
    for (let i = 0; i < cells; i++) {
      const x = Math.round(this.x + i * Spikes.CELL - cam.x);
      ctx.drawImage(art, 0, 0, art.width, art.height, x, y, Spikes.CELL, Spikes.CELL_H);
    }
  }
}
