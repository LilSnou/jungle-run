#
# Jaguar — крупный ягуар в полный рост (порт web Jaguar.js):
# мирно стоит, затем бросается на героя. Побеждается прыжком на голову.
# Демонстрирует «триггерное» поведение.
class_name Jaguar
extends Enemy

const TRIGGER_RANGE := 250.0  # px — замечает героя раньше и бросается раньше
const CHARGE_ACCEL := 520.0   # px/с^2 — разгон быстрее
const CHARGE_MAX := 205.0     # px/с — и максимальная скорость выше

var _charge_speed := 0.0
var _charging := false


func _init(ex: float) -> void:
	# хитбокс 14px — по ширине видимого тела (с хвостом арт ещё шире)
	super(ex, Config.GROUND_Y - 12, 14, 12)
	# якорь: арт 16x14 центрируется, низ лап ровно на земле
	make_sprite("jaguar", -1.0, -2.0, true)


func update(dt: float) -> void:
	tick(dt)
	var player = world.player
	var dx: float = player.x - x

	if not _charging and dx < TRIGGER_RANGE and dx > -30.0:
		_charging = true
		EventBus.emit("enemy:alert", {"enemy": self})

	if _charging:
		_charge_speed = minf(CHARGE_MAX, _charge_speed + CHARGE_ACCEL * dt)
		x -= _charge_speed * dt
		# пыль под лапами
		if int(floor(_charge_speed * dt * 10.0)) % 3 == 0:
			world.spawn_particles(x + 4.0, Config.GROUND_Y - 1.0, Color.html("#c7b58d"), 1, -20.0)

	sprite.frame = (1 + frame_by(0.09, 5)) if _charging else 0
	_kill_if_offscreen()
