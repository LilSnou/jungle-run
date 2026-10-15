/**
 * Snake — змея, ползающая по земле.
 * Побеждается прыжком сверху (stomp); касание сбоком — урон.
 */
class Snake extends Enemy {
  static SLITHER = 26; // px/с — дополнительное приближение к игроку

  constructor(x) {
    super(x, CONFIG.GROUND_Y - 6, 12, 6);
  }

  update(dt) {
    this.tick(dt);
    this.x -= Snake.SLITHER * dt;   // приползает навстречу
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    this.drawSprite(ctx, cam, this.frameBy(0.16, 2, 'snake_'), -1, -1, true);
  }
}
