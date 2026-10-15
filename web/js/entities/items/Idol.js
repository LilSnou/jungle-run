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
    const S = CONFIG.SCALE;
    const t = this.time * 3.2 + this.phase;
    const squeeze = Math.abs(Math.cos(t));          // «вращение» монетки
    const r = this.w * S * 0.5;                     // радиус = половина ширины
    const cx = Math.round(this.x - cam.x) + r;
    const cy = Math.round(this.y - cam.y) + r;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.06, squeeze), 1);

    // тёмный контур
    ctx.fillStyle = '#8f6f14';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // золотое тело
    ctx.fillStyle = '#e8b825';
    ctx.beginPath();
    ctx.arc(0, 0, r - S, 0, Math.PI * 2);
    ctx.fill();
    // внутренний кольцевой узор
    ctx.strokeStyle = '#f5d858';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2 * S, 0, Math.PI * 2);
    ctx.stroke();

    // «лицо» майя в центре: глаза и рот
    if (squeeze > 0.45) {
      ctx.fillStyle = '#8f6f14';
      ctx.fillRect(-S, -S, S, S);
      ctx.fillRect(S, -S, S, S);
      ctx.fillRect(-S, S, 2 * S, S);
    }
    // блик
    ctx.fillStyle = '#fff7c8';
    ctx.fillRect(-r + S, -r + 2 * S, S, 2 * S);

    ctx.restore();

    // искры при «фронтальном» положении
    if (squeeze > 0.92) {
      ctx.fillStyle = '#fff4c2';
      ctx.fillRect(cx + r - S, cy - r, S, S);
    }
  }
}
