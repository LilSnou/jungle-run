#
# Decor — статичный декор локации (грибы, папоротники, черепа, руны):
# лежит в отдельном списке мира и НЕ участвует в столкновениях —
# чистая «оживляшка» земли. Наследует Entity (тот же контракт
# update/sync_transform), но урон не наносит по построению.
class_name Decor
extends Entity

const SCALE_ART := 0.5  # арт «вдвое детальнее» мира — рисуем в половину

var _tex_name := ""
var _frames := 1
var _fps := 0.0
var _t := 0.0


func _init(tex_name: String, ex: float, ey: float) -> void:
	super(ex, ey, 0.0, 0.0)
	_tex_name = tex_name
	var c: Array = Art.cell(tex_name)
	w = float(c[0]) * SCALE_ART
	h = float(c[1]) * SCALE_ART
	_frames = maxi(1, int(c[2]))
	make_sprite(tex_name, 0, 0, false, SCALE_ART)


func update(dt: float) -> void:
	_t += dt
	if sprite != null and _frames > 1 and _fps > 0.0:
		sprite.frame = int(_t * _fps) % _frames
