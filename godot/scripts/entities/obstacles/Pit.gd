#
# Pit — провал в земле (порт web Pit.js). Особое препятствие: оно не
# «бьёт» игрока, оно убирает землю под ним. Мир спрашивает is_ground_at(x) —
# если земли нет, герой падает (Player сам решает, что делать).
class_name Pit
extends GroundObstacle


func _init(ex: float, width := 40.0) -> void:
	super(ex, Config.GROUND_Y, width, Config.HEIGHT - Config.GROUND_Y + 20)


func damage_on_touch() -> bool:
	return false  # урон — через падение


func is_pit() -> bool:
	return true


## Кровать ямы пересекается только если игрок уже упал.
func hitbox() -> Dictionary:
	return {"x": x + 2, "y": y + 10, "w": w - 4, "h": h - 10}


func _draw() -> void:
	var w2 := w * 2.0  # визуальная ширина в 2 раза шире хитбокса (как в web)
	# темнота
	draw_rect(Rect2(0, 0, w2, Config.HEIGHT * 2), Color.html("#0c0a14"))
	# стены
	draw_rect(Rect2(0, 0, 6, Config.HEIGHT), Color.html("#2b2016"))
	draw_rect(Rect2(w2 - 6, 0, 6, Config.HEIGHT), Color.html("#2b2016"))
	draw_rect(Rect2(6, 0, 2, Config.HEIGHT), Color.html("#43331f"))
	draw_rect(Rect2(w2 - 8, 0, 2, Config.HEIGHT), Color.html("#43331f"))
	# кости внизу (жуткая деталь)
	draw_rect(Rect2(16, 44, 6, 2), Color.html("#cfc7ae"))
	draw_rect(Rect2(w2 - 24, 50, 4, 2), Color.html("#cfc7ae"))
	draw_rect(Rect2(w2 / 2.0, 56, 2, 2), Color.html("#cfc7ae"))
