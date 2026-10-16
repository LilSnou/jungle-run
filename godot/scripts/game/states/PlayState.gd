#
# PlayState — игра идёт: мир обновляется, после смерти — переход в «конец»
# (порт PlayState).
class_name PlayState
extends GameState

var over_timer := 1.0


func enter() -> void:
	over_timer = 1.0
	main.world.set_entities_visible(true)


func update(dt: float) -> void:
	main.world.update_world(dt)
	main.hud.update(dt)

	if InputManager.was_pressed("pause"):
		main.set_state("pause")
		return

	if main.world.player.is_down:
		over_timer -= dt
		if over_timer <= 0.0:
			main.save_best(main.final_score())
			main.set_state("over")


func draw(_canvas: CanvasItem) -> void:
	pass  # HUD и кнопка паузы рисуются отдельными узлами
