#
# Warrior — воин племени (порт web Warrior.js): стоит на месте, замечает
# героя и метает копьё на уровне пояса. Копьё нужно перепрыгнуть;
# самого воина можно обыграть стомпом.
class_name Warrior
extends Enemy

const ALERT_RANGE := 170.0
const WINDUP := 0.45    # с — замах
const COOLDOWN := 1.7   # с — пауза между бросками
const SPEAR_ALTITUDE := 11.0

var _state := "idle"  # idle | windup | throw
var _timer := 0.0


func _init(ex: float) -> void:
	# хитбокс 13px — по видимому телу с диадемой (арт 16x15)
	super(ex, Config.GROUND_Y - 15, 13, 15)
	# якорь: арт 16x15 центрируется, ступни ровно на земле
	make_sprite("warrior", -1.5, 0.0, true)


func update(dt: float) -> void:
	tick(dt)
	var player = world.player
	var dx: float = player.x - x

	match _state:
		"idle":
			if _timer <= 0.0 and dx < ALERT_RANGE and dx > 40.0:
				_state = "windup"
				_timer = WINDUP
				EventBus.emit("enemy:alert", {"enemy": self})
		"windup":
			_timer -= dt
			if _timer <= 0.0:
				_state = "throw"
				_timer = 0.15
				world.spawn_projectile(Spear.new(x - 6.0, Config.GROUND_Y - SPEAR_ALTITUDE))
				EventBus.emit("warrior:throw")
		"throw":
			_timer -= dt
			if _timer <= 0.0:
				_state = "idle"
				_timer = COOLDOWN

	if _state == "idle" and _timer > 0.0:
		_timer -= dt

	sprite.frame = 2 if _state == "windup" else ((3 if _state == "throw" else frame_by(0.6, 2)))
	_kill_if_offscreen()
