#
# Biome — абстрактный базовый класс локаций (порт web Biome.js).
#
# Каждый биом инкапсулирует:
# • палитру земли и название/трек,
# • параллакс-фон из готовых PNG-слоёв (см. tools/artgen/SPEC.md §11B),
# • анимированные «актёры» фона (птицы, светлячки, угольки — рисует Fx),
# • таблицу «паттернов» препятствий/врагов для генератора уровней.
#
# Абстракция + полиморфизм: World вызывает tick()/get_pattern(),
# не зная, какая именно локация живёт.
class_name Biome
extends RefCounted

var rng: Callable
var time := 0.0
var bg_root: Node2D = Node2D.new()
var fg_root: Node2D = Node2D.new()
var ground: Ground = null
var _layers: Array = []        # {scroll: Node2D, factor: float, period: float}
var _fx_node: Fx = null
var _butterflies: Array = []   # {sprite: Sprite2D, x0, y0, speed, phase, color}
var _anim := {}             # занятые слои для подклассов (flicker/sway)


func _init(seed_: int = 1) -> void:
	rng = Config.make_random(seed_)
	fg_root.z_index = 10  # передний план поверх сущностей (порядок слотов важнее)


func name_ru() -> String:
	return "BIOME"


func track() -> String:
	return "jungle"


func tiles_name() -> String:
	return "jungle"


func ground_line() -> Color:
	return Color.BLACK


func ground_top() -> Color:
	return Color.BLACK


func ground_dirt() -> Color:
	return Color.BLACK


func ground_shade() -> Color:
	return Color.BLACK


## Паттерн генерации следующего «участка» трассы. difficulty — 0..1.
func get_pattern(_d: float) -> Dictionary:
	return {"length": 120.0, "spawns": [], "items": []}


## Тик времени: параллакс-слои, анимации, актёры.
func tick(dt: float, cam: Dictionary) -> void:
	time += dt
	for L in _layers:
		var period: float = L.period
		(L.scroll as Node2D).position.x = -fposmod(cam.x * L.factor, period)
	# бабочки порхают над травой (экранное пространство переднего плана)
	for b in _butterflies:
		var s: Sprite2D = b.sprite
		var bx: float = fposmod(float(b.x0) - time * float(b.speed), Config.WIDTH + 60.0) - 30.0
		s.position = Vector2(roundf(bx), roundf(float(b.y0) + sin(time * 3.0 + float(b.phase)) * 4.0))
		s.frame = int(floor(time * 8.0 + float(b.phase))) % 2
	if _fx_node != null:
		_fx_node.queue_redraw()  # птицы/светлячки/угольки перерисовываются каждый тик
	_tick_fx(dt)


func _tick_fx(_dt: float) -> void:
	pass


## Добавить параллакс-слой с бесшовным повтором (factor=0 — статика).
## parent — bg_root по умолчанию; fg_root — для переднего плана.
func add_layer(file: String, factor: float, y: float, period := 0.0, parent: Node2D = null) -> Node2D:
	var tex := Art.tex_bg(file)
	var w := float(tex.get_width())
	var p := period if period > 0.0 else w
	var scroll := Node2D.new()
	var n := 1 if factor == 0.0 else int(ceil((Config.WIDTH + w) / w)) + 1
	for i in n:
		var s := Sprite2D.new()
		s.texture = tex
		s.position.x = i * w
		scroll.add_child(s)
	scroll.position.y = y
	(parent if parent != null else bg_root).add_child(scroll)
	if factor > 0.0:
		_layers.append({"scroll": scroll, "factor": factor, "period": p})
	return scroll


## Бабочки/мошки над травой (передний план, анимирует движок).
func add_butterflies(count: int, y0: float, y1: float, speed: float) -> void:
	for i in count:
		var s := Art.make_sprite("decor_butterfly", 0, 0, false, 0.5)
		# арт уже раскрашен — модуляция только «освежает» тон
		s.modulate = Color.WHITE if rng.call() > 0.5 else Color.html("#fff2d0")
		fg_root.add_child(s)
		_butterflies.append({
			"sprite": s,
			"x0": rng.call() * (Config.WIDTH + 60.0),
			"y0": y0 + rng.call() * (y1 - y0),
			"speed": speed,
			"phase": rng.call() * TAU,
			"color": s.modulate,
		})


## Анимированные «актёры» фона: птицы, светлячки, угольки, пыль, листья.
class Fx:
	extends Node2D

	var kind := ""
	var cfg := {}
	var biome: Biome = null

	func _draw() -> void:
		var W := float(Config.WIDTH)
		var t: float = biome.time
		match kind:
			"jungle":
				# стайка птиц, пересекающих экран
				for b in cfg.birds:
					var bx: float = fposmod(b.x + t * b.speed, W + 80.0) - 40.0
					var by: float = b.y + sin(t * 2.0 + b.phase) * 4.0
					var flap: int = int(floor(t * 8.0 + b.phase)) % 2
					var col := Color.html("#1c2a24")
					draw_rect(Rect2(roundf(bx), roundf(by), 3, 1), col)
					draw_rect(Rect2(roundf(bx) - (2.0 if flap == 1 else 1.0), roundf(by) - 1.0, 2, 1), col)
					draw_rect(Rect2(roundf(bx) + 2.0, roundf(by) - 1.0, 2, 1), col)
				# светлячки-споры
				var fire := Color.html("#d8f5a3")
				for i in cfg.fireflies:
					var fx: float = fposmod(i * 61.0 + t * 10.0 * (1.0 if i % 2 == 1 else -1.0), W + 40.0) - 20.0
					var fy: float = 36.0 + sin(t * 1.4 + i * 2.1) * 20.0 + i * 13.0
					if int(floor(t * 4.0 + i)) % 3 != 0:
						draw_rect(Rect2(roundf(fx), roundf(fy), 2, 2), fire)
			"village":
				# светлячки-жаровни в сумерках
				var warm := Color.html("#ffe98a")
				for i in cfg.fireflies:
					var vx: float = fposmod(i * 73.0 + t * 8.0, W + 40.0) - 20.0
					var vy: float = 30.0 + sin(t * 1.2 + i * 1.7) * 16.0 + i * 19.0
					if int(floor(t * 3.0 + i)) % 4 != 0:
						draw_rect(Rect2(roundf(vx), roundf(vy), 2, 2), warm)
			"temple":
				# пылинки, угольки и падающие листья ночного храма
				var dust := Color.html("#e2d8b4")
				dust.a = 0.5
				for i in cfg.dust:
					var dx: float = fposmod(i * 47.0 - t * 12.0, W + 30.0) - 15.0
					var dy: float = 40.0 + sin(t * 0.9 + i * 2.3) * 26.0 + i * 11.0
					draw_rect(Rect2(roundf(dx), roundf(dy), 1, 1), dust)
				for i in cfg.embers:
					var ex: float = fposmod(i * 89.0 + t * 6.0, W + 30.0) - 15.0
					var ey: float = 150.0 - fposmod(t * (9.0 + i * 2.0), 70.0) + sin(t * 2.0 + i) * 3.0
					var ember := Color.html("#ffaa50")
					ember.a = 0.35 + 0.35 * absf(sin(t * 3.0 + i * 1.3))
					draw_rect(Rect2(roundf(ex), roundf(ey), 1, 2), ember)
				for i in cfg.leaves:
					var lx: float = fposmod(i * 58.0 - t * 18.0, W + 40.0) - 20.0
					var ly: float = fposmod(t * 16.0 + i * 43.0, 120.0) + 30.0
					var sway: float = sin(t * 2.2 + i * 1.9) * 4.0
					draw_rect(Rect2(roundf(lx + sway), roundf(ly), 2, 2), Color.html("#3e7a3a" if i % 2 == 0 else "#2b5f2c"))


## Создать узел-актёров (вызывается подклассами после слоёв).
func make_fx(kind_: String, cfg_: Dictionary) -> Fx:
	_fx_node = Fx.new()
	_fx_node.kind = kind_
	_fx_node.cfg = cfg_
	_fx_node.biome = self
	bg_root.add_child(_fx_node)
	return _fx_node


## Универсальный помощник: выбрать объект из таблицы с весами.
static func weighted_pick(rng: Callable, table: Array) -> Variant:
	var total := 0.0
	for e in table:
		total += float(e.weight)
	var r: float = rng.call() * total
	for e in table:
		r -= float(e.weight)
		if r <= 0.0:
			return e.value
	return table[table.size() - 1].value


## Ряд золотых идолов дугой (награда за рискованный прыжок).
static func idol_arc(x0: float, count: int, alt := 42.0, gap := 12.0) -> Array:
	var items: Array = []
	for i in count:
		var lift: float = sin(float(i) / float(count - 1) * PI) * 10.0 if count > 1 else 0.0
		items.append({"type": "idol", "at": x0 + i * gap, "alt": alt + lift})
	return items


# ----------------------------------------------------------------------
# Декор локации (грибы, папоротники, черепа, руны, бабочки)
# ----------------------------------------------------------------------

## Таблица декора биома: [{weight, {type}}]. Базовый биом — без декора;
## наследники возвращают свои таблицы (полиморфизм данных).
func decor_table() -> Array:
	return []


## Дописать в паттерн случайный декор (0..2 штуки). Попадание земного
## декора впритык к препятствиям отсекает World._spawn_pattern.
func with_decor(pattern: Dictionary) -> Dictionary:
	var table := decor_table()
	if table.is_empty():
		return pattern
	var spawns: Array = (pattern.get("spawns", []) as Array).duplicate()
	var length := float(pattern.get("length", 150.0))
	var n := int(floor(rng.call() * 2.7))  # 0, 1 или 2 декоринки
	for i in n:
		var pick: Variant = Biome.weighted_pick(rng, table)
		if not (pick is Dictionary) or not pick.has("type"):
			continue
		var entry := {"type": String(pick.type),
			"at": 14.0 + rng.call() * maxf(8.0, length - 28.0)}
		if pick.type == "butterfly":
			entry["alt"] = 60.0 + rng.call() * 60.0
		spawns.append(entry)
	pattern["spawns"] = spawns
	return pattern
