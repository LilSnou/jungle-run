#
# Entity — абстрактный базовый класс всех игровых объектов (порт web Entity.js).
#
# ООП-принципы:
# • Абстракция  — update() объявлен пустым: каждый потомок сам решает,
# как он живёт (отрисовка в Godot — спрайт-узел).
# • Инкапсуляция — координаты/размер/смертность спрятаны за полями
# с геттерами-свойствами.
# • Наследование — Player, Enemy, Obstacle, Item наследуют этот класс
# и переопределяют виртуальные методы (полиморфизм).
#
# Координаты x,y — ВЕРХНИЙ ЛЕВЫЙ УГОЛ хитбокса (как в web).
# Node2D.position всегда равен (x, y); спрайт — дочерний узел со смещением.
class_name Entity
extends Node2D

var x := 0.0
var y := 0.0
var w := 0.0
var h := 0.0
var dead := false
var world: Node2D = null   # World (без типизации, чтобы не крутить циклы классов)

var sprite: Sprite2D = null
var _sprite_ax := 0.0      # смещение спрайта (в экранных пикселях)
var _sprite_ay := 0.0


func _init(ex := 0.0, ey := 0.0, ew := 0.0, eh := 0.0) -> void:
	x = ex
	y = ey
	w = ew
	h = eh


## Пометить сущность удалённой.
func kill() -> void:
	dead = true


## Хитбокс для столкновений. Некоторые объекты переопределяют.
func hitbox() -> Dictionary:
	return {"x": x, "y": y, "w": w, "h": h}


## Пересекается ли с другой сущностью.
func overlaps(other: Entity) -> bool:
	return Config.rects_overlap(hitbox(), other.hitbox())


## Обновление состояния (каждый логический кадр). Переопределяют потомки.
func update(dt: float) -> void:
	pass


## Камера «следит» за игроком вертикально, если он падает в яму.
func is_projectile() -> bool:
	return false


func damage_on_touch() -> bool:
	return false


func stompable() -> bool:
	return false


#
# Создать спрайт-узел из горизонтального листа кадров.
# tex_name — файл в assets/sprites; ax/ay — якорь в МИРОВЫХ px
# (сдвиг визуала относительно хитбокса); scale_s — масштаб арт-пикселя
# (1 = 1 мировой px, 0.5 = для арта, сгенерированного «вдвое крупнее»).
func make_sprite(tex_name: String, ax := 0.0, ay := 0.0, flip := false, scale_s := 1.0) -> Sprite2D:
	if sprite != null:
		sprite.queue_free()  # наследники могут подменить спрайт (Vine, RopeTrap...)
	sprite = Art.make_sprite(tex_name, ax, ay, flip, scale_s)
	add_child(sprite)
	_sprite_ax = ax
	_sprite_ay = ay
	return sprite


## Спрайт из готовой текстуры (например, composed-листа игрока).
func make_sprite_from_texture(tex: Texture2D, frames_n: int, ax := 0.0, ay := 0.0, flip := false, scale_s := 1.0) -> Sprite2D:
	if sprite != null:
		sprite.queue_free()
	sprite = Art.make_sprite_from_texture(tex, frames_n, ax, ay, flip, scale_s)
	add_child(sprite)
	_sprite_ax = ax
	_sprite_ay = ay
	return sprite


## Подвинуть спрайт вслед за хитбоксом (вызывается из sync_transform).
func _sync_sprite_offset() -> void:
	if sprite != null:
		sprite.position = Vector2(_sprite_ax, _sprite_ay)


## Синхронизация узла с хитбоксом.
func sync_transform() -> void:
	position = Vector2(roundf(x), roundf(y))
	_sync_sprite_offset()
