#
# GameState — абстрактное состояние игры (паттерн «Состояние», порт Game.js).
# Конкретные состояния (меню, игра, пауза, конец, победа) наследуют его
# и сами решают, как обновляться и что рисовать поверх мира.
class_name GameState
extends RefCounted

## Ссылка на Main (без типизации: Main создаёт состояния, замкнутый контур).
var main = null
## Рисовать ли кнопку паузы в правом верхнем углу (меню/игра/пауза — да).
var wants_pause_button := true


func _init(game) -> void:
	main = game


func enter() -> void:
	pass


func exit() -> void:
	pass


## Шаг фиксированной физики (1/60 с).
func update(_dt: float) -> void:
	pass


## Оверлей поверх мира (вызывается из _draw узла-overlay).
func draw(_canvas: CanvasItem) -> void:
	pass


## Можно ли начать забег по тапу (для экранов конца/победы — не сразу).
func can_retry() -> bool:
	return false
