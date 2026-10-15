/**
 * Input — единый ввод (клавиатура + тач).
 *
 * Скруглённый интерфейс для остальной игры: остальной код не знает
 * ничего про клавиши или координаты касаний — только игровые действия
 * «jump», «slide», «pause» и их состояние в текущем кадре.
 *
 * Паттерн: «Быстрое решение» (Facade) поверх устройств ввода.
 */
class Input {
  #held = { jump: false, slide: false, pause: false };
  #pressed = new Set();
  #released = new Set();
  #pointers = new Map();      // pointerId -> действие (мультитач)
  #firstInteraction = false;

  constructor() {
    window.addEventListener('keydown', (e) => this.#onKey(e, true), { passive: false });
    window.addEventListener('keyup', (e) => this.#onKey(e, false));
  }

  #onKey(e, down) {
    const map = {
      Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyX: 'jump',
      ArrowDown: 'slide', KeyS: 'slide',
      Escape: 'pause', KeyP: 'pause',
    };
    const action = map[e.code];
    if (action) {
      e.preventDefault();
      down ? this.press(action) : this.release(action);
      this.#fire();
    }
    if (down && e.code === 'KeyM') events.emit('audio:toggle');
  }

  /** Первый жест — разблокируем Web Audio. */
  #fire() {
    if (!this.#firstInteraction) {
      this.#firstInteraction = true;
      AudioManager.instance.unlock();
      events.emit('input:first');
    }
  }

  /** Виртуальное нажатие (из TouchControls или клавиатуры). */
  press(action) {
    if (!this.#held[action]) {
      this.#held[action] = true;
      this.#pressed.add(action);
      this.#fire();
    }
  }

  /** Виртуальное отпускание. */
  release(action) {
    if (this.#held[action]) {
      this.#held[action] = false;
      this.#released.add(action);
    }
  }

  /** Кнопка удерживается. */
  isDown(action) { return !!this.#held[action]; }

  /** Кнопка была нажата в этом кадре. */
  wasPressed(action) { return this.#pressed.has(action); }

  /** Кнопка была отпущена в этом кадре. */
  wasReleased(action) { return this.#released.has(action); }

  /** Сброс «кадровых» событий — вызывается в конце кадра. */
  endFrame() {
    this.#pressed.clear();
    this.#released.clear();
  }

  /**
   * Мультитач: привязать указатель к действию на время касания.
   * Возвращает функцию, отпускающую действие (для pointerup/cancel).
   */
  bindPointer(pointerId, action) {
    this.press(action);
    this.#pointers.set(pointerId, action);
    return () => {
      if (this.#pointers.get(pointerId) === action) {
        this.#pointers.delete(pointerId);
        this.release(action);
      }
    };
  }
}
