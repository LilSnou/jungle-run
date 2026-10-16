#
# Ground — земля текущей локации: тайлы-ленты 16×16 (порт web World.drawGround).
# Раскладка листа tiles_*.png (см. tools/artgen/gen_tiles.py):
#   [0] верх травы/камня A, [1] заполнение A,
#   [2] верх B,             [3] заполнение B —
# колонки чередуются A/B по псевдослучайному знаку, без «крапинок»:
# детали уже вшиты в арт тайлов.
class_name Ground
extends Node2D

var biome: Biome
var cam_x := 0.0


func _init(b: Biome) -> void:
	biome = b


func _draw() -> void:
	var tex := Art.tiles(biome.tiles_name())
	var gy := float(Config.GROUND_Y)
	# колонки тайлов от -1 до +21 — полоса шире экрана
	var start_col := int(floor(cam_x / 16.0)) - 1
	for i in range(start_col, start_col + 22):
		var sx := i * 16.0 - cam_x
		# вариант A/B у колонки: псевдослучайно, но детерминированно по X
		var b := absi(i * 5 + 1) % 2
		var top_cell := b * 2          # 0 (верх A) или 2 (верх B)
		var fill_cell := 1 + b * 2     # 1 (заполнение A) или 3 (заполнение B)
		draw_texture_rect_region(tex, Rect2(sx, gy, 16, 16), Rect2i(top_cell * 16, 0, 16, 16))
		# ряды заполнения под верхом — до низа экрана (+1 в запас)
		for r in range(1, 3):
			var sy := gy + 16.0 * float(r)
			if sy >= float(Config.HEIGHT):
				break
			draw_texture_rect_region(tex, Rect2(sx, sy, 16, 16), Rect2i(fill_cell * 16, 0, 16, 16))
