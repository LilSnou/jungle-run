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


func damage_on_touch() -> bool:
	return true


func stompable() -> bool:
	return not _stomped


var anim_time: float:
	get:
		return _anim_time


## Игрок прыгнул на голову: враг побеждён.
func on_stomp(_player) -> void:
	_stomped = true
	_flash = 0.12
	world.spawn_particles(x + w / 2.0, y + h / 2.0, Color.html("#f2e2b0"), 8, -80.0)
	EventBus.emit("enemy:stomped", {"enemy": self})


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
