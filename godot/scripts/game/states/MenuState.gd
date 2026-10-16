#
# MenuState — заставка: мир «дышит» на фоне, ждём тапа/пробела (порт MenuState).
class_name MenuState
extends GameState

var t := 0.0


func enter() -> void:
	t = 0.0
	main.world.set_entities_visible(false)  # на заставке только фон и земля
	AudioManager.play_song(main.world.biome.track())


func update(dt: float) -> void:
	t += dt
	# фон медленно плывёт (46 px/с)
	main.world.tick_menu(dt, t * 46.0)
	if InputManager.was_pressed("jump") or InputManager.was_pressed("pause"):
		main.start_run()


func draw(canvas: CanvasItem) -> void:
	# затемнение под текст
	canvas.draw_rect(Rect2(0, 0, Config.WIDTH, Config.HEIGHT), Color(0.039, 0.031, 0.063, 0.45))

	var cx := Config.WIDTH / 2.0
	PixelFont.draw(canvas, "JUNGLE", cx, 44,
		{"align": "center", "scale": 4, "color": "#f2e2b0", "shadow": "#141220"})
	PixelFont.draw(canvas, "RUN", cx, 76,
		{"align": "center", "scale": 4, "color": "#c9832e", "shadow": "#141220"})

	# мигающий призыв — единственная подпись под логотипом
	if int(floor(t * 2.0)) % 2 == 0:
		PixelFont.draw(canvas, "НАЖМИ ЛЮБУЮ КНОПКУ ДЛЯ СТАРТА", cx, 122,
			{"align": "center", "color": "#f7f3e3", "shadow": "#141220"})
