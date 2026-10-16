#
# EventBus — паттерн «Наблюдатель» (Observer), порт web/js/core/EventBus.js.
#
# Все части игры общаются через события, не зная друг о друге напрямую:
# игрок не знает про HUD; HUD подписывается на 'biome:changed'.
extends Node

var _listeners := {}


## Подписка на событие.
func on(type: String, fn: Callable) -> void:
	if not _listeners.has(type):
		_listeners[type] = []
	(_listeners[type] as Array).append(fn)


## Отписка.
func off(type: String, fn: Callable) -> void:
	if _listeners.has(type):
		var idx: int = (_listeners[type] as Array).find(fn)
		if idx >= 0:
			(_listeners[type] as Array).remove_at(idx)


## Рассылка события всем подписчикам.
func emit(type: String, payload = null) -> void:
	if _listeners.has(type):
		for fn in (_listeners[type] as Array).duplicate():
			fn.call(payload)


## Полная очистка (при рестарте).
func clear() -> void:
	_listeners.clear()
