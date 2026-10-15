/**
 * TouchControls — экранные кнопки паркура.
 *
 * Экран делится на «зоны» (правая половина — прыжок, левая нижняя
 * четверть — скольжение), плюс угловые кнопки паузы/звука.
 * Мультитач поддержан: у каждого палец — своя кнопка.
 */
class TouchControls {
  #releases = new Map(); // pointerId -> функция отпускания
  #heldJump = false;
  #heldSlide = false;
  #canvas;

  constructor(canvas, input) {
    this.#canvas = canvas;
    this.input = input;

    canvas.addEventListener('pointerdown', (e) => this.#down(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.#up(e));
    window.addEventListener('pointercancel', (e) => this.#up(e));
  }

  /** Преобразование координат события в логические пиксели канваса. */
  #toLogical(e) {
    const rect = this.#canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CONFIG.WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CONFIG.HEIGHT / rect.height),
    };
  }

  #down(e) {
    e.preventDefault();
    const p = this.#toLogical(e);
    const zone = PauseButton.hit(p.x, p.y);
    if (zone === 'pause') { events.emit('ui:pause'); return; }
    if (zone === 'mute') { events.emit('audio:toggle'); return; }

    let action = null;
    if (p.y > CONFIG.HEIGHT * 0.34 && p.x > CONFIG.WIDTH * 0.5) action = 'jump';
    else if (p.y > CONFIG.HEIGHT * 0.5 && p.x <= CONFIG.WIDTH * 0.5) action = 'slide';

    if (action) {
      const release = this.input.bindPointer(e.pointerId, action);
      this.#releases.set(e.pointerId, release);
      if (action === 'jump') this.#heldJump = true;
      if (action === 'slide') this.#heldSlide = true;
    }
  }

  #up(e) {
    const release = this.#releases.get(e.pointerId);
    if (release) {
      release();
      this.#releases.delete(e.pointerId);
      this.#heldJump = [...this.#releases.values()].length > 0 ? this.#heldJump : false;
      this.#heldSlide = false;
    }
  }

  draw(ctx) {
    const S = CONFIG.SCALE;
    // Прыжок — большая круглая кнопка справа
    this.#button(ctx, 274, 140, 26, 'JUMP', this.input.isDown('jump') || this.#heldJump, '#3fae4a');
    // Скольжение — слева
    this.#button(ctx, 46, 140, 26, 'SLIDE', this.input.isDown('slide') || this.#heldSlide, '#c9832e');
  }

  #button(ctx, cx, cy, r, label, active, color) {
    ctx.save();
    ctx.globalAlpha = active ? 0.85 : 0.42;
    ctx.fillStyle = active ? color : '#141220';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = active ? 1 : 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // стрелка
    ctx.fillStyle = '#f7f3e3';
    if (label === 'JUMP') {
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 2 - i, cy - 12 + i * 2, 4 + i * 2, 2);
    } else {
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 6 + i, cy - 8 + i * 2, 12 - i * 2, 2);
    }
    PixelFont.draw(ctx, label, cx, cy + 12, { align: 'center', color: '#f7f3e3', shadow: '#141220' });
    ctx.restore();
  }
}
