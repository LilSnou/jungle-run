/**
 * HUD — heads-up display: жизни, очки, метры, название локации,
 * всплывающие сообщения. Подписан на события мира (Observer):
 * сама не лезет в World за «кнопками», только читает состояние.
 */
class HUD {
  #message = '';
  #messageSub = '';
  #messageTimer = 0;
  #flash = 0;

  constructor() {
    events.on('biome:changed', ({ biome, loop }) => {
      this.#message = biome.name;
      this.#messageSub = loop > 0 ? 'LOOP ' + (loop + 1) : '';
      this.#messageTimer = 2.2;
    });
    events.on('player:hurt', () => { this.#flash = 0.25; });
  }

  update(dt) {
    this.#messageTimer = Math.max(0, this.#messageTimer - dt);
    this.#flash = Math.max(0, this.#flash - dt);
  }

  draw(ctx, world) {
    const W = CONFIG.WIDTH;

    // верхняя панель
    ctx.fillStyle = 'rgba(10,8,16,0.45)';
    ctx.fillRect(0, 0, W, 22);

    // жизни
    for (let i = 0; i < world.player.lives; i++) {
      this.drawHeart(ctx, 6 + i * 12, 6);
    }

    // очки и метры
    PixelFont.draw(ctx, 'SCORE ' + world.score, W / 2, 4, { align: 'center', shadow: '#141220' });
    PixelFont.draw(ctx, world.distance + ' M', W / 2, 14, { align: 'center', color: '#c9c2ad', shadow: '#141220' });

    // скорость/сложность — тонкая полоска справа
    const diffW = 40;
    ctx.fillStyle = 'rgba(10,8,16,0.5)';
    ctx.fillRect(W - diffW - 52, 8, diffW, 5);
    ctx.fillStyle = '#c9832e';
    ctx.fillRect(W - diffW - 52, 8, Math.round(diffW * world.difficulty), 5);

    // красная вспышка при уроне
    if (this.#flash > 0) {
      ctx.fillStyle = 'rgba(176,48,39,' + (this.#flash * 0.9) + ')';
      ctx.fillRect(0, 0, W, CONFIG.HEIGHT);
    }

    // сообщение о новой локации
    if (this.#messageTimer > 0) {
      const t = this.#messageTimer;
      const alpha = clamp(t > 1.9 ? (2.2 - t) * 3 : Math.min(1, t), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(10,8,16,0.6)';
      ctx.fillRect(0, 70, W, 40);
      PixelFont.draw(ctx, this.#message, W / 2, 78, { align: 'center', scale: 3, color: '#f2e2b0', shadow: '#141220' });
      if (this.#messageSub) {
        PixelFont.draw(ctx, this.#messageSub, W / 2, 102, { align: 'center', color: '#c9832e', shadow: '#141220' });
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Нарисовать пиксельное сердечко жизни. */
  drawHeart(ctx, x, y) {
    ctx.fillStyle = '#5a1f1c';
    ctx.fillRect(x, y, 9, 8);
    ctx.fillStyle = '#b03027';
    ctx.fillRect(x + 1, y + 1, 3, 2);
    ctx.fillRect(x + 5, y + 1, 3, 2);
    ctx.fillRect(x + 1, y + 3, 7, 2);
    ctx.fillRect(x + 2, y + 5, 5, 1);
    ctx.fillRect(x + 3, y + 6, 3, 1);
  }
}
