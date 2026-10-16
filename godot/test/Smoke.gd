#
# Smoke — headless-проверка ремейка. Запуск (обычный ран-режим, автолоады живые):
#   godot_console --headless --path godot res://test/Smoke.tscn
#
# Проверяет: загрузку ассетов и шрифта, старт забега, генерацию трассы,
# физику и столкновения, смену состояний (меню/игра/пауза/конец/победа),
# тач-зоны, рекорд и мьют.
extends Node

const STEP := 1.0 / 60.0

var fails := 0
var main = null
var world = null


func _ready() -> void:
	print("=== Jungle Run smoke test ===")

	main = load("res://scenes/Main.tscn").instantiate()
	add_child(main)
	world = main.world

	# --- загрузка ассетов ---
	_check(main.state is MenuState, "меню — стартовое состояние")
	_check(Art.strip("player_run").get_width() == 128, "лист бега игрока 128px")
	_check(Art.strip("snake").get_width() == 56, "лист змеи 56px")
	_check(Art.strip("log1").get_width() == 48, "лист бревна log1 48px")
	_check(Art.tiles("jungle").get_width() == 64, "тайлы джунглей 64px")
	_check(Art.tex_bg("bg_jungle_sky.png").get_width() == 320, "фон джунглей загружен")

	# --- шрифт и тач-зоны ---
	_check(PixelFont.measure("ОЧКИ 123", 1) == 48.0, "ширина строки = 8 глифов x 6")
	_check(PauseButton.hit(280, 10) == "pause", "зона паузы")
	_check(PauseButton.hit(305, 10) == "mute", "зона динамика")
	_check(PauseButton.hit(160, 50) == "", "центр экрана — свободная зона")

	# --- меню «дышит» ---
	for i in 30:
		main.state.update(STEP)
		InputManager.end_frame()

	# --- старт забега ---
	main.start_run()
	_check(main.state is PlayState, "start_run() -> play")
	_check(world.distance == 0, "дистанция в начале = 0")
	var x0: float = world.player.x
	# на дистанции игрок «неуязвим»: он бежит без автопилота иначе врезается
	world.player.invulnerable = true

	# --- 12 секунд симуляции: бег, генерация, коллизии ---
	for i in 720:
		main.state.update(STEP)
		InputManager.end_frame()
	_check(world.player.x > x0 + 300.0, "игрок бежит вправо")
	_check(world.distance > 5, "дистанция растёт (%d м)" % world.distance)
	_check(world.entities().size() > 0,
		"трасса порождена (%d объектов, cursor=%.0f, px=%.0f, down=%s)" % [
			world.entities().size(), world._spawn_cursor, world.player.x,
			str(world.player.is_down)])

	# --- предметы не внутри препятствий ---
	var inside := 0
	for it in world._items:
		for o in world._obstacles:
			if o.dead:
				continue
			if Config.rects_overlap({"x": it.x, "y": it.base_y, "w": it.w, "h": it.h},
					{"x": o.x, "y": o.y, "w": o.w, "h": o.h}):
				inside += 1
	_check(inside == 0, "предметы не внутри препятствий (нарушений: %d)" % inside)

	# --- прыжок по клавише ---
	var pl = world.player
	pl.invulnerable = true
	var y_before: float = pl.y
	InputManager.press("jump")
	var peak_y := y_before
	for i in 25:
		main.state.update(STEP)
		InputManager.end_frame()
		peak_y = minf(peak_y, pl.y)
	InputManager.release("jump")
	_check(peak_y < y_before - 10.0, "прыжок поднимает игрока (dy=%.1f)" % (y_before - peak_y))
	for i in 60:
		main.state.update(STEP)
		InputManager.end_frame()
	_check(pl.y >= float(Config.GROUND_Y) - float(Player.STAND_H) - 1.0, "игрок вернулся на землю")
	pl.invulnerable = false

	# --- пауза замораживает мир ---
	main.set_state("pause")
	var frozen_x: float = pl.x
	for i in 30:
		main.state.update(STEP)
		InputManager.end_frame()
	_check(main.state is PauseState, "set_state(pause)")
	_check(absf(pl.x - frozen_x) < 0.01, "в паузе мир заморожен")
	main.set_state("play")

	# --- смерть -> экран конца ---
	pl.invulnerable = false
	while pl.lives > 0:
		pl.take_damage(1)
		pl.invulnerable = false
	_check(pl.is_down, "игрок погиб")
	for i in 120:
		if main.state is PlayState:
			main.state.update(STEP)
			InputManager.end_frame()
	_check(main.state is OverState, "после смерти — экран «ИГРА ОКОНЧЕНА»")
	_check(world.entities().size() == 0, "объекты исчезли при смерти")

	# --- рекорд и рестарт ---
	var best_before: int = main.best
	main.start_run()
	_check(main.state is PlayState, "рестарт с экрана конца")
	_check(main.best >= best_before, "рекорд сохранён и не уменьшается")

	# --- победа ---
	EventBus.emit("victory", {})
	_check(main.state is VictoryState, "событие победы -> экран победы")

	# --- мьют не падает ---
	AudioManager.toggle_mute()
	AudioManager.play("coin")
	AudioManager.toggle_mute()
	_check(true, "мьют вкл/выкл без ошибок")

	print("=== ИТОГ: %s (провалов: %d) ===" % ["FAIL" if fails > 0 else "PASS", fails])
	get_tree().quit(1 if fails > 0 else 0)


func _check(cond: bool, label: String) -> void:
	if cond:
		print("  ok   ", label)
	else:
		fails += 1
		printerr("  FAIL ", label)
