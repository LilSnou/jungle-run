/**
 * EventBus — паттерн «Наблюдатель» (Observer).
 * Все части игры общаются через события, не зная друг о друге напрямую:
 * игрок не знает про HUD; HUD подписывается на событие 'score:changed'.
 *
 * Инкапсуляция: слушатели скрыты за приватным полем.
 */
class EventBus {
  #listeners = new Map();

  /** Подписка на событие. */
  on(type, fn) {
    if (!this.#listeners.has(type)) this.#listeners.set(type, []);
    this.#listeners.get(type).push(fn);
    return this;
  }

  /** Отписка. */
  off(type, fn) {
    const list = this.#listeners.get(type);
    if (list) {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    }
    return this;
  }

  /** Рассылка события всем подписчикам. */
  emit(type, payload) {
    const list = this.#listeners.get(type);
    if (list) for (const fn of list.slice()) fn(payload);
  }

  /** Полная очистка (при рестарте). */
  clear() { this.#listeners.clear(); }
}

/** Глобальная шина событий игры. */
const events = new EventBus();
