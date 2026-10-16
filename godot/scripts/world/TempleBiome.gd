#
# TempleBiome — ночная пирамида-храм майя (порт web Temple.js):
# звёзды, луна, ступенчатые пирамиды, стены с масками и рунами,
# колонны, факелы, лианы, черепа, пылинки, угольки и падающие листья.
class_name TempleBiome
extends Biome

var _stars: Node2D = null
var _runes: Node2D = null
var _torches: Node2D = null
var _pyramids: Node2D = null
var _vines: Node2D = null


func _init(seed_: int = 1) -> void:
	super(seed_)
	add_layer("bg_temple_sky.png", 0.0, 0.0)
	_stars = add_layer("bg_temple_stars.png", 0.03, 0.0)
	add_layer("bg_temple_moon.png", 0.03, 12.0)
	add_layer("bg_temple_pyramids_far.png", 0.14, 0.0)
	_pyramids = add_layer("bg_temple_pyramids.png", 0.3, 0.0)
	add_layer("bg_temple_wall.png", 0.55, 126.0, 28.0)
	add_layer("bg_temple_masks.png", 0.55, 130.0)
	_runes = add_layer("bg_temple_runes.png", 0.55, 132.0)
	add_layer("bg_temple_columns.png", 0.68, 0.0)
	_torches = add_layer("bg_temple_torches.png", 0.8, 114.0)
	_vines = add_layer("bg_temple_vines.png", 0.9, 0.0)
	add_layer("bg_temple_skulls.png", 0.9, 0.0)
	# передний план
	add_layer("fg_temple_rubble.png", 1.15, float(Config.GROUND_Y + 2), 90.0, fg_root)
	add_layer("fg_temple_vignette.png", 0.0, 0.0, 0.0, fg_root)
	ground = Ground.new(self)

	var dust: Array = []
	for i in 6:
		dust.append(i)
	var embers: Array = []
	for i in 4:
		embers.append(i)
	var leaves: Array = []
	for i in 5:
		leaves.append(i)
	make_fx("temple", {"dust": dust, "embers": embers, "leaves": leaves})


func tick(dt: float, cam: Dictionary) -> void:
	super(dt, cam)
	if _stars != null:
		_stars.modulate.a = 0.75 + 0.25 * sin(time * 1.7)
	if _runes != null:
		_runes.modulate.a = 0.68 + 0.32 * absf(sin(time * 3.0))
	if _torches != null:
		_torches.modulate.a = 0.86 + 0.14 * absf(sin(time * 13.0))
	if _pyramids != null:
		_pyramids.modulate.a = 0.94 + 0.06 * sin(time * 2.0)
	if _vines != null:
		_vines.position.y = roundf(sin(time * 1.1) * 2.0)


func name_ru() -> String:
	return "ХРАМ"


func track() -> String:
	return "temple"


func tiles_name() -> String:
	return "temple"


func ground_line() -> Color:
	return Color.html("#8a9099")


func ground_top() -> Color:
	return Color.html("#6a6f78")


func ground_dirt() -> Color:
	return Color.html("#4a4e56")


func ground_shade() -> Color:
	return Color.html("#3a3d44")


func decor_table() -> Array:
	# храм: черепа-обереги и пульсирующие руны на полу
	return [
		{"weight": 2.0, "value": {"type": "skull"}},
		{"weight": 3.5, "value": {"type": "rune"}},
	]


func get_pattern(d: float) -> Dictionary:
	# Храм: шипы, статуи, балки, каменные катки, ямы, воины и мыши
	var table: Array = [
		{"weight": 2.5, "value": {"length": 110.0, "spawns": [], "items": Biome.idol_arc(40, 5, 30)}},
		{"weight": 3.0, "value": {"length": 145.0, "spawns": [{"type": "spikes", "at": 60.0}],
			"items": Biome.idol_arc(50, 5, 48)}},
		{"weight": 3.0, "value": func(dd: float) -> Dictionary: return {"length": 160.0, "spawns": [{"type": "pit", "at": 50.0, "w": 44.0 if dd > 0.4 else 38.0}], "items": Biome.idol_arc(44, 4, 48)}},
		{"weight": 3.0, "value": {"length": 150.0, "spawns": [{"type": "beam", "at": 70.0}],
			"items": [{"type": "idol", "at": 60.0, "alt": 0}, {"type": "idol", "at": 72.0, "alt": 0},
				{"type": "idol", "at": 84.0, "alt": 0}]}},
		{"weight": 2.5 if d > 0.25 else 0.0, "value": {"length": 200.0,
			"spawns": [{"type": "statue", "at": 110.0}], "items": []}},
		{"weight": 2.5 if d > 0.2 else 0.0, "value": {"length": 190.0,
			"spawns": [{"type": "warrior", "at": 120.0}], "items": []}},
		{"weight": 2.0 if d > 0.3 else 0.0, "value": {"length": 210.0,
			"spawns": [{"type": "statue", "at": 70.0}, {"type": "spikes", "at": 150.0}], "items": []}},
		{"weight": 2.0 if d > 0.2 else 0.0, "value": {"length": 215.0,
			"spawns": [{"type": "beam", "at": 58.0}, {"type": "beam", "at": 87.0}],
			"items": [{"type": "idol", "at": 54.0, "alt": 0}, {"type": "idol", "at": 72.0, "alt": 0},
				{"type": "idol", "at": 91.0, "alt": 0}]}},
		{"weight": 2.0 if d > 0.35 else 0.0, "value": func(dd: float) -> Dictionary: return {"length": 175.0, "spawns": ([{"type": "bat", "at": 100.0, "alt": 19.0}, {"type": "bat", "at": 134.0, "alt": 19.0}] if dd > 0.6 else [{"type": "bat", "at": 100.0, "alt": 19.0}]), "items": []}},
		{"weight": 2.0 if d > 0.4 else 0.0, "value": {"length": 205.0,
			"spawns": [{"type": "spikes", "at": 60.0}, {"type": "warrior", "at": 152.0}], "items": []}},
		{"weight": 1.5 if d > 0.45 else 0.0, "value": {"length": 200.0,
			"spawns": [{"type": "pit", "at": 46.0, "w": 38.0}, {"type": "statue", "at": 140.0}], "items": []}},
		{"weight": 1.5 if d > 0.5 else 0.0, "value": {"length": 210.0,
			"spawns": [{"type": "warrior", "at": 80.0}, {"type": "warrior", "at": 170.0}], "items": []}},
		{"weight": 1.5 if d > 0.55 else 0.0, "value": {"length": 210.0,
			"spawns": [{"type": "beam", "at": 55.0}, {"type": "spikes", "at": 130.0}], "items": []}},
		{"weight": 2.0 if d > 0.3 else 0.0, "value": {"length": 165.0,
			"spawns": [{"type": "log2", "at": 70.0}], "items": Biome.idol_arc(46, 4, 44)}},
	]
	var picked: Variant = Biome.weighted_pick(rng, table)
	return picked.call(d) if picked is Callable else picked
