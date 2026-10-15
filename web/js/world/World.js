/**
 * World — игровой мир: камера, земля, генератор трассы, столкновения.
 *
 * Это «композиция»: World владеет игроком, биомом, списками сущностей
 * и частицами. Генерация уровня — данные-driven: биом отдаёт «паттерны»,
 * а фабрики создают конкретные объекты.
 */
class World {
  #obstacles = [];
  #enemies = [];
  #items = [];
  #projectiles = [];
  #particles = [];
  #pits = [];
  #biomeClasses = [Jungle, Village, Temple];
  #biomeIndex = 0;
  #loop = 0;
  #spawnCursor = 0;
  #nextBiomeAt = CONFIG.TRANSITION_EVERY; // в метрах
  #rng = makeRandom(1337);
  #shake = 0;
  #startX = 60;
  #biomeStartDist = 0;

  constructor(input) {
    this.input = input;
    this.player = new Player(60, CONFIG.GROUND_Y - Player.STAND_H);
    this.player.world = this;
    this.camera = { x: 0, y: 0 };
    this.time = 0;
    this.score = 0;
    this.biome = new this.#biomeClasses[0](1337);
    this.reset();

    // Очки за предметы (World не знает про HUD — только события).
    events.on('idol:collected', () => { this.score += CONFIG.IDOL_SCORE; });
    events.on('enemy:stomped', () => { this.score += CONFIG.STOMP_SCORE; });
    events.on('player:fall', () => { this.#shake = 0.35; });
    events.on('player:hurt', () => { this.#shake = 0.3; });
  }

  /** Полный сброс мира (новая игра). */
  reset() {
    this.#obstacles.length = 0;
    this.#enemies.length = 0;
    this.#items.length = 0;
    this.#projectiles.length = 0;
    this.#particles.length = 0;
    this.#pits.length = 0;
    this.#biomeIndex = 0;
    this.#loop = 0;
    this.#nextBiomeAt = CONFIG.TRANSITION_EVERY;
    this.#biomeStartDist = 0;
    this.biome = new this.#biomeClasses[0](1337 + Math.floor(Math.random() * 1000));
    this.player.reset(60, CONFIG.GROUND_Y - Player.STAND_H);
    this.#startX = this.player.x;
    this.camera.x = this.player.x - 60;
    this.camera.y = 0;
    this.time = 0;
    this.score = 0;
    this.#spawnCursor = this.player.x + CONFIG.WIDTH + 60;
    this.biome.track && AudioManager.instance.playSong(this.biome.track);
  }

  // ------------------------------------------------------------------
  // Геттеры состояния
  // ------------------------------------------------------------------

  /**
   * Прогресс внутри текущей локации 0..1: скорость и сложность растут
   * к её концу, а на новой локации всё начинается заново.
   */
  get biomeProgress() {
    return clamp(
      (this.distance - this.#biomeStartDist) / CONFIG.TRANSITION_EVERY,
      0, 1,
    );
  }

  /** Текущая скорость бега, px/с (постепенный разгон внутри биома). */
  get speed() {
    const p = this.biomeProgress;
    const accel = Math.pow(p, CONFIG.RUN_EASE) * (CONFIG.RUN_MAX - CONFIG.RUN_START);
    return Math.min(CONFIG.RUN_MAX, CONFIG.RUN_START + this.#loop * 9 + accel);
  }

  /** Пройденное расстояние в метрах. */
  get distance() { return Math.max(0, Math.floor((this.player.x - this.#startX) / 16)); }

  /** Сложность 0..1 — растёт с прогрессом локации и «петлями». */
  get difficulty() {
    return clamp(0.08 + this.#loop * 0.22 + this.biomeProgress * 0.85, 0, 1);
  }

  // ------------------------------------------------------------------
  // Земля
  // ------------------------------------------------------------------

  /** Есть ли земля под точкой (нет — если там яма). */
  isGroundAt(x) {
    for (const pit of this.#pits) {
      if (!pit.isDead && x > pit.x && x < pit.x + pit.w) return false;
    }
    return true;
  }

  /** Есть ли над игроком низкое препятствие (чтобы не вставать под бревном). */
  hasOverhead(player) {
    const standBox = {
      x: player.x,
      y: CONFIG.GROUND_Y - Player.STAND_H,
      w: Player.STAND_W,
      h: Player.STAND_H,
    };
    for (const o of this.#obstacles) {
      if (o.isOverhead && !o.isDead && rectsOverlap(standBox, o.hitbox)) return true;
    }
    return false;
  }

  /** Безопасная точка для возрождения после падения. */
  findSafeGround(x) {
    let px = x + 8;
    let guard = 0;
    let moved = true;
    while (moved && guard++ < 20) {
      moved = false;
      for (const pit of this.#pits) {
        if (!pit.isDead && px > pit.x - 10 && px < pit.x + pit.w + 10) {
          px = pit.x + pit.w + 16;
          moved = true;
        }
      }
    }
    return px;
  }

  // ------------------------------------------------------------------
  // Спавн
  // ------------------------------------------------------------------

  addObstacle(o) { o.world = this; this.#obstacles.push(o); if (o.isPit) this.#pits.push(o); }
  addEnemy(e) { e.world = this; this.#enemies.push(e); }
  addItem(i) { i.world = this; this.#items.push(i); }
  addProjectile(p) { p.world = this; this.#projectiles.push(p); }

  /** Снаряд (копьё воина и т.п.). */
  spawnProjectile(p) { this.addProjectile(p); }

  /** Все активные сущности (для отладки, тестов и будущих плагинов). */
  get entities() {
    return [...this.#obstacles, ...this.#enemies, ...this.#items, ...this.#projectiles];
  }

  /** Создать сущности из «паттерна» биома. */
  #spawnPattern(pattern, x0) {
    for (const s of pattern.spawns || []) {
      if (s.type === 'pit') {
        this.addObstacle(ObstacleFactory.create('pit', x0 + s.at, s));
      } else {
        const obstacle = ObstacleFactory.create(s.type, x0 + s.at, s);
        if (obstacle) this.addObstacle(obstacle);
        else this.addEnemy(EnemyFactory.create(s.type, x0 + s.at, s));
      }
    }
    for (const it of pattern.items || []) {
      const y = CONFIG.GROUND_Y - (it.alt || 30) - 8;
      const item = ItemFactory.create(it.type, x0 + it.at, y);
      if (item) this.addItem(item);
    }
    this.#fixItemPlacement();
  }

  /**
   * Монетки и сердечки не должны оказаться ВНУТРИ препятствий:
   * если предмет пересекается с препятствием — поднимаем его над ним.
   */
  #fixItemPlacement() {
    for (const it of this.#items) {
      if (it.isDead) continue;
      let box = { x: it.x, y: it.baseY, w: it.w, h: it.h };
      for (const o of this.#obstacles) {
        if (o.isDead) continue;
        if (o.isPit) {
          // над ямой монетка должна быть хотя бы на уровне земли
          const overPit = box.x + box.w > o.x + 4 && box.x < o.x + o.w - 4;
          if (overPit && box.y + box.h > CONFIG.GROUND_Y - 10) {
            it.setBaseY(CONFIG.GROUND_Y - it.h - 14);
            box = { x: it.x, y: it.baseY, w: it.w, h: it.h };
          }
          continue;
        }
        let guard = 0;
        while (guard++ < 8 && rectsOverlap(box, { x: o.x, y: o.y, w: o.w, h: o.h })) {
          it.setBaseY(it.baseY - 6);
          box = { x: it.x, y: it.baseY, w: it.w, h: it.h };
        }
      }
    }
  }

  /** Генерировать трассу впереди игрока. */
  #generate() {
    const ahead = this.player.x + CONFIG.WIDTH + 120;
    while (this.#spawnCursor < ahead) {
      const pattern = this.biome.getPattern(this.difficulty);
      this.#spawnPattern(pattern, this.#spawnCursor);
      this.#spawnCursor += pattern.length + Math.floor(this.#rng() * 36);
    }
  }

  /** Смена локации. */
  #nextBiome() {
    this.#biomeIndex = (this.#biomeIndex + 1) % this.#biomeClasses.length;
    if (this.#biomeIndex === 0) this.#loop++;
    this.biome = new this.#biomeClasses[this.#biomeIndex](1337 + this.#loop * 31 + this.#biomeIndex * 7);
    this.#biomeStartDist = this.distance; // скорость и сложность стартуют заново
    // убираем «предыдущую» локацию впереди игрока
    this.#obstacles = this.#obstacles.filter((o) => o.x < this.player.x);
    this.#enemies = this.#enemies.filter((e) => e.x < this.player.x);
    this.#items = this.#items.filter((i) => i.x < this.player.x);
    events.emit('biome:changed', { biome: this.biome, loop: this.#loop });
  }

  // ------------------------------------------------------------------
  // Частицы
  // ------------------------------------------------------------------

  /** Пыль, искры, кровь врагов. */
  spawnParticles(x, y, color, count = 4, vy0 = -60) {
    if (this.#particles.length > 220) return;
    for (let i = 0; i < count; i++) {
      this.#particles.push({
        x, y,
        vx: -this.speed * 0.3 + (Math.random() * 60 - 30),
        vy: vy0 + Math.random() * 40 - 20,
        life: 0.35 + Math.random() * 0.3,
        color,
        size: 1 + Math.floor(Math.random() * 2),
      });
    }
  }

  #updateParticles(dt) {
    const ps = this.#particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.vy += 500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) ps.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------
  // Обновление
  // ------------------------------------------------------------------

  update(dt, input) {
    this.time += dt;
    this.biome.tick(dt);
    this.#shake = Math.max(0, this.#shake - dt);

    this.player.update(dt, input);

    // смена локации
    if (this.distance >= this.#nextBiomeAt) {
      this.#nextBiomeAt += CONFIG.TRANSITION_EVERY;
      this.#nextBiome();
    }

    this.#generate();

    for (const o of this.#obstacles) o.update(dt);
    for (const e of this.#enemies) e.update(dt);
    for (const it of this.#items) it.update(dt);
    for (const p of this.#projectiles) p.update(dt);

    this.#collisions();

    // очистка
    const cull = this.camera.x - 90;
    this.#obstacles = this.#obstacles.filter((e) => !e.isDead && e.x + e.w > cull);
    this.#enemies = this.#enemies.filter((e) => !e.isDead && e.x + e.w > cull);
    this.#items = this.#items.filter((e) => !e.isDead && e.x + e.w > cull);
    this.#projectiles = this.#projectiles.filter((e) => !e.isDead && e.x + e.w > cull);
    this.#pits = this.#pits.filter((e) => !e.isDead);

    this.#updateParticles(dt);
    this.#updateCamera(dt);
  }

  #collisions() {
    const player = this.player;
    const hb = player.hitbox;
    const feet = player.y + player.h;

    const check = (e) => {
      if (e.isDead) return;
      if (e.collectible) {
        if (rectsOverlap(hb, e.hitbox)) {
          e.onCollect(player);
          e.kill();
          this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ffe9a8', 4, -40);
        }
        return;
      }
      if (!e.damageOnTouch) return;
      if (!rectsOverlap(hb, e.hitbox)) return;
      if (player.invulnerable || player.isDown) return;

      // прыжок на врага
      if (e.stompable && player.vy > 0 && feet - e.y < 14) {
        e.onStomp(player);
        player.bounce();
        return;
      }
      const hit = player.takeDamage(1);
      if (hit) e.onHit(player);
    };

    for (const e of this.#obstacles) check(e);
    for (const e of this.#enemies) check(e);
    for (const e of this.#projectiles) check(e);
    for (const e of this.#items) check(e);
  }

  #updateCamera(dt) {
    const targetX = this.player.x - 62;
    const targetY = Math.max(0, (this.player.y + this.player.h - CONFIG.GROUND_Y) - 36);
    const k = Math.min(1, dt * 9);
    this.camera.x += (targetX - this.camera.x) * k;
    this.camera.y += (targetY - this.camera.y) * k;
    if (this.#shake > 0) {
      this.camera.x += (Math.random() - 0.5) * 3;
      this.camera.y += (Math.random() - 0.5) * 3;
    }
  }

  // ------------------------------------------------------------------
  // Отрисовка
  // ------------------------------------------------------------------

  draw(ctx) {
    const cam = this.camera;
    this.biome.drawBackground(ctx, cam);
    this.drawGround(ctx, cam);

    for (const it of this.#items) it.draw(ctx, cam);
    for (const o of this.#obstacles) o.draw(ctx, cam);
    for (const e of this.#enemies) e.draw(ctx, cam);
    for (const p of this.#projectiles) p.draw(ctx, cam);

    this.player.draw(ctx, cam);
    this.#drawParticles(ctx, cam);

    this.biome.drawForeground(ctx, cam);
  }

  /** Отрисовка земли с пропуском ям (ямы дорисовывают себя поверх). */
  drawGround(ctx, cam) {
    const S = CONFIG.SCALE;
    const W = CONFIG.WIDTH;
    const topH = 4 * S;
    const gy = CONFIG.GROUND_Y;

    ctx.fillStyle = this.biome.groundLine;
    ctx.fillRect(0, gy, W, S);
    ctx.fillStyle = this.biome.groundTop;
    ctx.fillRect(0, gy + S, W, topH - S);
    ctx.fillStyle = this.biome.groundDirt;
    ctx.fillRect(0, gy + topH, W, CONFIG.HEIGHT);

    // крапинки грунта (параллакс к земле)
    ctx.fillStyle = this.biome.groundShade;
    const off1 = (cam.x * 1.0) % 26;
    for (let x = -off1; x < W + 26; x += 26) {
      ctx.fillRect(Math.round(x) + 4, gy + topH + 4, 7, 3);
      ctx.fillRect(Math.round(x) + 14, gy + topH + 11, 4, 2);
    }
  }

  #drawParticles(ctx, cam) {
    for (const p of this.#particles) {
      ctx.globalAlpha = clamp(p.life * 3, 0, 1);
      ctx.fillStyle = p.color;
      const S = CONFIG.SCALE;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size * S, p.size * S);
    }
    ctx.globalAlpha = 1;
  }
}
