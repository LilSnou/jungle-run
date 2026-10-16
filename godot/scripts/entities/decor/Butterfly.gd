#
# Butterfly — бабочка-декор джунглей: треплется на месте и покачивается.
# Летает на заданной высоте (alt над землёй); мир уносит её влево вместе
# с прокруткой. Спавнится из паттернов биома (только джунгли).
class_name Butterfly
extends Decor

var _base_y := 0.0
var _phase := 0.0


func _init(ex: float, alt := 80.0) -> void:
	super("decor_butterfly", ex, float(Config.GROUND_Y) - alt)
	_base_y = y
	_phase = ex * 0.013
	_fps = 7.0


func update(dt: float) -> void:
	super(dt)
	# лёгкое парение по вертикали (округление — пиксели не «плывут»)
	y = roundf(_base_y + sin(_t * 2.4 + _phase) * 4.0)
