/**
 * TouchControls — невидимые тач-зоны управления (паттерн Facade).
 *
 * Кнопки на экране НЕ рисуются: управление на десктопе — клавиатурой,
 * на сенсорных устройствах — тапами по зонам (правая половина — прыжок,
 * левая нижняя четверть — скольжение). Мультитач поддержан:
 * у каждого пальца своя зона.
 */
class TouchControls {
  #releases = new Map(); // pointerId -> функция отпускания
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

    // невидимые зоны: правая половина — прыжок, левый низ — скольжение
    let action = null;
    if (p.y > CONFIG.HEIGHT * 0.34 && p.x > CONFIG.WIDTH * 0.5) action = 'jump';
    else if (p.y > CONFIG.HEIGHT * 0.5 && p.x <= CONFIG.WIDTH * 0.5) action = 'slide';

    if (action) {
      const release = this.input.bindPointer(e.pointerId, action);
      this.#releases.set(e.pointerId, release);
    }
  }

  #up(e) {
    const release = this.#releases.get(e.pointerId);
    if (release) {
      release();
      this.#releases.delete(e.pointerId);
    }
  }
}
