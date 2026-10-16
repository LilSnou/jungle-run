#
# World — игровой мир: камера, земля, генератор трассы, столкновения
# (порт web World.js).
#
# Это «композиция»: World владеет игроком, биомом, списками сущностей
# и частицами. Генерация уровня — данные-driven: биом отдаёт «паттерны»,
# а фабрики создают конкретные объекты.
#
# Порядок слотов дерева = порядок отрисовки веб-версии:
# фон прошлой локации → её земля → фон текущей (альфа=fade) → её земля →
# сущности (препятствия, враги, предметы, снаряды, игрок, частицы) →
# передний план прошлой → передний план текущей (альфа=fade).
class_name World
extends Node2D

## Длительность плавного перехода между локациями, с.
const FADE_TIME := 1.8

var player: Player
var camera := {"x": 0.0, "y": 0.0}
var time := 0.0
var score := 0
var biome: Biome
var prev_biome: Biome = null

var _obstacles: Array = []
var _enemies: Array = []
var _items: Array = []
var _decors: Array = []          # декор без столкновений (грибы, руны...)
var _projectiles: Array = []
var _pits: Array = []
var _biome_classes: Array = [JungleBiome, VillageBiome, TempleBiome]
var _biome_index := 0
var _loop := 0
var _spawn_cursor := 0.0
var _hearts_this_biome := 0  # сколько сердечек уже упало на этой локации
var _next_biome_at := float(Config.TRANSITION_EVERY)
var _rng: Callable
var _shake := 0.0
var _start_x := 60.0
var _biome_start_dist := 0
var _trans_t := 1.0
var _statue_clear_until := -100000.0  # до этой x — «свободная зона» статуи

# слоты отрисовки
var _bg_prev: Node2D
var _ground_prev: Node2D
var _bg_cur: Node2D
var _ground_cur: Node2D
var _entities_root: Node2D
var _items_root: Node2D
var _obstacles_root: Node2D
var _enemies_root: Node2D
var _projectiles_root: Node2D
var _particles: WorldParticles
var _fg_prev: Node2D
var _fg_cur: Node2D


func _init() -> void:
	_rng = Config.make_random(1337)
	# слоты отрисовки (порядок важен!)
	_bg_prev = Node2D.new()
	add_child(_bg_prev)
	_ground_prev = Node2D.new()
	add_child(_ground_prev)
	_bg_cur = Node2D.new()
	add_child(_bg_cur)
	_ground_cur = Node2D.new()
	add_child(_ground_cur)
	_entities_root = Node2D.new()
	add_child(_entities_root)
	_items_root = Node2D.new()
	_entities_root.add_child(_items_root)
	_obstacles_root = Node2D.new()
	_entities_root.add_child(_obstacles_root)
	_enemies_root = Node2D.new()
	_entities_root.add_child(_enemies_root)
	_projectiles_root = Node2D.new()
	_entities_root.add_child(_projectiles_root)
	player = Player.new(float(Config.START_X), float(Config.GROUND_Y - Player.STAND_H))
	player.world = self
	_entities_root.add_child(player)
	_particles = WorldParticles.new(self)
	_entities_root.add_child(_particles)
	_fg_prev = Node2D.new()
	add_child(_fg_prev)
	_fg_cur = Node2D.new()
	add_child(_fg_cur)

	biome = JungleBiome.new(1337)
	_install_biome(biome)

	# Очки за предметы (World не знает про HUD — только события).
	EventBus.on("idol:collected", _on_idol)
	EventBus.on("enemy:stomped", _on_stomped)
	EventBus.on("player:fall", _on_fall)
	EventBus.on("player:hurt", _on_hurt)
	# При смерти героя все объекты мира просто исчезают (без «улетания»).
	EventBus.on("player:dead", _on_dead)
	reset()


func _exit_tree() -> void:
	EventBus.off("idol:collected", _on_idol)
	EventBus.off("enemy:stomped", _on_stomped)
	EventBus.off("player:fall", _on_fall)
	EventBus.off("player:hurt", _on_hurt)
	EventBus.off("player:dead", _on_dead)


func _on_idol(_p) -> void:
	score += Config.IDOL_SCORE


func _on_stomped(_p) -> void:
	score += Config.STOMP_SCORE


func _on_fall(_p) -> void:
	_shake = 0.35


func _on_hurt(_p) -> void:
	_shake = 0.3


func _on_dead(_p) -> void:
	clear_entities()


## Узлы биома встают в слоты отрисовки; герой меняет палитру стойки.
func _install_biome(b: Biome) -> void:
	_bg_cur.add_child(b.bg_root)
	_ground_cur.add_child(b.ground)
	_fg_cur.add_child(b.fg_root)
	if player != null:
		player.set_biome(b.tiles_name())


## Перенести узлы биома в слоты «предыдущей локации» (кроссфейд).
func _demote_biome(b: Biome) -> void:
	b.bg_root.reparent(_bg_prev)
	b.ground.reparent(_ground_prev)
	b.fg_root.reparent(_fg_prev)


## Выбросить узлы биома.
func _discard_biome_nodes(b: Biome) -> void:
	b.bg_root.queue_free()
	b.ground.queue_free()
	b.fg_root.queue_free()


## Полный сброс мира (новая игра).
func reset() -> void:
	clear_entities()
	if prev_biome != null:
		_discard_biome_nodes(prev_biome)
		prev_biome = null
	_discard_biome_nodes(biome)
	_biome_index = 0
	_loop = 0
	_next_biome_at = float(Config.TRANSITION_EVERY)
	_biome_start_dist = 0
	_trans_t = 1.0
	_statue_clear_until = -100000.0
	_hearts_this_biome = 0
	_bg_cur.modulate.a = 1.0
	_ground_cur.modulate.a = 1.0
	_fg_cur.modulate.a = 1.0
	biome = JungleBiome.new(1337 + randi() % 1000)
	_install_biome(biome)
	player.reset(float(Config.START_X), float(Config.GROUND_Y - Player.STAND_H))
	player.sync_transform()
	_start_x = player.x
	camera.x = player.x - 60.0
	camera.y = 0.0
	time = 0.0
	score = 0
	_spawn_cursor = player.x + Config.WIDTH + 60.0
	AudioManager.play_song(biome.track())


# ----------------------------------------------------------------------
# Геттеры состояния
# ----------------------------------------------------------------------

## Прогресс внутри текущей локации 0..1.
func biome_progress() -> float:
	return Config.clampf_(float(distance - _biome_start_dist) / float(Config.TRANSITION_EVERY), 0.0, 1.0)


## Текущая скорость бега, px/с (постепенный разгон внутри биома).
var speed := Config.RUN_START:
	get:
		var p := biome_progress()
		var accel: float = pow(p, Config.RUN_EASE) * (Config.RUN_MAX - Config.RUN_START)
		return minf(Config.RUN_MAX, Config.RUN_START + _loop * 9.0 + accel)


## Пройденное расстояние в метрах.
var distance := 0:
	get:
		return maxi(0, int(floor((player.x - _start_x) / Config.PLAYER_SPEED_SCALE)))


## Сложность 0..1 — растёт с прогрессом локации и «петлями».
func difficulty() -> float:
	return Config.clampf_(0.08 + _loop * 0.22 + biome_progress() * 0.85, 0.0, 1.0)


# ----------------------------------------------------------------------
# Земля
# ----------------------------------------------------------------------

## Есть ли земля под точкой (нет — если там яма).
func is_ground_at(x: float) -> bool:
	for pit in _pits:
		if is_instance_valid(pit) and not pit.dead and x > pit.x and x < pit.x + pit.w:
			return false
	return true


## Есть ли над игроком низкое препятствие (чтобы не вставать под бревном).
func has_overhead(pl: Player) -> bool:
	var stand_box := {"x": pl.x, "y": float(Config.GROUND_Y - Player.STAND_H),
		"w": float(Player.STAND_W), "h": float(Player.STAND_H)}
	for o in _obstacles:
		if o.is_overhead() and not o.dead and Config.rects_overlap(stand_box, o.hitbox()):
			return true
	return false


## Безопасная точка для возрождения после падения.
func find_safe_ground(x: float) -> float:
	var px := x + 8.0
	var guard := 0
	var moved := true
	while moved and guard < 20:
		guard += 1
		moved = false
		for pit in _pits:
			if not pit.dead and px > pit.x - 10.0 and px < pit.x + pit.w + 10.0:
				px = pit.x + pit.w + 16.0
				moved = true
	return px


# ----------------------------------------------------------------------
# Спавн
# ----------------------------------------------------------------------

func add_obstacle(o: GroundObstacle) -> void:
	o.world = self
	_obstacles.append(o)
	_obstacles_root.add_child(o)
	if o is Pit:
		_pits.append(o)


func add_enemy(e: Enemy) -> void:
	e.world = self
	_enemies.append(e)
	_enemies_root.add_child(e)


func add_item(it: Item) -> void:
	it.world = self
	_items.append(it)
	_items_root.add_child(it)


## Декор живёт в слоте предметов (рисуется под препятствиями),
## но в списке предметов НЕ состоит — его нельзя «собрать».
func add_decor(d: Decor) -> void:
	d.world = self
	_decors.append(d)
	_items_root.add_child(d)


func add_projectile(p: Enemy) -> void:
	p.world = self
	_projectiles.append(p)
	_projectiles_root.add_child(p)


## Снаряд (копьё воина и т.п.).
func spawn_projectile(p: Enemy) -> void:
	add_projectile(p)


## Все активные сущности (для отладки и тестов).
func entities() -> Array:
	return _obstacles + _enemies + _items + _decors + _projectiles


## При смерти игрока всё живое в мире просто исчезает — без «улетания».
func clear_entities() -> void:
	for arr: Array in [_obstacles, _enemies, _items, _decors, _projectiles]:
		for e in arr:
			(e as Node).queue_free()
		arr.clear()
	_pits.clear()
	for o in _obstacles_root.get_children():
		o.queue_free()
	for e in _enemies_root.get_children():
		e.queue_free()
	for it in _items_root.get_children():
		it.queue_free()
	for p in _projectiles_root.get_children():
		p.queue_free()
	_particles.clear_particles()


## Создать сущности из «паттерна» биома. Здесь же действуют два правила
## генерации: клренс статуи (26 logical до/после — пусто) и запрет
## шипов над ямой. Декор (грибы, руны, бабочки) не должен расти
## из препятствиями в одной точке.
func _spawn_pattern(pattern: Dictionary, x0: float) -> void:
	var spawns: Array = pattern.get("spawns", [])
	# ямы этого паттерна — «шпиль над ямой» запрещён
	var pattern_pits: Array = []
	for s: Dictionary in spawns:
		if s.type == "pit":
			pattern_pits.append([x0 + float(s.at), float(s.get("w", 40.0))])
	for s: Dictionary in spawns:
		var sx: float = x0 + float(s.at)
		if Factories.is_obstacle_type(s.type):
			if s.type == "spikes" and _near_pit(sx, 16.0, pattern_pits):
				continue  # шипы никогда не висят над провалом
			if sx < _statue_clear_until:
				continue  # внутри свободной зоны статуи — пусто
			if s.type == "statue":
				if _statue_blocked_before(sx):
					continue  # рядом с другим препятствием — статуя не ставится
				_statue_clear_until = sx + 12.0 + 26.0
			var obstacle := Factories.create_obstacle(s.type, sx, s)
			if obstacle != null:
				add_obstacle(obstacle)
			continue
		var enemy := Factories.create_enemy(s.type, sx, s)
		if enemy != null:
			# наземные враги не спавнятся над ямой (летающие — можно)
			if enemy.flies() or is_ground_at(sx + enemy.w * 0.5):
				add_enemy(enemy)
			else:
				enemy.free()  # объект ещё не в дереве — освобождаем сразу
			continue
		var dec := Factories.create_decor(s.type, sx, s)
		if dec != null and _decor_spot_free(dec, sx):
			add_decor(dec)
	for it: Dictionary in pattern.get("items", []):
		var y := float(Config.GROUND_Y) - float(it.get("alt", 30)) - 8.0
		var item := Factories.create_item(it.type, x0 + float(it.at), y)
		if item != null:
			add_item(item)
	_fix_item_placement()


## Есть ли препятствие в зоне 26 logical перед статуей (включая уже
## построенные и ямы).
func _statue_blocked_before(sx: float) -> bool:
	for o in _obstacles:
		if o.dead:
			continue
		if o.x + o.w + 26.0 > sx:
			return true
	return false


## Стоят ли шипы (ширина sw) рядом с ямой (существующей или паттерновой).
func _near_pit(sx: float, sw: float, pattern_pits: Array) -> bool:
	for p in _pits:
		if not p.dead and sx < p.x + p.w + 4.0 and sx + sw > p.x - 4.0:
			return true
	for e in pattern_pits:
		if sx < float(e[0]) + float(e[1]) + 4.0 and sx + sw > float(e[0]) - 4.0:
			return true
	return false


## Свободно ли место для декора (не пересекается с препятствиями).
func _decor_spot_free(dec: Decor, sx: float) -> bool:
	if dec is Butterfly:
		return true  # бабочка летает — ей любое место
	for o in _obstacles:
		if o.dead:
			continue
		if sx + dec.w + 4.0 > o.x and sx - 4.0 < o.x + o.w:
			return false
	return true


## Монетки и сердечки не должны оказаться ВНУТРИ препятствий:
## если предмет пересекается с препятствием — поднимаем его над ним.
func _fix_item_placement() -> void:
	for it in _items:
		if it.dead:
			continue
		var box: Dictionary = {"x": it.x, "y": it.base_y, "w": it.w, "h": it.h}
		for o in _obstacles:
			if o.dead:
				continue
			if o is Pit:
				# над ямой монетка должна быть хотя бы на уровне земли
				var over_pit: bool = box.x + box.w > o.x + 4.0 and box.x < o.x + o.w - 4.0
				if over_pit and box.y + box.h > Config.GROUND_Y - 10.0:
					it.set_base_y(float(Config.GROUND_Y) - it.h - 14.0)
					box = {"x": it.x, "y": it.base_y, "w": it.w, "h": it.h}
				continue
			var guard := 0
			while guard < 8 and Config.rects_overlap(box, {"x": o.x, "y": o.y, "w": o.w, "h": o.h}):
				guard += 1
				it.set_base_y(it.base_y - 6.0)
				box = {"x": it.x, "y": it.base_y, "w": it.w, "h": it.h}


## Генерировать трассу впереди игрока (вместе с декором локации).
func _generate() -> void:
	var ahead: float = player.x + Config.WIDTH + 120.0
	while _spawn_cursor < ahead:
		var pattern: Dictionary = biome.with_decor(_with_heart_guarantee(biome.get_pattern(difficulty())))
		_spawn_pattern(pattern, _spawn_cursor)
		for it: Dictionary in pattern.get("items", []):
			if it.type == "heart":
				_hearts_this_biome += 1
		_spawn_cursor += float(pattern.length) + floorf(_rng.call() * 36.0)


## Гарантия сердечек на каждой локации: как минимум одно (к ~30% пути),
## второе — с шансом на вторую половину. Недостающее подставляем сами.
func _with_heart_guarantee(pattern: Dictionary) -> Dictionary:
	var p := biome_progress()
	if _hearts_this_biome == 0 and p > 0.3:
		return _heart_pattern()
	if _hearts_this_biome == 1 and p > 0.7 and _rng.call() < 0.5:
		return _heart_pattern()
	return pattern


## Паттерн с одним сердечком на уровне пояса (под прыжок-подбор).
func _heart_pattern() -> Dictionary:
	return {"length": 140.0, "spawns": [],
		"items": [{"type": "heart", "at": 60.0, "alt": 34.0}]}


## Смена локации.
func _next_biome() -> void:
	var prev_loop := _loop
	_biome_index = (_biome_index + 1) % _biome_classes.size()
	if _biome_index == 0:
		_loop += 1

	# предыдущая локация остаётся на время плавного кроссфейда
	if prev_biome != null:
		_discard_biome_nodes(prev_biome)
	prev_biome = biome
	_demote_biome(prev_biome)
	_trans_t = 0.0

	var cls: GDScript = _biome_classes[_biome_index]
	biome = cls.new(1337 + _loop * 31 + _biome_index * 7)
	_install_biome(biome)
	_biome_start_dist = distance  # скорость и сложность стартуют заново
	_statue_clear_until = -100000.0
	_hearts_this_biome = 0
	# убираем «предыдущую» локацию впереди игрока
	_filter_ahead(_obstacles, _obstacles_root)
	_filter_ahead(_enemies, _enemies_root)
	_filter_ahead(_items, _items_root)
	_filter_ahead(_decors, _items_root)
	# ямы впереди тоже принадлежали старой локации — иначе игрок
	# проваливается под невидимую дыру (фикс бага перехода)
	var kept_pits: Array = []
	for p in _pits:
		if not p.dead and p.x < player.x:
			kept_pits.append(p)
	_pits = kept_pits
	for p in _projectiles:
		p.queue_free()
	_projectiles.clear()
	EventBus.emit("biome:changed", {"biome": biome, "loop": _loop})
	# все три локации пройдены — победа!
	if prev_loop == 0 and _loop == 1:
		EventBus.emit("victory", {"score": score, "distance": distance})


func _filter_ahead(arr: Array, container: Node2D) -> void:
	var kept: Array = []
	for e in arr:
		if e.x < player.x:
			kept.append(e)
		else:
			if e is Pit:
				_pits.erase(e)
			(e as Node).queue_free()
	arr.clear()
	arr.append_array(kept)


# ----------------------------------------------------------------------
# Частицы
# ----------------------------------------------------------------------

## Пыль, искры, кровь врагов.
func spawn_particles(x: float, y: float, color: Color, count := 4, vy0 := -60.0) -> void:
	_particles.spawn_particles(x, y, color, count, vy0)


# ----------------------------------------------------------------------
# Обновление
# ----------------------------------------------------------------------

func update_world(dt: float) -> void:
	time += dt
	biome.tick(dt, camera)
	if prev_biome != null:
		prev_biome.tick(dt, camera)
		_trans_t += dt
		if _trans_t >= FADE_TIME:
			_discard_biome_nodes(prev_biome)
			prev_biome = null
			_bg_cur.modulate.a = 1.0
			_ground_cur.modulate.a = 1.0
			_fg_cur.modulate.a = 1.0
	if prev_biome != null:
		# плавный кроссфейд старой и новой локации (smoothstep)
		var t := Config.clampf_(_trans_t / FADE_TIME, 0.0, 1.0)
		var fade: float = t * t * (3.0 - 2.0 * t)
		_bg_cur.modulate.a = fade
		_ground_cur.modulate.a = fade
		_fg_cur.modulate.a = fade
	_shake = maxf(0.0, _shake - dt)

	player.update(dt)
	player.sync_transform()

	# смена локации
	if distance >= _next_biome_at:
		_next_biome_at += Config.TRANSITION_EVERY
		_next_biome()

	# после смерти генератор молчит: на экране ничего не появляется
	if not player.is_down:
		_generate()

	for o in _obstacles:
		o.update(dt)
		o.sync_transform()
	for e in _enemies:
		e.update(dt)
		e.sync_transform()
	for it in _items:
		it.update(dt)
		it.sync_transform()
	for d in _decors:
		d.update(dt)
		d.sync_transform()
	for p in _projectiles:
		p.update(dt)
		p.sync_transform()

	_collisions()

	# очистка
	var cull: float = camera.x - 90.0
	_cull(_obstacles, cull)
	_cull(_enemies, cull)
	_cull(_items, cull)
	_cull(_decors, cull)
	_cull(_projectiles, cull)
	var kept_pits: Array = []
	for p in _pits:
		if is_instance_valid(p) and not p.dead:
			kept_pits.append(p)
	_pits = kept_pits

	_particles.update_particles(dt)
	_update_camera(dt)

	# камера двигает слот сущностей (и землю/фон — их слои скроллят сами)
	_entities_root.position = Vector2(-camera.x, -camera.y)
	_update_ground_cam(camera.x)


## Скрыть/показать слот сущностей (на заставке только фон и земля).
func set_entities_visible(v: bool) -> void:
	_entities_root.visible = v


## «Дышащий» фон заставки: мир живёт без геймплея (пауза не нужна).
func tick_menu(dt: float, cam_x: float) -> void:
	var cam := {"x": cam_x, "y": 0.0}
	biome.tick(dt, cam)
	if prev_biome != null:
		prev_biome.tick(dt, cam)
	_update_ground_cam(cam_x)


## Земля тянется за камерой.
func _update_ground_cam(cam_x: float) -> void:
	if _ground_cur.get_child_count() > 0:
		var g := _ground_cur.get_child(0) as Ground
		g.cam_x = cam_x
		g.queue_redraw()
	if _ground_prev.get_child_count() > 0:
		var g := _ground_prev.get_child(0) as Ground
		g.cam_x = cam_x
		g.queue_redraw()


func _cull(arr: Array, cull: float) -> void:
	var kept: Array = []
	for e in arr:
		if not e.dead and e.x + e.w > cull:
			kept.append(e)
		else:
			if e is Pit:
				_pits.erase(e)  # кэш земли не хранит удаляемые ямы
			(e as Node).queue_free()
	arr.clear()
	arr.append_array(kept)


func _collisions() -> void:
	var pl := player
	var hb: Dictionary = pl.hitbox()
	var feet: float = pl.y + pl.h

	for arr: Array in [_obstacles, _enemies, _projectiles, _items]:
		for e in arr:
			_check(e, hb, feet)


func _check(e: Entity, hb: Dictionary, feet: float) -> void:
	if e.dead:
		return
	if e is Item:
		if Config.rects_overlap(hb, e.hitbox()):
			(e as Item).on_collect(player)
			e.kill()
			spawn_particles(e.x + e.w / 2.0, e.y + e.h / 2.0, Color.html("#ffe9a8"), 4, -40.0)
		return
	if not e.damage_on_touch():
		return
	if not Config.rects_overlap(hb, e.hitbox()):
		return
	# прыжок на врага (работает и во время неуязвимости — стомп не «теряется»)
	if e.stompable() and player.vy > 0.0 and feet - e.y < 14.0:
		(e as Enemy).on_stomp(player)
		player.bounce()
		return
	if player.invulnerable or player.is_down:
		return
	var hit: bool = player.take_damage(1)
	if hit:
		e.on_hit(player)


func _update_camera(dt: float) -> void:
	var target_x: float = player.x - 62.0
	# после смерти камера замирает (труп лежит на земле — мир не «улетает»)
	var target_y := 0.0
	if not player.is_down:
		target_y = maxf(0.0, (player.y + player.h - Config.GROUND_Y) - 36.0)
	var k: float = minf(1.0, dt * 9.0)
	camera.x += (target_x - camera.x) * k
	camera.y += (target_y - camera.y) * k
	if _shake > 0.0:
		camera.x += (randf() - 0.5) * 3.0
		camera.y += (randf() - 0.5) * 3.0
