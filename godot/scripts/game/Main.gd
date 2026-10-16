#
# Main — корневой узел и конечный автомат состояний (паттерн «Состояние»,
# порт Game.js). Состояния: menu → play ⇄ pause, play → over | victory.
#
# Здесь же: цикл фиксированного шага (1/60 с), тач-роутинг (правая половина
# экрана сверху — прыжок, левая нижняя четверть — скольжение, углы —
# пауза/динамик), звуковая «проводка» событий и хранение рекорда.
extends Node2D

const STEP := 1.0 / 60.0

var world: World
var hud: HUD
var overlay: Overlay
var states := {}
var state: GameState
var best := 0
var _acc := 0.0
var _pointer_releases := {}


## Узел-оверлей поверх HUD: рисует поверхности состояний и кнопку паузы.
class Overlay extends Node2D:
	var main = null  # Main (без типизации — замкнутый контур создания)

	func _draw() -> void:
		if main == null or main.state == null:
			return
		main.state.draw(self)
		if main.state.wants_pause_button:
			PauseButton.draw(self, main.state is PauseState, AudioManager.muted)


func _ready() -> void:
	world = World.new()
	add_child(world)
	hud = HUD.new()
	hud.world = world
	add_child(hud)
	overlay = Overlay.new()
	overlay.main = self
	add_child(overlay)
	states = {
		"menu": MenuState.new(self),
		"play": PlayState.new(self),
		"pause": PauseState.new(self),
		"over": OverState.new(self),
		"victory": VictoryState.new(self),
	}
	best = _load_best()
	_bind_events()
	set_state("menu")


# ----------------------------------------------------------------------
# Звуковая «проводка»: события мира -> чиптюновые эффекты
# ----------------------------------------------------------------------

func _bind_events() -> void:
	EventBus.on("player:jump", _sfx_jump)
	EventBus.on("player:doubleJump", _sfx_double_jump)
	EventBus.on("player:slide", _sfx_slide)
	EventBus.on("player:hurt", _sfx_hurt)
	EventBus.on("player:fall", _sfx_fall)
	EventBus.on("player:dead", _sfx_game_over)
	EventBus.on("enemy:stomped", _sfx_stomp)
	EventBus.on("warrior:throw", _sfx_click)
	EventBus.on("enemy:alert", _sfx_click)
	EventBus.on("idol:collected", _sfx_coin)
	EventBus.on("biome:changed", _on_biome_changed)
	EventBus.on("victory", _on_victory)
	EventBus.on("ui:pause", _on_ui_pause)


func _sfx_jump(_p) -> void:
	AudioManager.play("jump")


func _sfx_double_jump(_p) -> void:
	AudioManager.play("doublejump")


func _sfx_slide(_p) -> void:
	AudioManager.play("slide")


func _sfx_hurt(_p) -> void:
	AudioManager.play("hurt")


func _sfx_fall(_p) -> void:
	AudioManager.play("fall")


func _sfx_game_over(_p) -> void:
	AudioManager.play("gameover")


func _sfx_stomp(_p) -> void:
	AudioManager.play("stomp")


func _sfx_click(_p) -> void:
	AudioManager.play("click")


func _sfx_coin(p) -> void:
	if not (p is Dictionary and p.get("silent", false)):
		AudioManager.play("coin")


func _on_biome_changed(p) -> void:
	AudioManager.play("biome")
	if p is Dictionary and p.get("biome", null) != null:
		AudioManager.play_song(p.biome.track())


func _on_victory(_p) -> void:
	if state == states.get("play"):
		set_state("victory")


func _on_ui_pause(_p) -> void:
	if state == states.get("play"):
		set_state("pause")
	elif state == states.get("pause"):
		set_state("play")


# ----------------------------------------------------------------------
# Состояния и забег
# ----------------------------------------------------------------------

func set_state(key: String) -> void:
	if state != null:
		state.exit()
	state = states[key]
	state.enter()


func start_run() -> void:
	world.reset()
	AudioManager.play("start")
	EventBus.emit("biome:changed", {"biome": world.biome, "loop": 0})
	set_state("play")


func final_score() -> int:
	return world.score + world.distance


# ----------------------------------------------------------------------
# Рекорд
# ----------------------------------------------------------------------

func _load_best() -> int:
	var cf := ConfigFile.new()
	if cf.load("user://jungle_run.cfg") == OK:
		return int(cf.get_value("run", "best", 0))
	return 0


func save_best(v: int) -> void:
	best = maxi(best, v)
	var cf := ConfigFile.new()
	cf.set_value("run", "best", best)
	cf.save("user://jungle_run.cfg")


# ----------------------------------------------------------------------
# Цикл: физика фиксированного шага, перерисовка узлов-оверлеев
# ----------------------------------------------------------------------

func _process(delta: float) -> void:
	_acc += minf(delta, 0.1)
	while _acc >= STEP:
		if state != null:
			state.update(STEP)
		InputManager.end_frame()
		_acc -= STEP
	if hud != null:
		hud.queue_redraw()
	if overlay != null:
		overlay.queue_redraw()


## Свернутое окно / потеря фокуса — автоматическая пауза.
func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if state == states.get("play"):
			set_state("pause")


# ----------------------------------------------------------------------
# Ввод: тачи и мышь (мышь = «палец» для десктопных тестов)
# ----------------------------------------------------------------------

func _input(event: InputEvent) -> void:
	var pressed := false
	var released := false
	var idx := 0
	var p := Vector2.ZERO
	if event is InputEventScreenTouch:
		pressed = event.pressed
		released = not event.pressed
		idx = event.index
		p = event.position
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		pressed = event.pressed
		released = not event.pressed
		p = event.position
	if not (pressed or released):
		return
	# координаты канваса 320x180 (в режиме canvas_items они и есть вьюпорт)
	var vp := get_viewport_rect().size
	if vp.x > 0.0 and vp.y > 0.0:
		p = Vector2(p.x * float(Config.WIDTH) / vp.x, p.y * float(Config.HEIGHT) / vp.y)

	if released:
		if _pointer_releases.has(idx):
			(_pointer_releases[idx] as Callable).call()
			_pointer_releases.erase(idx)
		return

	# --- нажатие ---
	var zone := PauseButton.hit(p.x, p.y)
	if zone == "mute":
		AudioManager.toggle_mute()
		return
	if zone == "pause":
		EventBus.emit("ui:pause")
		# в игре/паузе зона обработана — тап больше ничего не двигает
		if state == states.get("play") or state == states.get("pause"):
			return
	# тап двигает неигровые состояния (как pointerdown в вебе)
	if state == states.get("menu"):
		start_run()
		return
	if state == states.get("pause"):
		set_state("play")
		return
	if state == states.get("over") and state.can_retry():
		start_run()
		return
	if state == states.get("victory") and state.can_retry():
		start_run()
		return
	# игровые зоны: правая половина сверху — прыжок, левая нижняя четверть — скольжение
	if state == states.get("play") and zone == "":
		var action := ""
		if p.y > float(Config.HEIGHT) * 0.34 and p.x > float(Config.WIDTH) * 0.5:
			action = "jump"
		elif p.y > float(Config.HEIGHT) * 0.5 and p.x <= float(Config.WIDTH) * 0.5:
			action = "slide"
		if action != "":
			_pointer_releases[idx] = InputManager.bind_pointer(idx, action)
