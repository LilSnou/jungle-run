#
# Item — абстрактный базовый класс подбираемых предметов
# (золотые идолы, сердца). Поколебавшись в воздухе, они ждут героя.
class_name Item
extends Entity

var _phase := 0.0
var _base_y := 0.0
var _time := 0.0


func _init(ex := 0.0, ey := 0.0, ew := 8.0, eh := 8.0) -> void:
	super(ex, ey, ew, eh)
	_phase = randf() * PI * 2.0
	_base_y = ey


func collectible() -> bool:
	return true


var base_y: float:
	get:
		return _base_y


var time: float:
	get:
		return _time


## Поднять/опустить точку парения (используется генератором уровня).
func set_base_y(v: float) -> void:
	_base_y = v
	y = v


func update(dt: float) -> void:
	_time += dt
	y = _base_y + sin(_time * 3.0 + _phase) * 2.0


## Игрок подобрал предмет (каждый предмет решает сам, что делать).
func on_collect(_player) -> void:
	pass
