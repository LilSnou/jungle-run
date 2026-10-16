#
# StoneBeam — упавшая каменная балка колонны в храме майя. Подвешена
# на цепях к потолку (как в web): проскальзывай или получай урон.
class_name StoneBeam
extends Overhead


func _init(ex: float) -> void:
	super(ex, Config.GROUND_Y - 18.0, 24.0, 8.0)
	# арт 48x16 (масштаб 0.5) = 24x8 logical
	make_sprite("stonebeam", 0, 1, false, 0.5)
	_rope = Color.html("#565b63")
	_chain = true
