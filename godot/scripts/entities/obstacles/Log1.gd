#
# Log1 — деревянное бревно на верёвках (джунгли): висит над землёй,
# видны оба торца с годовыми кольцами. Прыжок врезается,
# скольжение проходит под ним (порт web LowLog).
class_name Log1
extends Overhead


func _init(ex: float) -> void:
	super(ex, Config.GROUND_Y - 18.0, 24.0, 9.0)
	# арт 48x18 (масштаб 0.5) = 24x9 logical — визуал совпадает с хитбоксом
	make_sprite("log1", 0, 1, false, 0.5)
	_rope = Color.html("#d9b382")
