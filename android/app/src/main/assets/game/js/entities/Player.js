/**
 * Player — главный герой в духе Индианы Джонса.
 *
 * Наследует Entity и переопределяет update()/draw() (полиморфизм).
 * Инкапсуляция: вся физика (вертикальная скорость, прыжки, скольжение,
 * здоровье) спрятана за приватными полями.
 *
 * Механики паркура:
 *  • прыжок (с «кайот-таймом» и буфером нажатия — как в хороших платформерах)
 *  • двойной прыжок
 *  • скольжение под низкими брёвнами (пока кнопка удерживается)
 *  • прыжок на голову врага (stomp) с отскоком
 */
class Player extends Entity {
  static STAND_H = 16;
  static SLIDE_H = 8;
  static STAND_W = 10;
  static SLIDE_W = 12;

  #vy = 0;
  #onGround = true;
  #jumpsLeft = 1;
  #coyote = 0;
  #buffer = 0;
  #sliding = false;
  #invuln = 0;
  #knock = 0;
  #animTime = 0;
  #lives;
  #maxLives;
  #dustTimer = 0;
  #dead = false;

  constructor(x, y) {
    super(x, y, Player.STAND_W, Player.STAND_H);
    this.#lives = CONFIG.START_LIVES;
    this.#maxLives = CONFIG.START_LIVES;
  }

  get vy() { return this.#vy; }
  get onGround() { return this.#onGround; }
  get sliding() { return this.#sliding; }
  get invulnerable() { return this.#invuln > 0; }
  get lives() { return this.#lives; }
  get isDown() { return this.#dead; }
  get invulnTime() { return this.#invuln; }

  /** Сброс всех состояний (рестарт уровня/игры). */
  reset(x, y) {
    this.x = x; this.y = y;
    this.w = Player.STAND_W; this.h = Player.STAND_H;
    this.#vy = 0; this.#onGround = true; this.#jumpsLeft = 1;
    this.#coyote = 0; this.#buffer = 0; this.#sliding = false;
    this.#invuln = 0; this.#knock = 0; this.#dead = false;
    this.#lives = this.#maxLives;
  }

  /** Нанести урон (шипы, враги, статуя). */
  takeDamage(amount = 1) {
    if (this.#invuln > 0 || this.#dead) return false;
    this.#lives -= amount;
    this.#invuln = CONFIG.INVULN_TIME;
    this.#knock = CONFIG.KNOCKBACK_TIME;
    this.#vy = -160;
    events.emit('player:hurt');
    if (this.#lives <= 0) {
      this.#lives = 0;
      this.#dead = true;
      events.emit('player:dead');
    }
    return true;
  }

  /** Подобрать сердечко. */
  heal() {
    if (this.#lives < this.#maxLives) {
      this.#lives++;
      return true;
    }
    return false;
  }

  /** Отскок после прыжка на врага. */
  bounce() {
    this.#vy = CONFIG.STOMP_BOUNCE;
    this.#jumpsLeft = 1;
  }

  /** Возрождение после падения в яму (в мире — рядом с ямой). */
  respawn(x) {
    this.x = x;
    this.y = CONFIG.GROUND_Y - this.h;
    this.#vy = 0;
    this.#onGround = true;
    this.#invuln = Math.max(this.#invuln, CONFIG.INVULN_TIME);
  }

  #tryJump() {
    if (this.#onGround || this.#coyote > 0) {
      this.#vy = CONFIG.JUMP_VELOCITY;
      this.#onGround = false;
      this.#coyote = 0;
      this.#jumpsLeft = 1;
      this.#stopSlide();
      events.emit('player:jump');
      return true;
    }
    if (this.#jumpsLeft > 0) {
      this.#vy = CONFIG.JUMP_VELOCITY * CONFIG.DOUBLE_JUMP_FACTOR;
      this.#jumpsLeft--;
      events.emit('player:doubleJump');
      return true;
    }
    return false;
  }

  #startSlide() {
    if (this.#sliding) return;
    this.#sliding = true;
    this.y += Player.STAND_H - Player.SLIDE_H;
    this.h = Player.SLIDE_H;
    this.w = Player.SLIDE_W;
    events.emit('player:slide');
  }

  #stopSlide() {
    if (!this.#sliding) return;
    this.#sliding = false;
    this.y -= Player.STAND_H - Player.SLIDE_H;
    this.h = Player.STAND_H;
    this.w = Player.STAND_W;
  }

  update(dt, input) {
    if (this.#dead) {
      this.#vy += CONFIG.GRAVITY * dt;
      this.y += this.#vy * dt;
      return;
    }

    // --- горизонталь: герой автоматически бежит вправо ---
    let speed = this.world.speed;
    if (this.#knock > 0) speed *= 0.55;
    this.x += speed * dt;

    // --- буфер нажатия и кайот-тайм ---
    if (input.wasPressed('jump')) this.#buffer = CONFIG.JUMP_BUFFER;
    if (this.#buffer > 0) {
      if (this.#tryJump()) this.#buffer = 0;
    }
    this.#buffer = Math.max(0, this.#buffer - dt);
    this.#coyote = Math.max(0, this.#coyote - dt);

    // --- скольжение (кнопка удерживается; вставать под бревном нельзя) ---
    if (this.#onGround && input.isDown('slide') && !input.wasPressed('jump')) this.#startSlide();
    else if (this.#sliding && !input.isDown('slide') && !this.world.hasOverhead(this)) this.#stopSlide();

    // --- гравитация ---
    this.#vy += CONFIG.GRAVITY * dt;
    this.y += this.#vy * dt;

    const feetX = this.x + this.w * 0.5;
    const hasGround = this.world.isGroundAt(feetX);
    if (hasGround && this.y + this.h >= CONFIG.GROUND_Y && this.#vy >= 0) {
      const wasAir = !this.#onGround;
      this.y = CONFIG.GROUND_Y - this.h;
      this.#vy = 0;
      this.#onGround = true;
      this.#jumpsLeft = 1;
      if (wasAir) events.emit('player:land');
    } else {
      this.#onGround = false;
    }

    // --- падение в яму ---
    if (this.y > CONFIG.GROUND_Y + 90) {
      events.emit('player:fall');
      const respawnX = this.world.findSafeGround(this.x);
      this.respawn(respawnX);
      this.takeDamage(1);
    }

    // --- таймеры ---
    this.#invuln = Math.max(0, this.#invuln - dt);
    this.#knock = Math.max(0, this.#knock - dt);
    this.#animTime += dt;

    // --- пыль под ногами и от скольжения ---
    this.#dustTimer -= dt;
    if (this.#dustTimer <= 0) {
      if (this.#sliding) {
        this.world.spawnParticles(this.x, this.y + this.h, '#d9c9a3', 2, -60);
        this.#dustTimer = 0.06;
      } else if (this.#onGround) {
        this.world.spawnParticles(this.x, this.y + this.h - 1, '#c7b58d', 1, -30);
        this.#dustTimer = 0.18;
      } else {
        this.#dustTimer = 0.2;
      }
    }
  }

  /** Какой кадр анимации показывать. */
  get frame() {
    if (this.#invuln > 0 && !this.#dead && this.world.time % 0.2 < 0.1) return null; // мигание
    if (this.#dead) return 'player_hurt';
    if (this.#sliding) return 'player_slide';
    if (!this.#onGround) return 'player_jump';
    if (this.#invuln > 0.9) return 'player_hurt';
    return 'player_run_' + (Math.floor(this.#animTime * 12) % 4);
  }

  draw(ctx, cam) {
    const frame = this.frame;
    if (!frame) return;
    // Спрайт 16x18, хитбокс 10x16: якорь подгоняет рисунок под хитбокс.
    const ay = frame === 'player_slide' ? -2 : -1;
    this.drawSprite(ctx, cam, frame, -3, ay, false);
  }
}
