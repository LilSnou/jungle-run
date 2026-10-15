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
    // --- игрок: 16x18, контент в строках 1..17 (низ рисунка = низ хитбокса) ---
    player_run_0: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......ss.......',
      '.....EEEEEE.....',
      '....JJWWLJJj....',
      '...sJJWWLJJjs...',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '....PP...pP.....',
      '...PP.....pP....',
      '..OO......OO....',
    ],
    player_run_1: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......ss.......',
      '.....EEEEEE.....',
      '....JJWWLJJj....',
      '....JJWWLJJjs...',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '.....PPPPPP.....',
      '......pPPp......',
      '......OOOO......',
    ],
    player_run_2: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......ss.......',
      '.....EEEEEE.....',
      '....JJWWLJJj....',
      '...sJJWWLJJj....',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '.....pP...PP....',
      '....pP.....PP...',
      '....OO......OO..',
    ],
    player_run_3: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......ss.......',
      '.....EEEEEE.....',
      '....JJWWLJJj....',
      '...sJJWWLJJjs...',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '....PP..PP......',
      '...pP....pP.....',
      '..OO.....OO.....',
    ],
    player_jump: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......ss.......',
      '.....EEEEEE.....',
      '..s.JJWWLJJjs...',
      '....JJWWLJJj....',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '....pP...PP.....',
      '...pP.....PP....',
      '..OO......OO....',
    ],
    // скольжение: контент в строках 7..17 (низ = низ хитбокса при приседе)
    player_slide: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..........RRRR..',
      '.........BBBBB..',
      '........rrrrrr..',
      '..........sSSK..',
      '.........EEsss..',
      '...wJJJJWWLLj...',
      '..w.JJJJWWLLj...',
      '....PPPPPPPP....',
      '...pPPPPPPPPp...',
      '..pPPPPPPPPPP...',
      '.OOOPPPPPPPPP...',
    ],
    player_hurt: [
      '................',
      '.....RRRRRR.....',
      '.....RRRRRR.....',
      '....BBBBBB......',
      '...rrrrrrrrrr...',
      '......SSSS......',
      '.....BSSSKS.....',
      '......sSSSs.....',
      '.......KK.......',
      '.....EEEEEE.....',
      '..s.JJWWLJJjs...',
      '....JJWWLJJj....',
      '....JJWWLJJj....',
      '....BBBBLBBB....',
      '.....PPPPPP.....',
      '....pP...pP.....',
      '...pP.....pP....',
      '..OO.......OO...',
    ],
    // --- змея-кобра: 14x14, контент 1..13 (низ = земля) ---
    snake_0: [
      '..............',
      '......GGGG....',
      '.....GGKGGG.E.',
      '....gGGGGGG.E.',
      '...gGGwGGwGGg.',
      '..gGGGGGGGGGGg',
      '..gGwGGGGwGGg.',
      '..gGGGGGGGGGGg',
      '...gGGwGGwGGg.',
      '....gGGGGGGg..',
      '.....gGGGg....',
      '....GGGGGG....',
      '...GwGGGGwG...',
      '..gGGGGGGGGg..',
    ],
    snake_1: [
      '..............',
      '......GGGG....',
      '.....GGKGG....',
      '....gGGGGGG...',
      '...gGGwGGwGGg.',
      '..gGGGGGGGGGGg',
      '..gGwGGGGwGGg.',
      '..gGGGGGGGGGGg',
      '...gGGwGGwGGg.',
      '....gGGGGGGg..',
      '.....gGGGg....',
      '....GGGGGG....',
      '...GwGGGGwG...',
      '..gGGGGGGGGg..',
    ],
    // --- ягуар: 16x14, контент 1..13, хвост слева, морда справа ---
    jaguar_0: [
      '................',
      'Y............KK.',
      'YY.........KYYYK',
      'YY.........KYKYK',
      '.YY........KYYK.',
      '..YYYYYYYYYYY...',
      '..YYKKYYYKKYYY..',
      '..YYYYYYYYYYYY..',
      '...YYYYKKYYYY...',
      '...YYYYYYYYYY...',
      '...YY.YYYY.YY...',
      '...YY.YYYY.YY...',
      '...yy.YYYY.yy...',
      '...OO.OOOO.OO...',
    ],
    jaguar_1: [
      '................',
      'Y............KK.',
      'YY.........KYYYK',
      'YY.........KYKYK',
      '.YY........KYYK.',
      '..YYYYYYYYYYY...',
      '..YYKKYYYKKYYY..',
      '..YYYYYYYYYYYY..',
      '...YYYYKKYYYY...',
      '...YYYYYYYYYY...',
      '.....YYYYYY.....',
      '.....YY..YY.....',
      '.....yy..yy.....',
      '.....OO..OO.....',
    ],
    // --- летучая мышь: 14x8, контент 1..6 ---
    bat_0: [
      '..............',
      '..DD......DD..',
      '.DDDDDKKDDDDD.',
      'DDDDDDKKDDDDDD',
      'DDDDDDDDDDDDDD',
      '.DDDDDWWDDDDD.',
      '..DDDD..DDDD..',
      '..............',
    ],
    bat_1: [
      '..............',
      '..............',
      '.DDDDDKKDDDDD.',
      'DDDDDDKKDDDDDD',
      'DDDDDDDDDDDDDD',
      '.DDDDDWWDDDDD.',
      'DDDD..DD..DDDD',
      '..............',
    ],
    // --- воин: 16x15, контент 0..14 (диадема из перьев до ступней) ---
    warrior_0: [
      '...E..E..E..E...',
      '....EEEEEEEE....',
      '.....AAAAAA.....',
      '.....AKAAKA.....',
      '.....AAAAAA.....',
      '.....E....E.....',
      '......aaaa......',
      '....LLLLLLLL....',
      '...aAAAAAAAAa...',
      '....AAALLLAA....',
      '....AAAAAAAA....',
      '....GGGGGGGG....',
      '.....GPPPPG.....',
      '.....PP..PP.....',
      '....OO....OO....',
    ],
    warrior_1: [
      '....E..E..E.....',
      '....EEEEEEEE....',
      '.....AAAAAA.....',
      '.....AKAAKA.....',
      '.....AAAAAA.....',
      '.....E....E.....',
      '......aaaa......',
      '....LLLLLLLL....',
      '....aAAAAAAa....',
      '....AAALLLAA....',
      '....AAAAAAAA....',
      '....GGGGGGGG....',
      '.....GPPPPG.....',
      '......PPPP......',
      '.....OO..OO.....',
    ],
    heart: [
      '.EE..EE.',
      'EEEEEEEE',
      'WEEEEEEE',
      'WEEEEEEE',
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
