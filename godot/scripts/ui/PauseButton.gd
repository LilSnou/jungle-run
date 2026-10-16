#
# PauseButton — кнопка паузы и динамика в правом верхнем углу (порт PauseButton.js).
# Зоны касаний инкапсулированы здесь; HUD рисуется отдельно.
class_name PauseButton
extends Object


static func zones() -> Dictionary:
	return {
		"pause": {"x": float(Config.WIDTH - 46), "y": 4.0, "w": 20.0, "h": 20.0},
		"mute": {"x": float(Config.WIDTH - 22), "y": 4.0, "w": 18.0, "h": 20.0},
	}


## Какая зона попала под палец (или "").
static func hit(x: float, y: float) -> String:
	for name in zones():
		var z: Dictionary = zones()[name]
		if x >= z.x and x <= z.x + z.w and y >= z.y and y <= z.y + z.h:
			return name
	return ""


static func draw(canvas: CanvasItem, paused: bool, muted: bool) -> void:
	var p: Dictionary = zones()["pause"]
	# подложка
	canvas.draw_rect(Rect2(p.x - 2, p.y - 2, p.w + 4, p.h + 4), Color(0.039, 0.031, 0.063, 0.55))
	var light := Color.html("#f2e2b0")
	if paused:
		# треугольник «play»
		for i in 5:
			canvas.draw_rect(Rect2(p.x + 7, p.y + 4 + i * 2, 2 + i * 2, 2), light)
	else:
		# две полоски «pause»
		canvas.draw_rect(Rect2(p.x + 5, p.y + 4, 4, 12), light)
		canvas.draw_rect(Rect2(p.x + 12, p.y + 4, 4, 12), light)

	var m: Dictionary = zones()["mute"]
	canvas.draw_rect(Rect2(m.x - 2, m.y - 2, m.w + 4, m.h + 4), Color(0.039, 0.031, 0.063, 0.55))
	var col := Color.html("#8a8494") if muted else light
	# динамик
	canvas.draw_rect(Rect2(m.x + 3, m.y + 8, 3, 4), col)
	canvas.draw_rect(Rect2(m.x + 6, m.y + 6, 2, 8), col)
	if muted:
		# перечёркнут
		canvas.draw_rect(Rect2(m.x + 10, m.y + 6, 2, 2), col)
		canvas.draw_rect(Rect2(m.x + 12, m.y + 8, 2, 2), col)
		canvas.draw_rect(Rect2(m.x + 10, m.y + 10, 2, 2), col)
		canvas.draw_rect(Rect2(m.x + 8, m.y + 12, 2, 2), col)
	else:
		# волны
		canvas.draw_rect(Rect2(m.x + 10, m.y + 6, 2, 6), col)
		canvas.draw_rect(Rect2(m.x + 13, m.y + 4, 2, 10), col)
