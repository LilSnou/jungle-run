/**
 * Фабрики (Factory Method) — централизованное создание сущностей.
 *
 * Генератор уровня описывает трассу данными («spawn: {type:'snake'}»),
 * а конкретный класс выбирается здесь. Чтобы добавить нового врага,
 * достаточно нового файла-класса и одной строки в switch —
 * открытость-закрытость (Open/Closed).
 */
class EnemyFactory {
  /** @returns {Enemy|null} */
  static create(type, x, opts = {}) {
    switch (type) {
      case 'snake': return new Snake(x);
      case 'jaguar': return new Jaguar(x);
      case 'bat': return new Bat(x, opts.alt || 19);
      case 'warrior': return new Warrior(x);
      case 'spear': return new Spear(x, opts.y || CONFIG.GROUND_Y - 12);
      default: return null;
    }
  }
}

class ObstacleFactory {
  /** @returns {Obstacle|null} */
  static create(type, x, opts = {}) {
    switch (type) {
      case 'spikes': return new Spikes(x, opts.w || 16);
      case 'log': return new LowLog(x);            // деревянное бревно (джунгли)
      case 'log2': return new LowLog(x, 'log2');   // каменный каток (храм)
      case 'vine': return new Vine(x);
      case 'rope': return new RopeTrap(x);
      case 'beam': return new StoneBeam(x);
      case 'statue': return new Statue(x);
      case 'pit': return new Pit(x, opts.w || 40);
      default: return null;
    }
  }
}

class ItemFactory {
  /** @returns {Item|null} */
  static create(type, x, y) {
    switch (type) {
      case 'idol': return new Idol(x, y);
      default: return null;
    }
  }
}
