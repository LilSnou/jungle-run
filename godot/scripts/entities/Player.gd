#
# Player — главный герой в духе Индианы Джонса (порт web Player.js).
#
# Наследует Entity, переопределяя update() (полиморфизм). Инкапсуляция:
# вся физика (вертикальная скорость, прыжки, скольжение, здоровье)
# спрятана за приватными полями.
#
# Механики паркура:
# • прыжок (с «кайот-таймом» и буфером нажатия — как в хороших платформерах)
# • двойной прыжок
# • скольжение под низкими брёвнами (пока кнопка удерживается)
# • прыжок на голову врага (stomp) с отскоком
class_name Player
extends Entity

const STAND_H := 16
const SLIDE_H := 7
const STAND_W := 10
const SLIDE_W := 12
const SLIDE_MAX := 5.0      # с — максимум непрерывного скольжения
const SLIDE_COOLDOWN := 0.8 # с — пауза после лимита до следующего приседа

# Кадры composed-листа Art.composed_player():
const F_RUN := 0     # +8 кадров цикла бега
const F_JUMP := 8
const F_SLIDE := 9
const F_HURT := 10
const F_DEAD := 11
const F_IDLE := 12

var _vy := 0.0
var _on_ground := true
var _jumps_left := 1
var _coyote := 0.0
var _buffer := 0.0
var _sliding := false
var _slide_time := 0.0    # сколько секунд уже скользим (лимит SLIDE_MAX)
var _slide_cooldown := 0.0 # пауза после лимита — нельзя «шагать» приседом
var _invuln := 0.0
var _knock := 0.0
var _anim_time := 0.0
var _lives := Config.START_LIVES
var _max_lives := Config.START_LIVES
var _dust_timer := 0.0
var _is_down := false


func _init(ex := Config.START_X, ey := float(Config.GROUND_Y - STAND_H)) -> void:
	super(ex, ey, STAND_W, STAND_H)
	# арт 16x18 ≈ хитбокс 10x16: якорь центрирует рисунок, низ совпадает
	make_sprite_from_texture(Art.composed_player(), 13, -3.0, -2.0)


## Сменить палитру стойки под текущую локацию (бег/прыжки — общий лист).
func set_biome(biome_key: String) -> void:
	if sprite != null:
		sprite.texture = Art.composed_player(biome_key)


var vy: float:
	get:
		return _vy


var on_ground: bool:
	get:
		return _on_ground


var sliding: bool:
	get:
		return _sliding


var invulnerable: bool:
	get:
		return _invuln > 0.0
	set(v):
		_invuln = 3600.0 if v else 0.0


var lives: int:
	get:
		return _lives


var is_down: bool:
	get:
		return _is_down


var invuln_time: float:
	get:
		return _invuln


## Сброс всех состояний (рестарт уровня/игры).
func reset(ex: float, ey: float) -> void:
	x = ex
	y = ey
	w = STAND_W
	h = STAND_H
	_vy = 0.0
	_on_ground = true
	_jumps_left = 1
	_coyote = 0.0
	_buffer = 0.0
	_sliding = false
	_slide_time = 0.0
	_slide_cooldown = 0.0
	_invuln = 0.0
	_knock = 0.0
	_is_down = false
	_lives = _max_lives


## Нанести урон (шипы, враги, статуя).
func take_damage(amount := 1) -> bool:
	if _invuln > 0.0 or _is_down:
		return false
	_lives -= amount
	_invuln = Config.INVULN_TIME
	_knock = Config.KNOCKBACK_TIME
	_vy = -160.0
	EventBus.emit("player:hurt")
	if _lives <= 0:
		_lives = 0
		_is_down = true
		EventBus.emit("player:dead")
	return true


## Подобрать сердечко.
func heal() -> bool:
	if _lives < _max_lives:
		_lives += 1
		return true
	return false


## Отскок после прыжка на врага.
func bounce() -> void:
	_vy = Config.STOMP_BOUNCE
	_jumps_left = 1


## Возрождение после падения в яму (рядом с ямой).
func respawn(ex: float) -> void:
	x = ex
	y = Config.GROUND_Y - h
	_vy = 0.0
	_on_ground = true
	_invuln = maxf(_invuln, Config.INVULN_TIME)


func _try_jump() -> bool:
	if _on_ground or _coyote > 0.0:
		_vy = Config.JUMP_VELOCITY
		_on_ground = false
		_coyote = 0.0
		_jumps_left = 1
		_stop_slide()
		EventBus.emit("player:jump")
		return true
	if _jumps_left > 0:
		_vy = Config.JUMP_VELOCITY * Config.DOUBLE_JUMP_FACTOR
		_jumps_left -= 1
		EventBus.emit("player:doubleJump")
		return true
	return false


func _start_slide() -> void:
	if _sliding or _slide_cooldown > 0.0:
		return
	_sliding = true
	_slide_time = 0.0
	y += STAND_H - SLIDE_H
	h = SLIDE_H
	w = SLIDE_W
	EventBus.emit("player:slide")


func _stop_slide() -> void:
	if not _sliding:
		return
	_sliding = false
	y -= STAND_H - SLIDE_H
	h = STAND_H
	w = STAND_W


func update(dt: float) -> void:
	var input := InputManager

	if _is_down:
		_vy += Config.GRAVITY * dt
		y += _vy * dt
		# труп ложится на землю и замирает — камера не летит за ним вниз
		if y + h >= Config.GROUND_Y:
			y = Config.GROUND_Y - h
			_vy = 0.0
		_update_sprite_frame()
		return

	# --- горизонталь: герой автоматически бежит вправо ---
	var speed: float = world.speed
	if _knock > 0.0:
		speed *= 0.55
	x += speed * dt

	# --- буфер нажатия и кайот-тайм ---
	if input.was_pressed("jump"):
		_buffer = Config.JUMP_BUFFER
	if _buffer > 0.0:
		if _try_jump():
			_buffer = 0.0
	_buffer = maxf(0.0, _buffer - dt)
	_coyote = maxf(0.0, _coyote - dt)

	# --- скольжение (кнопка удерживается; вставать под бревном нельзя;
	#     непрерывное скольжение ограничено SLIDE_MAX секундами) ---
	if _on_ground and input.is_down("slide") and not input.was_pressed("jump"):
		_start_slide()
	elif _sliding and not input.is_down("slide") and not world.has_overhead(self):
		_stop_slide()
	if _sliding:
		_slide_time += dt
		if _slide_time >= SLIDE_MAX and not world.has_overhead(self):
			_stop_slide()
			_slide_cooldown = SLIDE_COOLDOWN

	# --- гравитация ---
	_vy += Config.GRAVITY * dt
	y += _vy * dt

	var feet_x := x + w * 0.5
	var has_ground: bool = world.is_ground_at(feet_x)
	if has_ground and y + h >= Config.GROUND_Y and _vy >= 0.0:
		var was_air := not _on_ground
		y = Config.GROUND_Y - h
		_vy = 0.0
		_on_ground = true
		_jumps_left = 1
		if was_air:
			EventBus.emit("player:land")
	else:
		_on_ground = false

	# --- падение в яму (урон НАНОСИМ ДО возрождения: respawn ставит
	#     неуязвимость, и take_damage после него заблокировался бы) ---
	if y > Config.GROUND_Y + 90:
		EventBus.emit("player:fall")
		var respawn_x: float = world.find_safe_ground(x)
		take_damage(1)
		respawn(respawn_x)

	# --- таймеры ---
	_invuln = maxf(0.0, _invuln - dt)
	_knock = maxf(0.0, _knock - dt)
	_slide_cooldown = maxf(0.0, _slide_cooldown - dt)
	_anim_time += dt

	# --- пыль под ногами и от скольжения ---
	_dust_timer -= dt
	if _dust_timer <= 0.0:
		if _sliding:
			world.spawn_particles(x, y + h, Color.html("#d9c9a3"), 2, -60.0)
			_dust_timer = 0.06
		elif _on_ground:
			world.spawn_particles(x, y + h - 1.0, Color.html("#c7b58d"), 1, -30.0)
			_dust_timer = 0.18
		else:
			_dust_timer = 0.2

	_update_sprite_frame()


## Какой кадр анимации показывать. Мигание при неуязвимости НЕ
## используется (фидбэк дают звук + HUD-вспышка): кадр «ранен» + таймер.
func _update_sprite_frame() -> void:
	if sprite == null:
		return
	sprite.visible = true
	var f := F_RUN
	if _is_down:
		f = F_DEAD
	elif _sliding:
		f = F_SLIDE
	elif not _on_ground:
		f = F_JUMP
	elif _invuln > 0.9:
		f = F_HURT
	else:
		f = F_RUN + (int(_anim_time * 12.0) % 8)
	# Якорь: НИЗ рисунка (16 или слайд-кадр) совпадает с низом хитбокса —
	# герой стоит на земле, а не «тонет» в грунте; по X — центрирование.
	_sprite_ax = -2.0 if _sliding else -3.0
	_sprite_ay = float(SLIDE_H - 18) if _sliding else -2.0
	sprite.frame = f
	_sync_sprite_offset()
