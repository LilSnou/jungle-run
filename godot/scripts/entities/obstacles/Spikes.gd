#
# Spikes — каменные шипы храма: прыгай. Хитбокс = визуал: одна ячейка
# 8x7 logical (арт 16x14, масштаб 0.5); ширина кратна клеткам по 8.
# Последний ряд арта (тёмный контур) утоплен в траву — шипы стоят
# на земле, а не «парят» (порт web Spikes).
class_name Spikes
extends GroundObstacle

const CELL := 8.0     # logical ширина ячейки
const CELL_H := 7.0   # logical высота рисунка


func _init(ex: float, width := 16.0) -> void:
	var cells := maxi(1, int(round(width / CELL)))
	# низ рисунка на GROUND_Y+1: y + CELL_H = GROUND + 1
	super(ex, Config.GROUND_Y - CELL_H + 1.0, CELL * float(cells), CELL_H - 1.0)


func _draw() -> void:
	var tex := Art.strip("spikes")
	var cells := int(w / CELL)
	for i in cells:
		draw_texture_rect_region(tex, Rect2(float(i) * CELL, 0.0, CELL, CELL_H),
			Rect2i(0, 0, 16, 14))
