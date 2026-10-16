#
# Art — «фабрика спрайтов» (Factory Method), порт web SpriteStore.js.
#
# Загружает готовые пиксель-арт PNG (см. tools/artgen/generate.py),
# кэширует текстуры и собирает Sprite2D с нужным количеством кадров.
# Все листы — горизонтальные полосы кадров одинаковой ячейки.
extends Node

const SHEET_DIR := "res://assets/sprites/"
const BG_DIR := "res://assets/bg/"
const TILE_DIR := "res://assets/tiles/"

# Контракт ячеек: имя листа -> [ширина, высота в арт-пикселях, кадров]
const CELLS := {
	"player_run": [16, 18, 8],
	"player_jump": [16, 18, 1],
	"player_slide": [16, 18, 1],
	"player_hurt": [16, 18, 1],
	"player_dead": [16, 18, 1],
	"player_stand_jungle": [16, 18, 1],
	"player_stand_village": [16, 18, 1],
	"player_stand_temple": [16, 18, 1],
	"snake": [14, 14, 4],
	"bat": [14, 8, 4],
	"jaguar": [16, 14, 6],
	"warrior": [16, 15, 4],
	"idol": [8, 8, 4],
	"spear": [12, 4, 1],
	"log1": [48, 18, 1],
	"log2": [48, 18, 1],
	"vine1": [48, 18, 1],
	"ropetrap": [56, 24, 1],
	"statue": [24, 60, 1],
	"spikes": [16, 14, 1],
	"stonebeam": [48, 16, 1],
	"diamond": [28, 20, 2],
	"decor_mushroom": [6, 8, 1],
	"decor_fern": [8, 10, 1],
	"decor_skull": [6, 8, 1],
	"decor_rune": [4, 8, 3],
	"decor_butterfly": [8, 6, 2],
}

var _strips := {}       # имя -> Texture2D
var _bg := {}           # имя файла -> Texture2D
var _tiles := {}        # имя -> Texture2D
var _composed := {}     # ключ биома -> composed-лист игрока


## Текстура спрайт-листа (с плейсхолдером, если файла ещё нет).
func strip(name: String) -> Texture2D:
	if _strips.has(name):
		return _strips[name]
	var path: String = SHEET_DIR + name + ".png"
	var tex: Texture2D = null
	if FileAccess.file_exists(path):
		tex = load(path)
	if tex == null:
		var c: Array = CELLS.get(name, [8, 8, 1])
		var img := Image.create(c[0] * c[2], c[1], false, Image.FORMAT_RGBA8)
		img.fill(Color.MAGENTA)  # плейсхолдер: ассет не сгенерирован
		tex = ImageTexture.create_from_image(img)
	_strips[name] = tex
	return tex


## Размер ячейки [w, h, кадров].
func cell(name: String) -> Array:
	return CELLS.get(name, [8, 8, 1])


## Собрать Sprite2D из листа. ax/ay — якорь В МИРОВЫХ px (сдвиг визуала
## относительно хитбокса); scale_s — масштаб арт-пикселя (1 = 1 мировой px,
## 0.5 = арт «вдвое детальнее» мира, см. контракт §4).
func make_sprite(name: String, ax := 0.0, ay := 0.0, flip := false, scale_s := 1.0) -> Sprite2D:
	var c: Array = cell(name)
	return make_sprite_from_texture(strip(name), c[2], ax, ay, flip, scale_s)


## Собрать Sprite2D из готовой текстуры с числом кадров.
## Якорь задаётся позицией узла (Entity._sync_sprite_offset), НЕ offset'ом —
## так масштаб не «умножает» смещение.
func make_sprite_from_texture(tex: Texture2D, frames_n: int, ax := 0.0, ay := 0.0, flip := false, scale_s := 1.0) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = tex
	s.hframes = maxi(1, frames_n)
	s.centered = false
	s.offset = Vector2.ZERO
	s.position = Vector2(ax, ay)
	s.scale = Vector2(scale_s, scale_s)
	s.flip_h = flip
	return s


## Слои фона: полное имя файла (например "bg_jungle_sky.png").
func tex_bg(file_name: String) -> Texture2D:
	if _bg.has(file_name):
		return _bg[file_name]
	var path: String = BG_DIR + file_name
	var tex: Texture2D = null
	if FileAccess.file_exists(path):
		tex = load(path)
	if tex == null:
		var img := Image.create(8, 8, false, Image.FORMAT_RGBA8)
		img.fill(Color.MAGENTA)
		tex = ImageTexture.create_from_image(img)
	_bg[file_name] = tex
	return tex


## Тайлы земли биома ("jungle" -> tiles_jungle.png).
func tiles(name: String) -> Texture2D:
	if _tiles.has(name):
		return _tiles[name]
	var path: String = TILE_DIR + "tiles_" + name + ".png"
	var tex: Texture2D = null
	if FileAccess.file_exists(path):
		tex = load(path)
	if tex == null:
		var img := Image.create(64, 16, false, Image.FORMAT_RGBA8)
		img.fill(Color.MAGENTA)
		tex = ImageTexture.create_from_image(img)
	_tiles[name] = tex
	return tex


## Composed-лист игрока: бег×8, jump, slide, hurt, dead, стойка локации
## (13 кадров). Стойка зависит от текущей локации — палитра биома.
func composed_player(biome_key := "jungle") -> Texture2D:
	if _composed.has(biome_key):
		return _composed[biome_key]
	var cell_w := 16
	var cell_h := 18
	var names := ["player_run", "player_jump", "player_slide", "player_hurt",
		"player_dead", "player_stand_" + biome_key]
	var total := 0
	var images: Array[Image] = []
	for n in names:
		var t := strip(n)
		var im := t.get_image()
		images.append(im)
		total += maxi(1, im.get_width() / cell_w)
	var out := Image.create(total * cell_w, cell_h, false, Image.FORMAT_RGBA8)
	out.fill(Color(0, 0, 0, 0))
	var col := 0
	for im in images:
		var src_w: int = im.get_width()
		for i in src_w / cell_w:
			# источник — ЛОКАЛЬНЫЕ координаты листа, приёмник — колонка в итоге
			var src := Rect2i(i * cell_w, 0, cell_w, cell_h)
			out.blit_rect(im, src, Vector2i(col * cell_w, 0))
			col += 1
	_composed[biome_key] = ImageTexture.create_from_image(out)
	return _composed[biome_key]
