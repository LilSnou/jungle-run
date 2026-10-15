/**
 * Heart — сердечко: возвращает одно сердце жизни (если оно потеряно).
 */
class Heart extends Item {
  constructor(x, y) {
    super(x, y, 8, 8);
  }

  onCollect(player) {
    if (player.heal()) events.emit('heart:collected', { heart: this });
    else events.emit('idol:collected', { idol: this, silent: true }); // жизнь полна — очки утешением
  }

  draw(ctx, cam) {
    const S = CONFIG.SCALE;
    // лёгкое мерцание
    ctx.globalAlpha = 0.85 + Math.sin(this.time * 6) * 0.15;
    this.drawSprite(ctx, cam, 'heart', 0, 0, false);
    ctx.globalAlpha = 1;
  }
}
