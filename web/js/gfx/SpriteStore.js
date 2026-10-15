/**
 * SpriteStore — «фабрика спрайтов» (Factory Method).
 *
 * Пиксель-арт описан декларативно: строки-карты + палитра.
 * Из карт строятся офскрин-канвасы (кэшируются) — рисовать их
 * дёшево, а выглядят они как настоящие 8-битные спрайты.
 */
class SpriteStore {
  static PALETTE = {
    'K': '#141220', // контур
    'R': '#7b4a24', // федора (тень)
    'r': '#a06a35', // федора (свет)
    'B': '#3b2513', // лента федоры
    'S': '#f0b98a', // кожа
    's': '#cf8f63', // кожа (тень)
    'J': '#8a4b23', // кожаная куртка
    'j': '#6b3717', // куртка (тень)
    'W': '#efe3c8', // рубашка
    'P': '#5c4433', // брюки
    'p': '#46331f', // брюки (тень)
    'O': '#241a10', // ботинки
    'L': '#c9a227', // золото
    'l': '#8f6f14', // золото (тень)
    'w': '#d9b382', // плеть
    'G': '#3fae4a', // зелёный (змея, юбка)
    'g': '#2b7d35',
    'Y': '#d9c534', // ягуар
    'y': '#a8921f',
    'E': '#b03027', // красный (глаза, перья)
    'V': '#8d8f9c', // камень
    'v': '#5c5e6b',
    'D': '#4a3b6b', // летучая мышь
    'A': '#c98a5a', // тон кожи воина
    'a': '#96613a',
  };

  /** Именованные карты спрайтов. Строки короче 16 дополняются «.» автоматически. */
  static MAPS = {
    player_run_0: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '.....SSSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '....JJWWJJ......',
      '....JJWWJJ..w...',
      '....JJWWjj..w...',
      '.....LLLL...w...',
      '.....PPPP.......',
      '....PP..PP......',
      '...PP....PP.....',
      '...OO....OO.....',
      '...OO....OO.....',
      '................',
    ],
    player_run_1: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '.....SSSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '....JJWWJJ......',
      '....JJWWJJw.....',
      '....JJWWjjw.....',
      '.....LLLL.......',
      '.....PPPP.......',
      '.....PPPP.......',
      '......OOOO......',
      '......OOOO......',
      '................',
      '................',
    ],
    player_run_2: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '.....SSSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '....JJWWJJ......',
      '...wJJWWJJ......',
      '...wJJWWjj......',
      '...w.LLLL.......',
      '.....PPPP.......',
      '.....PP..PP.....',
      '.....PP....PP...',
      '.....OO....OO...',
      '.....OO....OO...',
      '................',
    ],
    player_run_3: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '.....SSSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '....JJWWJJ..w...',
      '....JJWWJJ..w...',
      '....JJWWjj......',
      '.....LLLL.......',
      '.....PPPP.......',
      '......PPPP......',
      '......OOOO......',
      '.....OOOO.......',
      '................',
      '................',
    ],
    player_jump: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '.....SSSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '...w.JJWWJJ.....',
      '...w.JJWWjj.....',
      '.....JJWWJJ.....',
      '.....LLLL.......',
      '.....PPPP.......',
      '....PPPPPP......',
      '...PP....PP.....',
      '...OO....OO.....',
      '...OO....OO.....',
      '................',
    ],
    player_slide: [
      '................',
      '................',
      '................',
      '......RRRRRR....',
      '.....RRBBBBRR...',
      '.....rrrrrrrr...',
      '......SSSSSS....',
      '..w...SSSSKS....',
      '..w..JJJJSS.....',
      '..w.JJJJJJPP....',
      '.....OOJJJPP....',
      '.....OO...PP....',
      '.....OO...OO....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    player_hurt: [
      '................',
      '................',
      '.....RRRRRR.....',
      '....RRBBBBRR....',
      '....rrrrrrrr....',
      '......SSSSS.....',
      '.....SSSSKS.....',
      '......SSSS......',
      '....JJWWJJ......',
      '...wJJWWjj......',
      '...wJJWWjj......',
      '.....LLLL.......',
      '.....PPPP.......',
      '....PPppPP......',
      '....PP..PP......',
      '...OO....OO.....',
      '...OO....OO.....',
      '................',
    ],
    snake_0: [
      '..............',
      '..............',
      '..............',
      '..........GEG.',
      '....GGGGGGGGGG',
      '..GGGGGGGGGGGG',
      '...ggGGGGGGGG.',
      '..............',
    ],
    snake_1: [
      '..............',
      '..............',
      '..............',
      '..........GEG.',
      '..GGGGGGGGGGGG',
      '....GGGGGGGGGG',
      '.....ggGGGGGG.',
      '..............',
    ],
    jaguar_0: [
      '................',
      '............KK..',
      '...........KYYK.',
      '..YYYYYYYYYYYYK.',
      '.YYYYYYYYEYYYYY.',
      '.YyYYYYYYYYYYYY.',
      '.yy.yyYYYYYYYY..',
      '....yy....yy....',
      '....yy....yy....',
      '................',
    ],
    jaguar_1: [
      '................',
      '............KK..',
      '...........KYYK.',
      '..YYYYYYYYYYYYK.',
      '.YYYYYYYYEYYYYY.',
      '.YyYYYYYYYYYYYY.',
      '.yy...yyyy.yy...',
      '......yy....yy..',
      '.....yy.....yy..',
      '................',
    ],
    bat_0: [
      '..............',
      '.KK........KK.',
      'KDDK......KDDK',
      'KDDDKKKKKKDDDK',
      '.KDDKEEKKDDDK.',
      '...KKKKKKKK...',
      '......KK......',
      '..............',
    ],
    bat_1: [
      '..............',
      '..............',
      '.....KKKK.....',
      '.KKKKDDDDKKKK.',
      'KDDKDEEEDKDDK.',
      'KDDKKKKKKKDDK.',
      '.KK........KK.',
      '..............',
    ],
    warrior_0: [
      '................',
      '..E.E.E........',
      '..EEEEE........',
      '...AAA..........',
      '..AAKAA.........',
      '...AAA..........',
      '..AAAAAA........',
      '..AAALAA........',
      '..AAAAAA........',
      '...GGGG.........',
      '..GGGGGG........',
      '...GGGG.........',
      '...AA..AA.......',
      '...AA..AA.......',
      '...aa..aa.......',
      '................',
    ],
    warrior_1: [
      '................',
      '................',
      '..EEEEE........',
      '...EEE..........',
      '...AAA..........',
      '..AAKAA.........',
      '...AAA..........',
      '..AAAAAA........',
      '..AAALAA........',
      '..AAAAAA........',
      '...GGGG.........',
      '..GGGGGG........',
      '...GGGG.........',
      '....AAAA........',
      '....aa.aa.......',
      '................',
    ],
    idol: [
      '..LLLL..',
      '.LllllL.',
      '.LllllL.',
      '.LlKKlL.',
      '..LLLL..',
      '.LllllL.',
      'Ll.LL.lL',
      '.L....L.',
    ],
    heart: [
      '.EE..EE.',
      'EEEEEEEE',
      'EEEEEEEE',
      'EEEEEEEE',
      '.EEEEEE.',
      '..EEEE..',
      '...EE...',
      '........',
    ],
  };

  static #cache = new Map();

  /** Построить канвас из карты. */
  static #build(rows) {
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const color = SpriteStore.PALETTE[row[x]];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return cv;
  }

  /** Получить канвас по имени (с кэшированием). */
  static get(name) {
    if (!SpriteStore.#cache.has(name)) {
      const rows = SpriteStore.MAPS[name];
      if (!rows) throw new Error('Нет спрайта: ' + name);
      SpriteStore.#cache.set(name, SpriteStore.#build(rows));
    }
    return SpriteStore.#cache.get(name);
  }

  /**
   * Зеркальная версия (враги смотрят «на себя» — влево).
   * Паттерн «Декоратор»: оборачивает канвас, не меняя оригинал.
   */
  static getFlipped(name) {
    const key = name + '#flip';
    if (!SpriteStore.#cache.has(key)) {
      const src = SpriteStore.get(name);
      const cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const ctx = cv.getContext('2d');
      ctx.translate(src.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0);
      SpriteStore.#cache.set(key, cv);
    }
    return SpriteStore.#cache.get(key);
  }
}
