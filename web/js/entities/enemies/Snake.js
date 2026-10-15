/**
 * Snake — кобра, приподнявшаяся над землёй: теперь её высота сопоставима
 * с героем (13px против 16px). Побеждается прыжком сверху (stomp);
 * касание сбоком — урон.
 */
class Snake extends Enemy {
  static SLITHER = 26; // px/с — дополнительное приближение к игроку

  constructor(x) {
    super(x, CONFIG.GROUND_Y - 13, 10, 13);
  }

  update(dt) {
    this.tick(dt);
    this.x -= Snake.SLITHER * dt;   // приползает навстречу
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    this.drawSprite(ctx, cam, this.frameBy(0.5, 2, 'snake_'), -2, 0, true);
  }
}
