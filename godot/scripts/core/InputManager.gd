#
# InputManager — единый ввод (клавиатура + тач), порт web/js/core/Input.js.
#
# Скруглённый интерфейс: остальной код не знает про клавиши или координаты
# касаний — только игровые действия «jump», «slide», «pause».
# Паттерн: «Быстрое решение» (Facade) поверх устройств ввода.
extends Node

var _held := {"jump": false, "slide": false, "pause": false}
var _pressed := {}
var _released := {}
var _pointers := {}          # индекс касания -> действие (мультитач)
var _first_interaction := false


func _ready() -> void:
	# Веб-версия: window keydown/keyup. Здесь: глобальный ввод.
	pass


## Обработка клавиатуры (тач роутит Main — он знает зоны и состояния).
func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.physical_keycode != KEY_NONE:
		var action := _map_key(event.physical_keycode)
		if action != "":
			get_viewport().set_input_as_handled()
			if event.pressed and not event.echo:
				press(action)
			elif not event.pressed:
				release(action)
			_fire()
		if event.pressed and event.physical_keycode == KEY_M:
			EventBus.emit("audio:toggle")
		if event.pressed and event.physical_keycode == KEY_BACK:
			# Android: кнопка «назад» = пауза
			press("pause")
			release("pause")
			_fire()


static func _map_key(code: Key) -> String:
	match code:
		KEY_SPACE, KEY_UP, KEY_W, KEY_X:
			return "jump"
		KEY_DOWN, KEY_S:
			return "slide"
		KEY_ESCAPE, KEY_P:
			return "pause"
	return ""


## Первый жест — «разблокируем» аудио.
func _fire() -> void:
	if not _first_interaction:
		_first_interaction = true
		EventBus.emit("input:first")


## Виртуальное нажатие (из тач-зон или клавиатуры).
func press(action: String) -> void:
	if not _held[action]:
		_held[action] = true
		_pressed[action] = true
		_fire()


## Виртуальное отпускание.
func release(action: String) -> void:
	if _held[action]:
		_held[action] = false
		_released[action] = true


## Кнопка удерживается.
func is_down(action: String) -> bool:
	return _held.get(action, false)


## Кнопка была нажата в этом кадре.
func was_pressed(action: String) -> bool:
	return _pressed.get(action, false)


## Кнопка была отпущена в этом кадре.
func was_released(action: String) -> bool:
	return _released.get(action, false)


## Мультитач: привязать указатель к действию на время касания.
## Возвращает Callable, отпускающую действие.
func bind_pointer(pointer_id: int, action: String) -> Callable:
	press(action)
	_pointers[pointer_id] = action
	return func() -> void:
		if _pointers.get(pointer_id) == action:
			_pointers.erase(pointer_id)
			release(action)


## Сброс «кадровых» событий — вызывается в конце кадра.
func end_frame() -> void:
	_pressed.clear()
	_released.clear()
