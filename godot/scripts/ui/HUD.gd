#
# HUD — heads-up display: жизни, очки, метры, название локации,
# всплывающие сообщения (порт HUD.js). Подписан на события мира (Observer):
# сама не лезет в World за «кнопками», только читает состояние.
class_name HUD
extends Node2D

var world: World = null

var _message := ""
var _message_sub := ""
var _message_timer := 0.0
var _flash := 0.0


func _ready() -> void:
	EventBus.on("biome:changed", _on_biome_changed)
	EventBus.on("player:hurt", _on_hurt)


func _exit_tree() -> void:
	EventBus.off("biome:changed", _on_biome_changed)
	EventBus.off("player:hurt", _on_hurt)


func _on_biome_changed(p) -> void:
	_message = p.biome.name_ru()
	_message_sub = "КРУГ %d" % (p.loop + 1) if p.loop > 0 else ""
	_message_timer = 2.2


func _on_hurt(_p) -> void:
	_flash = 0.25


func update(dt: float) -> void:
	_message_timer = maxf(0.0, _message_timer - dt)
	_flash = maxf(0.0, _flash - dt)
	queue_redraw()


func _draw() -> void:
	if world == null:
		return
	var W := float(Config.WIDTH)

	# верхняя панель
	draw_rect(Rect2(0, 0, W, 22), Color(0.039, 0.031, 0.063, 0.45))

	# жизни: три пиксельных «сердечка»-квадратика (пустые — потерянные)
	for i in 3:
		draw_life_block(self, 6 + i * 12, 6, i < world.player.lives)

	# очки и метры
	PixelFont.draw(self, "ОЧКИ %d" % world.score, W / 2.0, 4, {"align": "center", "shadow": "#141220"})
	PixelFont.draw(self, "%d М" % world.distance, W / 2.0, 14,
		{"align": "center", "color": "#c9c2ad", "shadow": "#141220"})

	# скорость/сложность — тонкая полоска справа
	var diff_w := 40.0
	draw_rect(Rect2(W - diff_w - 52, 8, diff_w, 5), Color(0.039, 0.031, 0.063, 0.5))
	draw_rect(Rect2(W - diff_w - 52, 8, roundf(diff_w * world.difficulty()), 5), Color.html("#c9832e"))

	# красная вспышка при уроне
	if _flash > 0.0:
		draw_rect(Rect2(0, 0, W, Config.HEIGHT), Color(0.69, 0.188, 0.153, _flash * 0.9))

	# сообщение о новой локации
	if _message_timer > 0.0:
		var t := _message_timer
		var alpha := Config.clampf_((2.2 - t) * 3.0 if t > 1.9 else minf(1.0, t), 0.0, 1.0)
		draw_rect(Rect2(0, 70, W, 40), Color(0.039, 0.031, 0.063, 0.6 * alpha))
		# текст с собственной альфой
		PixelFont.draw(self, _message, W / 2.0, 78,
			{"align": "center", "scale": 3, "color": Color(Color.html("#f2e2b0"), alpha),
				"shadow": Color(Color.html("#141220"), alpha)})
		if _message_sub != "":
			PixelFont.draw(self, _message_sub, W / 2.0, 102,
				{"align": "center", "color": Color(Color.html("#c9832e"), alpha),
					"shadow": Color(Color.html("#141220"), alpha)})


## Пиксельный квадратик жизни (HUD вместо сердечек-предметов):
## рамка + светлая шапка сверху-слева. alive=false — пустой слот.
static func draw_life_block(canvas: CanvasItem, x: float, y: float, alive := true) -> void:
	var base := Color.html("#c8322a") if alive else Color.html("#33303e")
	var hi := Color.html("#ef6a5c") if alive else Color.html("#43404f")
	var sh := Color.html("#7d1c15") if alive else Color.html("#26232f")
	canvas.draw_rect(Rect2(x, y, 8, 8), base)
	canvas.draw_rect(Rect2(x, y, 8, 2), hi)
	canvas.draw_rect(Rect2(x, y, 2, 8), hi)
	canvas.draw_rect(Rect2(x, y + 6, 8, 2), sh)
	canvas.draw_rect(Rect2(x + 6, y, 2, 8), sh)
