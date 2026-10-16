extends Node
# Временный тест: снимает кадры игры + печатает диагностику
# (позиции, состояния, видимость) для визуальной проверки якорей.
# Снимки привязаны к ИГРОВОМУ времени (world.time). Чтобы пойманы были
# именно кадры бега: ямы отключаются (игрок не умирает), инвулн держится
# на 0.5с (блокирует урон, но не переключает спрайт в кадр раненого).
# После джунглей вручную переключаем локации — снимаем деревню и храм.
# Запуск (оконный режим — нужен реальный рендер):
#   Godot_console --path godot res://test/Shot.tscn

var main = null
var frame := 0
var started := false
var t0 := 0.0
var next_shot := 0
var to_village := false
var to_temple := false
var shots := [
	[2.0, "shot_run_a.png"],
	[5.0, "shot_run_b.png"],
	[9.0, "shot_run_c.png"],
	[12.5, "shot_village.png"],
	[16.0, "shot_temple.png"],
	[19.0, "shot_mixed.png"],
]
var spawned := false
var slide_off := false
var marks: CanvasItem = null
var last_lives := -1


## Метки отладки: красный — препятствия, жёлтый — враги, зелёный — игрок.
## Вертикальные линии по ГЛОБАЛЬНЫМ X узлов (экран в logical px).
class Marks:
	extends Node2D

	var lines: Array = []

	func _draw() -> void:
		for m in lines:
			draw_rect(Rect2(m.x - 0.25, 0.0, 0.5, 180.0), m.c)


func _ready() -> void:
	main = load("res://scenes/Main.tscn").instantiate()
	add_child(main)
	marks = Marks.new()
	add_child(marks)


func _process(_delta: float) -> void:
	if main == null:
		return
	frame += 1
	if frame > 40000:
		print("TIMEOUT — выходим")
		get_tree().quit()
		return
	if not started:
		if frame == 60:
			main.start_run()
		if main.state is PlayState:
			started = true
			t0 = main.world.time
		return
	# «тестовый режим»: сплошная земля и неуязвимость без кадра раненого
	main.world._pits.clear()
	main.world.player._invuln = 0.5
	if main.world.player.lives != last_lives:
		if last_lives >= 0:
			print("!!! LIVES %d -> %d at t=%.2f player=(%.0f,%.0f) down=%s" % [
				last_lives, main.world.player.lives, main.world.time - t0,
				main.world.player.x, main.world.player.y, main.world.player.is_down])
		last_lives = main.world.player.lives
	_update_marks()
	var t: float = main.world.time - t0
	if t >= 9.5 and not to_village:
		to_village = true
		main.world._next_biome()
		print("--- -> village (t=%.1f)" % t)
	if t >= 12.8 and not to_temple:
		to_temple = true
		main.world._next_biome()
		print("--- -> temple (t=%.1f)" % t)
	# раскладка препятствий/врагов перед игроком + поза приседа.
	# Спавним на 150–255 впереди: игрок к моменту снимка (1.6с ≈ 190px)
	# находит их в поле видимости (экран ≈ player-62 .. player+258).
	if t >= 17.4 and not spawned:
		spawned = true
		var w = main.world
		var px: float = w.player.x
		w.add_obstacle(Factories.create_obstacle("statue", px + 150.0))
		w.add_enemy(Factories.create_enemy("warrior", px + 190.0))
		w.add_enemy(Factories.create_enemy("bat", px + 215.0, {"alt": 19.0}))
		w.add_obstacle(Factories.create_obstacle("log1", px + 255.0))
		InputManager.press("slide")
		print("--- spawned mixed set (t=%.1f)" % t)
	if spawned and not slide_off and t >= 19.05:
		slide_off = true
		InputManager.release("slide")
	if next_shot < shots.size() and t >= float(shots[next_shot][0]):
		_dump(float(shots[next_shot][0]), str(shots[next_shot][1]))
		next_shot += 1
		if next_shot >= shots.size():
			get_tree().quit()


func _update_marks() -> void:
	var w = main.world
	var arr: Array = []
	for o in w._obstacles:
		arr.append({"x": o.get_global_transform().origin.x, "c": Color.RED})
	for e2 in w._enemies:
		arr.append({"x": e2.get_global_transform().origin.x, "c": Color.YELLOW})
	if w.player.sprite != null:
		arr.append({"x": w.player.sprite.get_global_transform().origin.x, "c": Color.GREEN})
	marks.lines = arr
	marks.queue_redraw()


func _dump(t: float, fname: String) -> void:
	var w = main.world
	var p = w.player
	print("=== game time %.1fs ===" % t)
	print("state play=", main.state is PlayState, " biome=", w.biome.get_class())
	print("player x=%.1f y=%.1f down=%s on_ground=%s vy=%.1f lives=%d" % [p.x, p.y, p.is_down, p.on_ground, p.vy, p.lives])
	print("camera=", w.camera, " distance=", w.distance, " score=", w.score)
	print("entities=", w.entities().size(), " obst=", w._obstacles.size(),
		" decors=", w._decors.size(), " items=", w._items.size(), " enemies=", w._enemies.size())
	for o in w._obstacles.slice(0, 10):
		var vis := "-"
		var spr_pos := "-"
		if o.sprite != null:
			vis = str(o.sprite.visible)
			spr_pos = str(o.sprite.position)
		print("  obst ", o.get_class(), " hb=(", o.x, ",", o.y, ",", o.w, ",", o.h, ") glob=", o.get_global_transform().origin, " spr_vis=", vis, " spr_pos=", spr_pos)
	for e2 in w._enemies.slice(0, 3):
		var v2 := "-"
		if e2.sprite != null:
			v2 = str(e2.sprite.visible)
		print("  enemy ", e2.get_class(), " x=", e2.x, " y=", e2.y, " glob=", e2.get_global_transform().origin, " spr_vis=", v2)
	print("ents_root visible=", w._entities_root.visible, " pos=", w._entities_root.position)
	if p.sprite != null:
		print("player sprite vis=", p.sprite.visible, " pos=", p.sprite.position,
			" frame=", p.sprite.frame, " tex=", p.sprite.texture.get_size())
		print("player node pos=", p.position, " spr_global=", p.sprite.get_global_transform().origin)
	var img := get_viewport().get_texture().get_image()
	var path: String = OS.get_environment("LOCALAPPDATA") + "/Temp/opencode/" + fname
	img.save_png(path)
	print("SAVED ", path)
