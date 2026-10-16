#
# GroundObstacle — абстрактный базовый класс препятствий «на земле»
# (порт web Obstacle.js). Абстракция: база задаёт только общий контракт —
# урон при касании, отсутствие стомпа, базовые проверки — а конкретику
# (подвес, тело, провал, шипы) дают наследники.
class_name GroundObstacle
extends Entity


func damage_on_touch() -> bool:
	return true


func is_pit() -> bool:
	return false


func is_overhead() -> bool:
	return false


## Реакция на попадание игрока (по умолчанию — без эффекта:
## отклик даёт сам игрок: screen-shake и звук).
func on_hit(_player) -> void:
	pass
