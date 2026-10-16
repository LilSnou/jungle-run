/**
 * Idol — золотая монетка майя: очки и «ветка» атмосферы Индианы Джонса.
 * Монетка круглая, рисуется процедурно (дугами) и «вращается»,
 * сжимаясь по горизонтали, как в классических раннерах.
 */
class Idol extends Item {
  constructor(x, y) {
    super(x, y, 8, 8);
  }

  onCollect(player) {
    events.emit('idol:collected', { idol: this });
  }

  draw(ctx, cam) {
    const t = this.time * 3.2 + this.phase;
    const squeeze = Math.abs(Math.cos(t));          // «вращение» монетки
    // кадры арта idol_0..2 по фазе сжатия (как в Godot Idol)
    const frame = squeeze > 0.85 ? 0 : (squeeze > 0.55 ? 1 : 2);
    this.drawSprite(ctx, cam, 'idol_' + frame, 0, 0, false);

    // искры при «фронтальном» положении (локальные 7,-1 как в Godot)
    if (squeeze > 0.92) {
      ctx.fillStyle = '#fff4c2';
      ctx.fillRect(
        Math.round(this.x + 7 - cam.x),
        Math.round(this.y - 1 - cam.y),
        1, 1,
      );
    }
  }
}
