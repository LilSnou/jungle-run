#
# Overhead — базовый класс «подвешенных» препятствий: брёвна, жгуты лиан,
# каменные балки, верёвки. Висят над землёй (под ними можно проскользнуть,
# а прыжок врезается), слегка покачиваются и тянутся канатами к кроне/
# потолку за верхней границей экрана — как в web-версии.
class_name Overhead
extends GroundObstacle

const SWAY := 0.8     # амплитуда покачивания, logical px
const HANG_TO := -2.0 # линии подвеса идут к самому верху экрана

var _sway_t := 0.0
var _rope := Color.html("#d9b382")
var _chain := false   # цепь со «звеньями» вместо гладкого каната
var _chain_light := Color.html("#8d8f9c")


func _init(ex := 0.0, ey := 0.0, ew := 24.0, eh := 9.0) -> void:
	super(ex, ey, ew, eh)
	_sway_t = ex * 0.07  # у каждой пары — своя фаза покачивания


func is_overhead() -> bool:
	return true


## Хитбокс чуть уже рисунка (как в web): край арта не «бьёт» зря.
func hitbox() -> Dictionary:
	return {"x": x, "y": y + 1.0, "w": w, "h": h - 2.0}


func update(dt: float) -> void:
	_sway_t += dt
	_sprite_ax = SWAY * sin(_sway_t * 1.7)


## Канаты/цепи от верха экрана до верха спрайта.
func _draw() -> void:
	var ytop := HANG_TO - y     # локально: верх экрана
	var bottom := 1.0            # верх спрайта (art ay = +1)
	if bottom <= ytop:
		return
	var rope_len := bottom - ytop
	for lx in [2.0, w - 3.0]:
		draw_rect(Rect2(lx, ytop, 1.0, rope_len), _rope)
		if _chain:
			var yy := ytop
			while yy < bottom:
				draw_rect(Rect2(lx, yy + 1.0, 1.0, 2.0), _chain_light)
				yy += 4.0
