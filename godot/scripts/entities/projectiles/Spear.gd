#
# Spear — копьё, брошенное воином (порт web Spear.js). Летит горизонтально
# на уровне пояса: его нужно перепрыгнуть. Пример снаряда (полиморфный
# «обычный враг» — тот же контракт damage_on_touch, но своё поведение).
class_name Spear
extends Enemy

const SPEED := 210.0  # px/с


func _init(ex: float, ey: float) -> void:
	super(ex, ey - 2.0, 12, 4)
	# арт 12x4 = хитбокс 12x4 (1:1)
	make_sprite("spear", 0, 0, false)


func stompable() -> bool:
	return false


func update(dt: float) -> void:
	tick(dt)
	x -= SPEED * dt
	if x < world.camera.x - 20:
		kill()
