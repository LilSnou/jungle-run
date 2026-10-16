#
# Heart — сердечко: возвращает одно сердце жизни (если оно потеряно).
# Парит на месте, слегка покачиваясь (Item), и слабо мерцает при сборе.
class_name Heart
extends Item


func _init(ex: float, ey: float) -> void:
	super(ex, ey, 8, 8)
	# якорь (0,0): арт 8x8 ложится на хитбокс ровно
	make_sprite("heart", 0.0, 0.0, false)


func on_collect(player) -> void:
	if player.heal():
		EventBus.emit("heart:collected", {"heart": self})
	else:
		# жизнь полна — сердечко засчитывается как очки (утешение)
		EventBus.emit("idol:collected", {"idol": self, "silent": true})
