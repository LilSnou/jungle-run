#
# Bat — летучая мышь (порт web Bat.js): летит по синусоиде на высоте
# головы героя. НЕ побеждается прыжком сверху (летает) — от неё нужно
# уворачиваться: уйди приседом (скольжением) либо отпрыгни вовремя.
class_name Bat
extends Enemy

const DRIFT := 42.0    # px/с — сносит навстречу герою
const AMPLITUDE := 3.0 # px — лёгкое покачивание (крылья машут кадрами)

var _base_y := 0.0
var _phase := 0.0
var _amp := AMPLITUDE


## altitude — высота полёта над землёй (19 — на уровне головы героя).
func _init(ex: float, altitude := 19.0) -> void:
	_base_y = Config.GROUND_Y - altitude
	super(ex, _base_y, 13, 7)
	_phase = randf() * PI * 2.0
	# якорь: арт 14x8 центрируется по хитбоксу (13x7)
	make_sprite("bat", -0.5, -1.0, true)


func stompable() -> bool:
	return false  # сверху её не возьмёшь


func flies() -> bool:
	return true  # летает — спокойно проходит над ямами


func update(dt: float) -> void:
	tick(dt)
	x -= DRIFT * dt
	y = _base_y + sin(anim_time * 5.0 + _phase) * _amp
	sprite.frame = frame_by(0.12, 4)
	_kill_if_offscreen()
