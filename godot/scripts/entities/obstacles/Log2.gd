#
# Log2 — каменное бревно-«каток» храма: резные каннелюры и трещины,
# подвешено на верёвках. Как и деревянное — проскальзывай или прыгай.
class_name Log2
extends Overhead


func _init(ex: float) -> void:
	super(ex, Config.GROUND_Y - 18.0, 24.0, 9.0)
	make_sprite("log2", 0, 1, false, 0.5)
	_rope = Color.html("#d9b382")
