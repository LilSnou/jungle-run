#
# Rune — светящаяся руна на камне (храм): пульсирует тремя фазами.
# Декор без столкновений — читается как «живой» символ стены.
class_name Rune
extends Decor


func _init(ex: float) -> void:
	super("decor_rune", ex, float(Config.GROUND_Y) - 4.0 + 1.0)
	_fps = 6.0


func update(dt: float) -> void:
	super(dt)
	# фазы свечения: 0 -> 1 -> 2 -> 1 (мягкая пульсация)
	if sprite != null:
		var ph := int(_t * 6.0) % 4
		sprite.frame = [0, 1, 2, 1][ph]
