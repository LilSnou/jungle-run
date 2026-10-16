#
# Statue — каменный тотем майя 12x30 logical (арт 24x60, масштаб 0.5):
# хитбокс равен визуалу, основание утоплено на 2px в траву.
# Под статуей World держит свободную зону 26 logical до и после —
# никакие другие препятствия там не появляются.
class_name Statue
extends GroundObstacle


func _init(ex: float) -> void:
	super(ex, Config.GROUND_Y - 28.0, 12.0, 30.0)
	make_sprite("statue", 0, 0, false, 0.5)
