#
# Factories — централизованное создание сущностей (Factory Method),
# порт web Factories.js.
#
# Генератор уровня описывает трассу данными («spawn: {type:'snake'}»),
# а конкретный класс выбирается здесь. Чтобы добавить нового врага,
# достаточно нового файла-класса и одной строки в match —
# открытость-закрытость (Open/Closed).
class_name Factories
extends Object

## Типы, которые являются препятствиями (важно для клренса статуй
## и фильтрации «шпиль над ямой» в World._spawn_pattern).
const OBSTACLE_TYPES: Array = [
	"log1", "log2", "vine1", "rope", "beam", "statue", "spikes", "pit",
]


static func is_obstacle_type(type: String) -> bool:
	return OBSTACLE_TYPES.has(type)


static func create_enemy(type: String, x: float, opts: Dictionary = {}) -> Enemy:
	match type:
		"snake":
			return Snake.new(x)
		"jaguar":
			return Jaguar.new(x)
		"bat":
			return Bat.new(x, opts.get("alt", 19.0))
		"warrior":
			return Warrior.new(x)
		"spear":
			return Spear.new(x, opts.get("y", Config.GROUND_Y - 12.0))
	return null


static func create_obstacle(type: String, x: float, opts: Dictionary = {}) -> GroundObstacle:
	match type:
		"log1":
			return Log1.new(x)
		"log2":
			return Log2.new(x)
		"vine1":
			return Vine1.new(x)
		"rope":
			return RopeTrap.new(x)
		"beam":
			return StoneBeam.new(x)
		"statue":
			return Statue.new(x)
		"spikes":
			return Spikes.new(x, opts.get("w", 16.0))
		"pit":
			return Pit.new(x, opts.get("w", 40.0))
	return null


static func create_item(type: String, x: float, y: float) -> Item:
	match type:
		"idol":
			return Idol.new(x, y)
	return null


## Декор локации (грибы, папоротники, черепа, руны, бабочки).
static func create_decor(type: String, x: float, opts: Dictionary = {}) -> Decor:
	match type:
		"mushroom", "fern", "skull":
			var cell: Array = Art.cell("decor_" + type)
			var hh := float(cell[1]) * Decor.SCALE_ART
			return Decor.new("decor_" + type, x, float(Config.GROUND_Y) - hh + 1.0)
		"rune":
			return Rune.new(x)
		"butterfly":
			return Butterfly.new(x, float(opts.get("alt", 80.0)))
	return null
