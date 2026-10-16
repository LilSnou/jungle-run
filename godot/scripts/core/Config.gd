#
# Config — глобальная конфигурация игры (порт web/js/core/Config.js).
# Логическое разрешение: 320x180 (16:9, «восьмибитный» масштаб).
class_name Config
extends Object

const WIDTH := 320
const HEIGHT := 180
const GROUND_Y := 150            # уровень земли (верх травы)
const SCALE := 2                 # множитель пикселя спрайта (18px герой -> 36px на экране)

const GRAVITY := 1700.0          # px/с^2
const JUMP_VELOCITY := -390.0    # скорость прыжка (высота ~45px)
const DOUBLE_JUMP_FACTOR := 0.9
const STOMP_BOUNCE := -300.0

const RUN_START := 118.0         # начальная скорость, px/с
const RUN_MAX := 232.0           # максимальная скорость
const RUN_EASE := 1.7            # степень разгона к концу локации
const KNOCKBACK_TIME := 0.55     # замедление после урона

const COYOTE_TIME := 0.09        # «кайот-тайм» для прыжка с края
const JUMP_BUFFER := 0.10        # буфер нажатия перед приземлением

const START_LIVES := 3
const INVULN_TIME := 2.0         # неуязвимость после урона

const TRANSITION_EVERY := 550    # метров до смены локации
const IDOL_SCORE := 50
const STOMP_SCORE := 100

const GRAVITY_SCALE := 1.0

const START_X := 80.0            # стартовая позиция игрока по X
const PLAYER_SPEED_SCALE := 16.0 # метры = worldX / 16


## Ограничение значения диапазоном.
static func clampf_(v: float, mn: float, mx: float) -> float:
	return maxf(mn, minf(v, mx))


## Пересечение прямоугольников (AABB). rect = {x,y,w,h} или Rect2.
static func rects_overlap(a: Dictionary, b: Dictionary) -> bool:
	return a.x < b.x + b.w and a.x + a.w > b.x and a.y < b.y + b.h and a.y + a.h > b.y


## Детерминированный ГПСЧ (mulberry32) — для повторяемых «случайных» фонов.
static func make_random(seed_: int) -> Callable:
	var s := [seed_ & 0xFFFFFFFF]
	return func() -> float:
		s[0] = (s[0] + 0x6D2B79F5) & 0xFFFFFFFF
		var t: int = s[0]
		t = MathX.imul(t ^ (t >> 15), 1 | t)
		t = (t + MathX.imul(t ^ (t >> 7), 61 | t)) ^ t
		return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
