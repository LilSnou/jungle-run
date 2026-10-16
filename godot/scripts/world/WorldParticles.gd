#
# WorldParticles — пыль, искры, кровь врагов (порт web World частиц).
# Рисуются в мировых координатах ПОСЛЕ игрока.
class_name WorldParticles
extends Node2D

var ps: Array = []
var _host: Node2D = null  # World — для текущей скорости


func _init(host: Node2D = null) -> void:
	_host = host


## Создать частицы (пыль под ногами, искры при сборе и т.п.).
func spawn_particles(x: float, y: float, color: Color, count := 4, vy0 := -60.0) -> void:
	if ps.size() > 220:
		return
	var host_speed: float = _host.speed if _host != null else 0.0
	for i in count:
		ps.append({
			"x": x, "y": y,
			"vx": -host_speed * 0.3 + (randf() * 60.0 - 30.0),
			"vy": vy0 + randf() * 40.0 - 20.0,
			"life": 0.35 + randf() * 0.3,
			"color": color,
			"size": 1 + int(floor(randf() * 2.0)),
		})


func update_particles(dt: float) -> void:
	for i in range(ps.size() - 1, -1, -1):
		var p: Dictionary = ps[i]
		p["vy"] = float(p.vy) + 500.0 * dt
		p["x"] = float(p.x) + float(p.vx) * dt
		p["y"] = float(p.y) + float(p.vy) * dt
		p["life"] = float(p.life) - dt
		if float(p.life) <= 0.0:
			ps.remove_at(i)
	queue_redraw()


## Полная очистка (при смерти игрока).
func clear_particles() -> void:
	ps.clear()
	queue_redraw()


func _draw() -> void:
	for p in ps:
		var col: Color = p.color
		col.a = clampf(float(p.life) * 3.0, 0.0, 1.0)
		var s := float(p.size)
		draw_rect(Rect2(float(p.x), float(p.y), s, s), col)
