#
# OverState — конец забега: итоги и рекорд (порт OverState).
class_name OverState
extends GameState

var t := 0.0


func _init(game: Node2D) -> void:
	super(game)
	wants_pause_button = false  # как в вебе: на экране конца кнопки паузы нет


func enter() -> void:
	t = 0.0


func can_retry() -> bool:
	return t > 0.6


func update(dt: float) -> void:
	t += dt
	if can_retry() and (InputManager.was_pressed("jump") or InputManager.was_pressed("pause")):
		main.start_run()


func draw(canvas: CanvasItem) -> void:
	canvas.draw_rect(Rect2(0, 0, Config.WIDTH, Config.HEIGHT), Color(0.039, 0.031, 0.063, 0.7))

	var cx := Config.WIDTH / 2.0
	PixelFont.draw(canvas, "ИГРА ОКОНЧЕНА", cx, 34,
		{"align": "center", "scale": 3, "color": "#b03027", "shadow": "#141220"})
	PixelFont.draw(canvas, "ОЧКИ %d" % main.final_score(), cx, 74,
		{"align": "center", "color": "#f2e2b0", "shadow": "#141220"})
	PixelFont.draw(canvas, "ДИСТАНЦИЯ %d М" % main.world.distance, cx, 88,
		{"align": "center", "color": "#c9c2ad", "shadow": "#141220"})
	PixelFont.draw(canvas, "РЕКОРД %d" % main.best, cx, 102,
		{"align": "center", "color": "#c9832e", "shadow": "#141220"})

	if int(floor(t * 2.0)) % 2 == 0:
		PixelFont.draw(canvas, "НАЖМИ ЧТОБЫ НАЧАТЬ СНАЧАЯ", cx, 130,
			{"align": "center", "color": "#f7f3e3", "shadow": "#141220"})
