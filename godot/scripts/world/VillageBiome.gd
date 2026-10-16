#
# VillageBiome — деревня аборигенов на закате (порт web Village.js):
# хижины с огнями, тотемы, сушильные стойки, жители, костры и пальмы.
class_name VillageBiome
extends Biome

var _fires: Node2D = null
var _racks: Node2D = null


func _init(seed_: int = 1) -> void:
	super(seed_)
	add_layer("bg_village_sky.png", 0.0, 0.0)
	add_layer("bg_village_sun.png", 0.035, 82.0)
	add_layer("bg_village_clouds.png", 0.07, 0.0)
	add_layer("bg_village_hills_far.png", 0.12, 0.0)
	add_layer("bg_village_palms.png", 0.28, 0.0)
	add_layer("bg_village_huts.png", 0.4, 0.0)
	_racks = add_layer("bg_village_racks.png", 0.4, 0.0)
	add_layer("bg_village_totems.png", 0.52, 0.0)
	add_layer("bg_village_fences.png", 0.66, 0.0)
	_fires = add_layer("bg_village_fires.png", 0.8, 0.0)
	add_layer("fg_village_grass.png", 1.2, float(Config.GROUND_Y - 6), 312.0, fg_root)
	ground = Ground.new(self)

	make_fx("village", {"fireflies": 5})


func tick(dt: float, cam: Dictionary) -> void:
	super(dt, cam)
	# мерцание огней в хижинах
	if _fires != null:
		_fires.modulate.a = 0.92 + 0.08 * sin(time * 13.0)


func name_ru() -> String:
	return "ДЕРЕВНЯ"


func track() -> String:
	return "village"


func tiles_name() -> String:
	return "village"


func ground_line() -> Color:
	return Color.html("#5c381b")


func ground_top() -> Color:
	return Color.html("#b98a4b")


func ground_dirt() -> Color:
	return Color.html("#8a5a2e")


func ground_shade() -> Color:
	return Color.html("#6e4522")


func decor_table() -> Array:
	# деревня: грибы и папоротники у тропы
	return [
		{"weight": 8.0, "value": {"type": "mushroom"}},
		{"weight": 4.0, "value": {"type": "fern"}},
	]


func get_pattern(d: float) -> Dictionary:
	# Деревня: верёвки-ловушки, ямы, воины с копьями и ягуары
	var table: Array = [
		{"weight": 3.0, "value": {"length": 110.0, "spawns": [], "items": Biome.idol_arc(40, 4, 30)}},
		{"weight": 3.0, "value": {"length": 145.0, "spawns": [{"type": "rope", "at": 60.0}],
			"items": Biome.idol_arc(50, 5, 48)}},
		{"weight": 3.0, "value": {"length": 150.0, "spawns": [{"type": "rope", "at": 70.0}],
			"items": [{"type": "idol", "at": 60.0, "alt": 0}, {"type": "idol", "at": 72.0, "alt": 0},
				{"type": "idol", "at": 84.0, "alt": 0}]}},
		{"weight": 3.0, "value": func(dd: float) -> Dictionary: return {"length": 155.0, "spawns": [{"type": "pit", "at": 50.0, "w": 42.0 if dd > 0.5 else 34.0}], "items": Biome.idol_arc(44, 4, 46)}},
		{"weight": 2.5 if d > 0.2 else 0.0, "value": {"length": 190.0,
			"spawns": [{"type": "warrior", "at": 120.0}], "items": []}},
		{"weight": 2.0 if d > 0.3 else 0.0, "value": {"length": 195.0,
			"spawns": [{"type": "warrior", "at": 90.0}, {"type": "rope", "at": 155.0}], "items": []}},
		{"weight": 2.0 if d > 0.2 else 0.0, "value": {"length": 205.0,
			"spawns": [{"type": "rope", "at": 55.0}, {"type": "rope", "at": 84.0}],
			"items": [{"type": "idol", "at": 52.0, "alt": 0}, {"type": "idol", "at": 70.0, "alt": 0},
				{"type": "idol", "at": 88.0, "alt": 0}]}},
		{"weight": 2.0 if d > 0.35 else 0.0, "value": func(dd: float) -> Dictionary: return {"length": 200.0, "spawns": ([{"type": "bat", "at": 100.0, "alt": 19.0}, {"type": "bat", "at": 134.0, "alt": 19.0}] if dd > 0.65 else [{"type": "bat", "at": 100.0, "alt": 19.0}]), "items": []}},
		{"weight": 2.0 if d > 0.45 else 0.0, "value": {"length": 200.0,
			"spawns": [{"type": "jaguar", "at": 150.0}], "items": []}},
		{"weight": 1.5 if d > 0.4 else 0.0, "value": {"length": 195.0,
			"spawns": [{"type": "pit", "at": 46.0, "w": 34.0}, {"type": "warrior", "at": 140.0}], "items": []}},
		{"weight": 0.6, "value": {"length": 130.0, "spawns": [],
			"items": [{"type": "heart", "at": 60.0, "alt": 32.0}]}},
	]
	var picked: Variant = Biome.weighted_pick(rng, table)
	return picked.call(d) if picked is Callable else picked
