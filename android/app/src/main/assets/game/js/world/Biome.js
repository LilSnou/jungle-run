/**
 * Biome — абстрактный базовый класс локаций (джунгли, деревня, храм).
 *
 * Каждый биом инкапсулирует:
 *  • палитру (небо, земля),
 *  • процедурный параллакс-фон (свои силуэты),
 *  • таблицу «паттернов» препятствий/врагов для генератора уровней,
 *  • название и музыкальный трек.
 *
 * Абстракция + полиморфизм: World вызывает drawBackground()/getPattern(),
 * не зная, какая именно локация рисуется.
 */
class Biome {
  constructor(seed = 1) {
    this.rng = makeRandom(seed);
    this.time = 0;
  }

  /** Название локации для HUD. */
  get name() { return 'BIOME'; }
  /** Музыкальный трек. */
  get track() { return 'jungle'; }
  /** Цвет неба сверху/снизу. */
  get skyTop() { return '#000'; }
  get skyBottom() { return '#000'; }
  /** Палитра земли: трава/камень, грунт, тени. */
  get groundTop() { return '#000'; }
  get groundDirt() { return '#000'; }
  get groundShade() { return '#000'; }
  get groundLine() { return '#000'; }

  /** Сообщение при входе в биом. */
  get message() { return this.name; }

  /** Фон (дальний план) — абстрактно. */
  drawBackground(ctx, cam) { /* абстрактно */ }

  /** Передний план поверх земли/сущностей — по умолчанию пусто. */
  drawForeground(ctx, cam) { /* опционально */ }

  /** Тик времени для анимаций фона. */
  tick(dt) { this.time += dt; }

  /**
   * Паттерн генерации следующего «участка» трассы.
   * @param {number} difficulty 0..1 — растёт с расстоянием
   * @returns {{length:number, spawns:Array, items:Array}}
   */
  getPattern(difficulty) { /* абстрактно */ return { length: 120, spawns: [], items: [] }; }

  /** Универсальный помощник: выбрать объект из таблицы с весами. */
  static weightedPick(rng, table) {
    let total = 0;
    for (const e of table) total += e.weight;
    let r = rng() * total;
    for (const e of table) {
      r -= e.weight;
      if (r <= 0) return e.value;
    }
    return table[table.length - 1].value;
  }

  /** Ряд золотых идолов дугой (награда за рискованный прыжок). */
  static idolArc(x0, count, alt = 42, gap = 12) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const lift = count > 1 ? Math.sin((i / (count - 1)) * Math.PI) * 10 : 0;
      items.push({ type: 'idol', at: x0 + i * gap, alt: alt + lift });
    }
    return items;
  }

  /**
   * Параллакс-слой с бесшовным повтором: baseItems описаны внутри
   * периода `period`, а drawFn рисует каждый элемент на экране.
   */
  static parallax(ctx, cam, factor, period, baseItems, drawFn) {
    const off = (cam.x * factor) % period;
    for (const it of baseItems) {
      let x = it.x - off;
      if (x < 0) x += period;
      for (let rep = -1; rep <= 1; rep++) {
        const sx = x + rep * period;
        if (sx > -140 && sx < CONFIG.WIDTH + 140) drawFn(ctx, Math.round(sx), it);
      }
    }
  }
}
