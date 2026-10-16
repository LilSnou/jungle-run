/**
 * Snake — кобра, приподнявшаяся над землёй: теперь её высота сопоставима
 * с героем (13px против 16px). Побеждается прыжком сверху (stomp);
 * касание сбоком — урон.
 */
class Snake extends Enemy {
  static SLITHER = 26; // px/с — дополнительное приближение к игроку

  constructor(x) {
    // хитбокс шире (14px): совпадает с видимым телом кобры —
    // касание «по картинке» гарантированно даёт урон
    super(x, CONFIG.GROUND_Y - 13, 14, 13);
  }

  update(dt) {
    this.tick(dt);
    if (this.groundFall(dt)) return;   // у края ямы — проваливается в неё
    this.x -= Snake.SLITHER * dt;   // приползает навстречу
    if (this.x < this.world.camera.x - 40) this.kill();
  }

  draw(ctx, cam) {
    // якорь (0,-1): арт 14x14, низ на земле — как в Godot Snake
    this.drawSprite(ctx, cam, this.frameBy(0.25, 4, 'snake_'), 0, -1, true);
  }
}
