#
# PauseState — пауза: мир заморожен (порт PauseState).
class_name PauseState
extends GameState


func update(_dt: float) -> void:
	if InputManager.was_pressed("pause") or InputManager.was_pressed("jump"):
		main.set_state("play")


func draw(canvas: CanvasItem) -> void:
	canvas.draw_rect(Rect2(0, 0, Config.WIDTH, Config.HEIGHT), Color(0.039, 0.031, 0.063, 0.65))
	PixelFont.draw(canvas, "ПАУЗА", Config.WIDTH / 2.0, 70,
		{"align": "center", "scale": 3, "color": "#f2e2b0", "shadow": "#141220"})
	PixelFont.draw(canvas, "НАЖМИ ЧТОБЫ ПРОДОЛЖИТЬ", Config.WIDTH / 2.0, 104,
		{"align": "center", "color": "#c9c2ad", "shadow": "#141220"})
