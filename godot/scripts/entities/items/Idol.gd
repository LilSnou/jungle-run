#
# Idol — золотая монетка майя (порт web Idol.js): очки и «ветка»
# атмосферы Индианы Джонса. Монетка круглая и «вращается», сжимаясь
# по горизонтали, как в классических раннерах (кадры арта).
class_name Idol
extends Item


func _init(ex: float, ey: float) -> void:
	super(ex, ey, 8, 8)
	make_sprite("idol", 0, 0, false)


func on_collect(_player) -> void:
	EventBus.emit("idol:collected", {"idol": self})


func update(dt: float) -> void:
	super(dt)
	# «вращение» монетки: кадр по фазе сжатия
	var squeeze: float = absf(cos(_time * 3.2 + _phase))
	sprite.frame = 0 if squeeze > 0.85 else (1 if squeeze > 0.55 else 2)


## Искры при «фронтальном» положении.
func _draw() -> void:
	var squeeze: float = absf(cos(_time * 3.2 + _phase))
	if squeeze > 0.92:
		draw_rect(Rect2(7, -1, 1, 1), Color.html("#fff4c2"))
	queue_redraw()
