/**
 * Jungle Run — глобальная конфигурация.
 * Логическое разрешение канваса: 320x180 (16:9, «восьмибитный» масштаб).
 */
const CONFIG = {
  WIDTH: 320,
  HEIGHT: 180,
  GROUND_Y: 150,          // уровень земли (верх травы)
  SCALE: 2,               // множитель пикселя спрайта (18px герой -> 36px на экране)

  GRAVITY: 1700,          // px/с^2
  JUMP_VELOCITY: -390,    // скорость прыжка (высота ~45px)
  DOUBLE_JUMP_FACTOR: 0.9,
  STOMP_BOUNCE: -300,

  RUN_START: 118,         // начальная скорость, px/с
  RUN_MAX: 232,           // максимальная скорость
  RUN_EASE: 1.7,          // степень разгона к концу локации
  KNOCKBACK_TIME: 0.55,   // замедление после урона

  COYOTE_TIME: 0.09,      // «кайот-тайм» для прыжка с края
  JUMP_BUFFER: 0.10,      // буфер нажатия перед приземлением

  START_LIVES: 3,
  INVULN_TIME: 1.6,       // неуязвимость после урона

  TRANSITION_EVERY: 550,  // метров до смены локации
  IDOL_SCORE: 50,
  STOMP_SCORE: 100,

  GRAVITY_SCALE: 1.0,
};

/** Ограничение значения диапазоном. */
function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

/** Пересечение прямоугольников (AABB). */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Детерминированный ГПСЧ (mulberry32) — для повторяемых «случайных» фонов. */
function makeRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
