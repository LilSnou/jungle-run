/**
 * Idol — золотая статуэтка майя: очки и «ветка» атмосферы
 * Индианы Джонса. Вращается (спрайт «сжимается» по горизонтали).
 */
class Idol extends Item {
  constructor(x, y) {
    super(x, y, 8, 8);
  }

  onCollect(player) {
    events.emit('idol:collected', { idol: this });
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    const sprite = SpriteStore.get('idol');
    const t = this.time * 4 + this.phase;
    const squeeze = Math.abs(Math.cos(t));
    const w = Math.max(1, Math.round(sprite.width * squeeze)) * S;
    const x = Math.round(this.x - cam.x + (this.w * S - w) / 2);
    const y = Math.round(this.y - cam.y);
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, w, sprite.height * S);

    // искры золота
    if (squeeze > 0.85) {
      ctx.fillStyle = '#fff4c2';
      ctx.fillRect(x + w - S, y, S, S);
    }
  }
}
