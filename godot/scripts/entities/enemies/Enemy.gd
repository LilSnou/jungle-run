#
# Enemy — абстрактный базовый класс врагов (порт web Enemy.js).
#
# Наследует Entity; конкретные враги (змея, ягуар, летучая мышь, воин)
# наследуют этот класс и реализуют собственные update() —
# пример полиморфизма: World вызывает их «не зная» кто это.
class_name Enemy
extends Entity

var _anim_time := 0.0
var _stomped := false
var _flash := 0.0
var _falling := false
var _fall_vy := 0.0


func damage_on_touch() -> bool:
	return not _falling


func stompable() -> bool:
	return not _stomped and not _falling


## Летает ли враг (летучие мыши спокойно летают над ямами).
func flies() -> bool:
	return false


var anim_time: float:
	get:
		return _anim_time


var falling: bool:
	get:
		return _falling


## Игрок прыгнул на голову: враг побеждён (исчезает с искрами).
func on_stomp(_player) -> void:
	_stomped = true
	_flash = 0.12
	world.spawn_particles(x + w / 2.0, y + h / 2.0, Color.html("#f2e2b0"), 8, -80.0)
	EventBus.emit("enemy:stomped", {"enemy": self})
	kill() # победа «в прыжке» — враг умирает и исчезает


## Игрок коснулся сбоку: враг «уходит», игрок получает урон (World решает).
func on_hit(_player) -> void:
	pass  # по умолчанию враг выживает


## Тик анимации для потомков.
func tick(dt: float) -> void:
	_anim_time += dt


## Кадр по прошедшему времени: переключение раз в `interval` секунд.
func frame_by(interval: float, count: int) -> int:
	return int(floor(_anim_time / interval)) % count


## Убить, если ушёл за левый край камеры.
func _kill_if_offscreen() -> void:
	if x < world.camera.x - 40:
		kill()


## Наземные враги у края ямы проваливаются в неё: начинают падать,
## теряют способность наносить урон и исчезают в бездне.
## Возвращает true, пока враг падает (потомки прерывают update).
func fall_if_no_ground(dt: float) -> bool:
	if _falling:
		_fall_vy += Config.GRAVITY * dt
		y += _fall_vy * dt
		if y > Config.GROUND_Y + 80.0:
			kill()
		return true
	if world != null and not world.is_ground_at(x + w * 0.5):
		_falling = true
		_fall_vy = 0.0
	return false
