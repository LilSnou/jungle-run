/**
 * Game — ядро игры и конечный автомат состояний (паттерн «Состояние»).
 *
 * Состояния: MenuState → PlayState ⇄ PauseState, PlayState → OverState.
 * Каждое состояние само решает, как обновляться и что рисовать.
 * Game инкапсулирует цикл, «звуковую проводку» событий и рекорд.
 */
class Game {
  #lastTs = 0;
  #best = 0;

  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;

    this.world = new World(input);
    this.hud = new HUD();
    this.touch = new TouchControls(canvas, input);

    this.#best = Game.loadBest();
    this.states = {
      menu: new MenuState(this),
      play: new PlayState(this),
      pause: new PauseState(this),
      over: new OverState(this),
    };
    this.state = this.states.menu;

    this.#bindEvents();
    this.state.enter();
  }

  get best() { return this.#best; }
  get finalScore() { return this.world.score + this.world.distance; }

  static loadBest() {
    try { return parseInt(localStorage.getItem('jungleRunBest') || '0', 10) || 0; } catch (e) { return 0; }
  }

  saveBest(v) {
    this.#best = Math.max(this.#best, v);
    try { localStorage.setItem('jungleRunBest', String(this.#best)); } catch (e) { /* нет хранилища — не беда */ }
  }

  #bindEvents() {
    const audio = () => AudioManager.instance;

    // --- звуковая «проводка»: события -> чиптюновые эффекты ---
    events.on('player:jump', () => audio().play('jump'));
    events.on('player:doubleJump', () => audio().play('doubleJump'));
    events.on('player:slide', () => audio().play('slide'));
    events.on('player:hurt', () => audio().play('hurt'));
    events.on('player:fall', () => audio().play('fall'));
    events.on('player:dead', () => audio().play('gameOver'));
    events.on('enemy:stomped', () => audio().play('stomp'));
    events.on('warrior:throw', () => audio().play('click'));
    events.on('enemy:alert', () => audio().play('click'));
    events.on('idol:collected', (p) => { if (!p || !p.silent) audio().play('coin'); });
    events.on('heart:collected', () => audio().play('heart'));
    events.on('biome:changed', ({ biome }) => {
      audio().play('biome');
      audio().playSong(biome.track);
    });
    events.on('audio:toggle', () => audio().toggleMute());
    events.on('ui:pause', () => {
      if (this.state === this.states.play) this.setState('pause');
      else if (this.state === this.states.pause) this.setState('play');
    });

    // тап по экрану двигает неигровые состояния
    window.addEventListener('pointerdown', () => {
      const s = this.state;
      if (s === this.states.menu) this.startRun();
      else if (s === this.states.pause) this.setState('play');
      else if (s === this.states.over && s.canRetry()) this.startRun();
    });

    // свернули окно — пауза
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === this.states.play) this.setState('pause');
    });
  }

  /** Начать/возобновить забег. */
  startRun() {
    this.world.reset();
    AudioManager.instance.play('start');
    events.emit('biome:changed', { biome: this.world.biome, loop: 0 });
    this.setState('play');
  }

  setState(state) {
    if (this.state && this.state.exit) this.state.exit();
    this.state = typeof state === 'string' ? this.states[state] : state;
    if (this.state && this.state.enter) this.state.enter();
  }

  /** Главный цикл (requestAnimationFrame). */
  start() {
    const frame = (ts) => {
      const dt = clamp((ts - this.#lastTs) / 1000, 0, 0.05);
      this.#lastTs = ts;

      this.state.update(dt);
      this.state.draw(this.ctx);
      this.input.endFrame();

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

// ----------------------------------------------------------------------
// Состояния (State pattern)
// ----------------------------------------------------------------------

/** Заставка: мир «дышит» на фоне, ждём тапа/пробела. */
class MenuState {
  constructor(game) { this.game = game; this.t = 0; }

  enter() {
    this.t = 0;
    AudioManager.instance.playSong(this.game.world.biome.track);
  }

  update(dt) {
    this.t += dt;
    this.game.world.biome.tick(dt);
    if (this.game.input.wasPressed('jump') || this.game.input.wasPressed('pause')) {
      this.game.startRun();
    }
  }

  draw(ctx) {
    const cam = { x: this.t * 46, y: 0 };
    const world = this.game.world;
    world.biome.drawBackground(ctx, cam);
    world.drawGround(ctx, cam);
    world.biome.drawForeground(ctx, cam);

    // затемнение под текст
    ctx.fillStyle = 'rgba(10,8,16,0.45)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const cx = CONFIG.WIDTH / 2;
    PixelFont.draw(ctx, 'JUNGLE', cx, 34, { align: 'center', scale: 4, color: '#f2e2b0', shadow: '#141220' });
    PixelFont.draw(ctx, 'RUN', cx, 66, { align: 'center', scale: 4, color: '#c9832e', shadow: '#141220' });
    PixelFont.draw(ctx, 'INDIANA PARKOUR', cx, 96, { align: 'center', color: '#8fbf6a', shadow: '#141220' });

    // мигающий призыв
    if (Math.floor(this.t * 2) % 2 === 0) {
      PixelFont.draw(ctx, 'TAP TO START', cx, 118, { align: 'center', color: '#f7f3e3', shadow: '#141220' });
    }

    PixelFont.draw(ctx, 'RIGHT: JUMP  (TAP TWICE = 2X JUMP)', cx, 140, { align: 'center', color: '#c9c2ad', shadow: '#141220' });
    PixelFont.draw(ctx, 'LEFT LOW: SLIDE   P: PAUSE   M: SOUND', cx, 150, { align: 'center', color: '#c9c2ad', shadow: '#141220' });
    PixelFont.draw(ctx, 'BEST ' + this.game.best, cx, 166, { align: 'center', color: '#c9832e', shadow: '#141220' });

    PauseButton.draw(ctx, false, AudioManager.instance.muted);
  }
}

/** Игра идёт: мир обновляется, кнопки паркура на экране. */
class PlayState {
  constructor(game) { this.game = game; this.overTimer = 0; }

  enter() { this.overTimer = 1.0; }

  update(dt) {
    const game = this.game;
    game.world.update(dt, game.input);
    game.hud.update(dt);

    if (game.input.wasPressed('pause')) { game.setState('pause'); return; }

    if (game.world.player.isDown) {
      this.overTimer -= dt;
      if (this.overTimer <= 0) {
        game.saveBest(game.finalScore);
        game.setState('over');
      }
    }
  }

  draw(ctx) {
    const game = this.game;
    game.world.draw(ctx);
    game.hud.draw(ctx, game.world);
    game.touch.draw(ctx);
    PauseButton.draw(ctx, false, AudioManager.instance.muted);
  }
}

/** Пауза: мир заморожен. */
class PauseState {
  constructor(game) { this.game = game; }

  update() {
    if (this.game.input.wasPressed('pause') || this.game.input.wasPressed('jump')) {
      this.game.setState('play');
    }
  }

  draw(ctx) {
    const game = this.game;
    game.world.draw(ctx);
    game.hud.draw(ctx, game.world);

    ctx.fillStyle = 'rgba(10,8,16,0.65)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    PixelFont.draw(ctx, 'PAUSED', CONFIG.WIDTH / 2, 70, {
      align: 'center', scale: 3, color: '#f2e2b0', shadow: '#141220',
    });
    PixelFont.draw(ctx, 'TAP OR P TO RESUME', CONFIG.WIDTH / 2, 104, {
      align: 'center', color: '#c9c2ad', shadow: '#141220',
    });
    PauseButton.draw(ctx, true, AudioManager.instance.muted);
  }
}

/** Конец забега: итоги и рекорд. */
class OverState {
  constructor(game) { this.game = game; this.t = 0; }

  enter() { this.t = 0; }

  canRetry() { return this.t > 0.6; }

  update(dt) { this.t += dt; }

  draw(ctx) {
    const game = this.game;
    game.world.draw(ctx);

    ctx.fillStyle = 'rgba(10,8,16,0.7)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const cx = CONFIG.WIDTH / 2;
    PixelFont.draw(ctx, 'GAME OVER', cx, 34, { align: 'center', scale: 3, color: '#b03027', shadow: '#141220' });
    PixelFont.draw(ctx, 'SCORE ' + game.finalScore, cx, 74, { align: 'center', color: '#f2e2b0', shadow: '#141220' });
    PixelFont.draw(ctx, 'DISTANCE ' + game.world.distance + ' M', cx, 88, { align: 'center', color: '#c9c2ad', shadow: '#141220' });
    PixelFont.draw(ctx, 'BEST ' + game.best, cx, 102, { align: 'center', color: '#c9832e', shadow: '#141220' });

    if (Math.floor(this.t * 2) % 2 === 0) {
      PixelFont.draw(ctx, 'TAP TO RETRY', cx, 130, { align: 'center', color: '#f7f3e3', shadow: '#141220' });
    }
  }
}
