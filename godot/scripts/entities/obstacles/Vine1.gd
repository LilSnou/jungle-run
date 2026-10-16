#
# Vine1 — жгут из лиан с листьями-масками (джунгли): живой подвес,
# покачивается сильнее брёвен. Порт web Vine.
class_name Vine1
extends Overhead


func _init(ex: float) -> void:
	super(ex, Config.GROUND_Y - 18.0, 24.0, 9.0)
	make_sprite("vine1", 0, 1, false, 0.5)
	_rope = Color.html("#3f7a3a")
