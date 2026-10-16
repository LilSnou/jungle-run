#
# VictoryState — победа: все три локации пройдены! Бриллиант и предложение
# сыграть ещё (порт VictoryState).
class_name VictoryState
extends GameState

var t := 0.0


func _init(game: Node2D) -> void:
	super(game)
	wants_pause_button = false


func enter() -> void:
	t = 0.0
	main.save_best(main.final_score())
	AudioManager.stop_song()
	AudioManager.play("victory")


func can_retry() -> bool:
	return t > 0.8


func update(dt: float) -> void:
	t += dt
	if can_retry() and (InputManager.was_pressed("jump") or InputManager.was_pressed("pause")):
		main.start_run()


func draw(canvas: CanvasItem) -> void:
	canvas.draw_rect(Rect2(0, 0, Config.WIDTH, Config.HEIGHT), Color(0.039, 0.031, 0.063, 0.62))
	var cx := Config.WIDTH / 2.0

	# --- бриллиант: огранённый алмаз с переливающимися бликами ---
	var bob := roundf(sin(t * 2.2) * 3.0)
	var frame := 1 if int(floor(t * 3.0)) % 2 == 1 else 0
	canvas.draw_texture_rect_region(Art.strip("diamond"),
		Rect2(cx - 14, 20 + bob, 28, 20), Rect2i(frame * 28, 0, 28, 20))

	PixelFont.draw(canvas, "ПОБЕДА", cx, 66,
		{"align": "center", "scale": 4, "color": "#f2e2b0", "shadow": "#141220"})
	PixelFont.draw(canvas, "ВСЕ ЛОКАЦИИ ПРОЙДЕНЫ!", cx, 102,
		{"align": "center", "color": "#8fe8f0", "shadow": "#141220"})
	PixelFont.draw(canvas, "ОЧКИ %d" % main.final_score(), cx, 118,
		{"align": "center", "color": "#f2e2b0", "shadow": "#141220"})
	PixelFont.draw(canvas, "РЕКОРД %d" % main.best, cx, 132,
		{"align": "center", "color": "#c9832e", "shadow": "#141220"})

	if int(floor(t * 2.0)) % 2 == 0:
		PixelFont.draw(canvas, "НАЖМИ ЧТОБЫ СЫГРАТЬ ЕЩЁ", cx, 156,
			{"align": "center", "color": "#f7f3e3", "shadow": "#141220"})
