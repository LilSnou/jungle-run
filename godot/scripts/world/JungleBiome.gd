#
# JungleBiome — джунгли: стартовая локация (порт web Jungle.js).
# Многослойный параллакс: два диапазона гор с туманом, водопады,
# три вида деревьев, кусты у земли, крона с лианами, лучи света,
# птицы, светлячки и бабочки.
class_name JungleBiome
extends Biome


func _init(seed_: int = 1) -> void:
	super(seed_)
	add_layer("bg_jungle_sky.png", 0.0, 0.0)
	add_layer("bg_jungle_sun.png", 0.04, 0.0)
	add_layer("bg_jungle_clouds.png", 0.06, 0.0)
	add_layer("bg_jungle_mountains_far.png", 0.13, 0.0)
	add_layer("bg_jungle_fog.png", 0.0, 0.0)
	add_layer("bg_jungle_mountains_near.png", 0.22, 0.0)
	add_layer("bg_jungle_trees.png", 0.38, 0.0)
	add_layer("bg_jungle_bushes.png", 0.72, 0.0)
	add_layer("bg_jungle_canopy.png", 0.85, 0.0)
	add_layer("bg_jungle_rays.png", 0.5, 0.0, 90.0)
	# передний план поверх героя
	add_layer("fg_jungle_ferns.png", 1.05, float(Config.GROUND_Y - 7), 350.0, fg_root)
	ground = Ground.new(self)

	var birds: Array = []
	for i in 3:
		birds.append({"x": i * 110.0 + rng.call() * 40.0, "y": 24.0 + rng.call() * 30.0,
			"speed": 14.0 + rng.call() * 10.0, "phase": rng.call() * 6.0})
	make_fx("jungle", {"birds": birds, "fireflies": 7})
	add_butterflies(3, 78.0, 130.0, 16.0)


func name_ru() -> String:
	return "ДЖУНГЛИ"


func track() -> String:
	return "jungle"


func tiles_name() -> String:
	return "jungle"


func ground_line() -> Color:
	return Color.html("#2f6b28")


func ground_top() -> Color:
	return Color.html("#4e9a3f")


func ground_dirt() -> Color:
	return Color.html("#6b4a25")


func ground_shade() -> Color:
	return Color.html("#54381b")


func decor_table() -> Array:
	# джунгли: грибы и папоротники у земли, черепа-предостережения,
	# бабочки (только здесь)
	return [
		{"weight": 8.0, "value": {"type": "mushroom"}},
		{"weight": 4.0, "value": {"type": "fern"}},
		{"weight": 1.5, "value": {"type": "skull"}},
		{"weight": 1.5, "value": {"type": "butterfly"}},
	]


func get_pattern(d: float) -> Dictionary:
	# Джунгли: лианы, брёвна, ямы, змеи, ягуары и летучие мыши
	var table: Array = [
		{"weight": 3.0, "value": {"length": 110.0, "spawns": [], "items": Biome.idol_arc(40, 4, 30)}},
		{"weight": 3.0, "value": {"length": 145.0, "spawns": [{"type": "vine1", "at": 60.0}],
			"items": Biome.idol_arc(50, 5, 48)}},
		{"weight": 3.0, "value": {"length": 150.0, "spawns": [{"type": "log1", "at": 70.0}],
			"items": [{"type": "idol", "at": 60.0, "alt": 0}, {"type": "idol", "at": 72.0, "alt": 0},
				{"type": "idol", "at": 84.0, "alt": 0}]}},
		{"weight": 3.0, "value": func(dd: float) -> Dictionary: return {"length": 155.0, "spawns": [{"type": "pit", "at": 50.0, "w": 42.0 if dd > 0.55 else 34.0}], "items": Biome.idol_arc(44, 4, 46)}},
		{"weight": 2.0 if d > 0.1 else 0.0, "value": {"length": 150.0,
			"spawns": [{"type": "snake", "at": 95.0}], "items": []}},
		{"weight": 2.0 if d > 0.3 else 0.0, "value": {"length": 175.0,
			"spawns": [{"type": "vine1", "at": 60.0}, {"type": "pit", "at": 128.0, "w": 34.0}], "items": []}},
		{"weight": 2.0 if d > 0.2 else 0.0, "value": {"length": 200.0,
			"spawns": [{"type": "vine1", "at": 60.0}, {"type": "log1", "at": 89.0}],
			"items": [{"type": "idol", "at": 56.0, "alt": 0}, {"type": "idol", "at": 74.0, "alt": 0},
				{"type": "idol", "at": 92.0, "alt": 0}]}},
		{"weight": 2.0 if d > 0.25 else 0.0, "value": func(dd: float) -> Dictionary: return {"length": 165.0, "spawns": ([{"type": "bat", "at": 95.0, "alt": 19.0}, {"type": "bat", "at": 128.0, "alt": 19.0}] if dd > 0.6 else [{"type": "bat", "at": 95.0, "alt": 19.0}]), "items": []}},
		{"weight": 2.0 if d > 0.4 else 0.0, "value": {"length": 200.0,
			"spawns": [{"type": "jaguar", "at": 150.0}], "items": []}},
		{"weight": 1.5 if d > 0.35 else 0.0, "value": {"length": 190.0,
			"spawns": [{"type": "vine1", "at": 60.0}, {"type": "snake", "at": 134.0}], "items": []}},
		{"weight": 1.5 if d > 0.45 else 0.0, "value": {"length": 190.0,
			"spawns": [{"type": "pit", "at": 50.0, "w": 34.0}, {"type": "snake", "at": 134.0}], "items": []}},
		{"weight": 0.6, "value": {"length": 130.0, "spawns": [],
			"items": [{"type": "heart", "at": 60.0, "alt": 32.0}]}},
	]
	var picked: Variant = Biome.weighted_pick(rng, table)
	return picked.call(d) if picked is Callable else picked
