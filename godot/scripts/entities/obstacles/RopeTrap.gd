#
# RopeTrap — верёвка-ловушка между двумя резными столбиками (деревня).
# Висит на канатах к верху экрана: верёвка на уровне головы героя —
# можно проскользнуть под ней или перепрыгнуть (порт web RopeTrap).
class_name RopeTrap
extends Overhead


func _init(ex: float) -> void:
	# арт 56x24 (масштаб 0.5) = 28x12 logical; висит как и брёвна
	super(ex, Config.GROUND_Y - 21.0, 28.0, 12.0)
	make_sprite("ropetrap", 0, 1, false, 0.5)
	_rope = Color.html("#d9b382")
