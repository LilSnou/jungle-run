#
# Snake — кобра, приподнявшаяся над землёй (порт web Snake.js).
# Побеждается прыжком сверху (stomp); касание сбоку — урон.
class_name Snake
extends Enemy

const SLITHER := 26.0  # px/с — дополнительное приближение к игроку


func _init(ex: float) -> void:
	# хитбокс шире (14px): совпадает с видимым телом кобры —
	# касание «по картинке» гарантированно даёт урон
	super(ex, Config.GROUND_Y - 13, 14, 13)
	# якорь: арт 14x14 = 14x14 logical — центр рисунка на хитбоксе, низ на земле
	make_sprite("snake", 0.0, -1.0, true)


func update(dt: float) -> void:
	tick(dt)
	x -= SLITHER * dt   # приползает навстречу
	sprite.frame = frame_by(0.25, 4)
	_kill_if_offscreen()
