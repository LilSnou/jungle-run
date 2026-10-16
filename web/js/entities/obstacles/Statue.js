/**
 * Statue — высокий каменный идол майя. Перепрыгивается двойным
 * прыжком (высота 30px — на пределе обычного прыжка), особенно
 * неприятна в связке с другими препятствиями.
 *
 * Арт 24x60 (масштаб 0.5) = 12x30 — визуал совпадает с хитбоксом
 * (основание утоплено на 2px в траву), как в Godot Statue.
 */
class Statue extends Obstacle {
  constructor(x) {
    super(x, CONFIG.GROUND_Y - 28, 12, 30);
  }

  draw(ctx, cam) {
    this.drawSprite(ctx, cam, 'statue', 0, 0, false, 0.5);
  }
}
