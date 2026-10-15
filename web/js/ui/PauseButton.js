/**
 * PauseButton — кнопка паузы и динамика в правом верхнем углу.
 * Зоны касаний инкапсулированы здесь; HUD рисуется отдельно.
 */
class PauseButton {
  static ZONES = {
    pause: { x: CONFIG.WIDTH - 46, y: 4, w: 20, h: 20 },
    mute: { x: CONFIG.WIDTH - 22, y: 4, w: 18, h: 20 },
  };

  /** @returns {'pause'|'mute'|null} какая зона попала под палец. */
  static hit(x, y) {
    for (const [name, z] of Object.entries(PauseButton.ZONES)) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return name;
    }
    return null;
  }

  static draw(ctx, paused, muted) {
    const p = PauseButton.ZONES.pause;
    // подложка
    ctx.fillStyle = 'rgba(10,8,16,0.55)';
    ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    ctx.fillStyle = '#f2e2b0';
    if (paused) {
      // треугольник «play»
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(p.x + 7, p.y + 4 + i * 2, 2 + i * 2, 2);
      }
    } else {
      // две полоски «pause»
      ctx.fillRect(p.x + 5, p.y + 4, 4, 12);
      ctx.fillRect(p.x + 12, p.y + 4, 4, 12);
    }

    const m = PauseButton.ZONES.mute;
    ctx.fillStyle = 'rgba(10,8,16,0.55)';
    ctx.fillRect(m.x - 2, m.y - 2, m.w + 4, m.h + 4);
    ctx.fillStyle = muted ? '#8a8494' : '#f2e2b0';
    // динамик
    ctx.fillRect(m.x + 3, m.y + 8, 3, 4);
    ctx.fillRect(m.x + 6, m.y + 6, 2, 8);
    if (muted) {
      // перечёркнут
      ctx.fillRect(m.x + 10, m.y + 6, 2, 2);
      ctx.fillRect(m.x + 12, m.y + 8, 2, 2);
      ctx.fillRect(m.x + 10, m.y + 10, 2, 2);
      ctx.fillRect(m.x + 8, m.y + 12, 2, 2);
    } else {
      // волны
      ctx.fillRect(m.x + 10, m.y + 6, 2, 6);
      ctx.fillRect(m.x + 13, m.y + 4, 2, 10);
    }
  }
}
