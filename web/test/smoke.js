/**
 * Headless smoke-тест (Node.js): прогоняет игровую логику без браузера
 * на мок-канвасе. Ловит опечатки вроде «нет такого метода» до того,
 * как игрок увидит белый экран.
 *
 * Запуск:  node test/smoke.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------------------
// Моки браузерного окружения
// ---------------------------------------------------------------------------

function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p === 'measureText') return () => ({ width: 0 });
      return () => undefined; // прочие методы canvas — no-op
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

function makeCanvas() {
  const ctx = makeCtx();
  return {
    width: 320,
    height: 180,
    getContext: () => ctx,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
  };
}

let pendingRaf = null;
const listeners = {};

const sandbox = {
  console,
  Math,
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  requestAnimationFrame: (cb) => { pendingRaf = cb; },
  document: {
    createElement: () => makeCanvas(),
    getElementById: () => makeCanvas(),
    addEventListener() {},
    hidden: false,
  },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
  },
};
sandbox.window = {
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  AudioContext: undefined,
  webkitAudioContext: undefined,
};
vm.createContext(sandbox);

// ---------------------------------------------------------------------------
// Загрузка всех файлов игры одним скриптом (порядок как в index.html)
// ---------------------------------------------------------------------------

const webDir = path.join(__dirname, '..'); // web/
// список скриптов берём прямо из index.html — тест всегда в курсе структуры
const html = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
const files = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1].replace(/\//g, path.sep));

const bundle = files
  .map((f) => `// ==== ${f} ====\n` + fs.readFileSync(path.join(webDir, f), 'utf8'))
  .join('\n;\n');

vm.runInContext(bundle, sandbox, { filename: 'jungle-run-bundle.js' });

const game = sandbox.window.JungleRun;
if (!game) throw new Error('Игра не создалась (window.JungleRun пуст)');
// константы игры лежат в лексическом окружении vm-песочницы
const CONFIG = vm.runInContext('CONFIG', sandbox);

// ---------------------------------------------------------------------------
// Прокрутка кадров
// ---------------------------------------------------------------------------

let now = 0;
function frames(n, each) {
  for (let i = 0; i < n; i++) {
    const cb = pendingRaf;
    pendingRaf = null;
    if (!cb) throw new Error('Цикл кадров оборвался на кадре ' + i);
    if (each) each(i);
    now += 1000 / 60;
    cb(now);
  }
}

const checks = [];
function assert(cond, msg) {
  checks.push({ ok: !!cond, msg });
  if (!cond) console.error('  FAIL:', msg);
}

// статистика событий
vm.runInContext(`
  events.on('biome:changed', () => { globalThis.__biomeChanges = (globalThis.__biomeChanges||0)+1; });
  events.on('enemy:stomped', () => { globalThis.__stomps = (globalThis.__stomps||0)+1; });
  events.on('player:dead', () => { globalThis.__deaths = (globalThis.__deaths||0)+1; });
  events.on('idol:collected', () => { globalThis.__idols = (globalThis.__idols||0)+1; });
  // снимок скорости в момент смены локации: должна сбрасываться
  events.on('biome:changed', (e) => {
    if (!globalThis.__game) return;
    globalThis.__speedAtBiome = globalThis.__speedAtBiome || [];
    globalThis.__speedAtBiome.push({
      loop: e.loop,
      prog: globalThis.__game.world.biomeProgress,
      speed: globalThis.__game.world.speed,
    });
  });
`, sandbox);

// ---------------------------------------------------------------------------
// ИИ тестового игрока: прыгает перед ямами/шипами, скользит под брёвнами
// ---------------------------------------------------------------------------

function ai(i) {
  if (game.state !== game.states.play) return;
  const w = game.world;
  const p = w.player;
  const px = p.x + p.w;
  let jumpNow = false;
  let slideNow = false;

  for (const e of w.entities) {
    const dx = e.x - px;
    if (dx < -40 || dx > 46) continue;
    if (e.collectible) continue;
    if (!e.damageOnTouch && !e.isPit) continue;
    if (e.isPit) {
      if (dx > -18 && dx < 16) jumpNow = true;                     // яма: прыжок с кромки
    } else if (e.y < CONFIG.GROUND_Y - 11 && e.h <= 9) {
      // низкие над головой: бревно/лиана/верёвка/балка/мышь/копьё
      if (dx > -(e.w + p.w + 4) && dx < 42) slideNow = true;
    } else if (dx > 6 && dx < 30) {
      jumpNow = true;                                              // шипы, статуя, враги
    }
  }
  // падаем в яму — второй прыжок
  if (!p.onGround && p.vy > 40 && !w.isGroundAt(p.x + p.w / 2)) jumpNow = true;

  if (jumpNow) {
    if (i % 2 === 0) game.input.press('jump'); else game.input.release('jump');
  } else {
    game.input.release('jump');
  }
  if (slideNow && p.onGround) game.input.press('slide'); else game.input.release('slide');
}

// ===========================================================================
// 1) Заставка
// ===========================================================================

frames(60);
assert(game.state === game.states.menu, 'menu: стартовое состояние');
assert(game.world.distance === 0, 'menu: дистанция не растёт до старта');

// ===========================================================================
// 2) Старт забега
// ===========================================================================

game.input.press('jump');
frames(5);
game.input.release('jump');
assert(game.state === game.states.play, 'play: тап по заставке стартует игру');
assert(game.world.biomeProgress === 0, 'speed: в начале локации прогресс = 0');
assert(game.world.speed === CONFIG.RUN_START, 'speed: в начале локации базовая скорость');

// ===========================================================================
// 3) Живая игра: ИИ играет ~25 секунд, собирает идолы, получает урон
// ===========================================================================

frames(1500, (i) => ai(i));
assert(game.world.distance > 100, 'play: дистанция копится (' + game.world.distance + ' м)');
assert(game.world.score > 0, 'score: очки за идолы (' + sandbox.__idols + ' шт)');
assert(game.world.player.lives <= 3 && game.world.player.lives >= 0, 'life: жизни в диапазоне');

// --- механика стомпа: чистим поле, ждём конца неуязвимости, кидаем змею ---
sandbox.__game = game;
const stompsBefore = sandbox.__stomps || 0;
const cleanFrames = () => {
  game.input.release('jump');
  game.input.release('slide');
  for (const e of game.world.entities) if (!e.__test) e.kill();
};
frames(150, cleanFrames); // неуязвимость истекает, новые препятствия вычищаются
vm.runInContext(`
  (function () {
    const p = __game.world.player;
    const s = new Snake(p.x + 26); // игрок успеет пробежать ~23px, пока падает
    s.__test = true;
    __game.world.addEnemy(s);
    p.y = CONFIG.GROUND_Y - 46;
  })();
`, sandbox);
frames(40, cleanFrames);
assert((sandbox.__stomps || 0) > stompsBefore, 'stomp: прыжок на змею убивает её');
assert(game.world.player.vy < 0 || game.world.player.onGround, 'stomp: после добивания есть отскок');

// ===========================================================================
// 4) Долгий прогон на «бог-режиме»: проверяем все локации и сложные паттерны
// ===========================================================================

const player = game.world.player;
const realTakeDamage = player.takeDamage.bind(player);
const livesBefore = player.lives;
player.takeDamage = () => false; // неуязвимость для длинного забега

let maxProg = 0;
let maxSpeed = CONFIG.RUN_START;
frames(24000, (i) => {
  ai(i);
  if (i % 30 === 0) {
    maxProg = Math.max(maxProg, game.world.biomeProgress);
    maxSpeed = Math.max(maxSpeed, game.world.speed);
  }
});
assert(game.world.distance > 1500, 'long: долгий забег (' + game.world.distance + ' м)');
assert(sandbox.__biomeChanges >= 4, 'biome: все локации сменяются (' + sandbox.__biomeChanges + ' смен)');
assert(player.lives === livesBefore, 'godmode: за долгий забег урон не прошёл');
assert(maxProg > 0.7, 'speed: прогресс локации доходит до её конца (' + maxProg.toFixed(2) + ')');
assert(maxSpeed > CONFIG.RUN_START + 60, 'speed: внутри локации скорость растёт (до ' + Math.round(maxSpeed) + ')');

// на каждой смене локации скорость возвращается к базовой
const speedAtBiome = sandbox.__speedAtBiome || [];
assert(speedAtBiome.length >= 3, 'speed: снимков скорости на смене локации (' + speedAtBiome.length + ')');
assert(
  speedAtBiome.every((s) => s.prog === 0 && Math.abs(s.speed - (CONFIG.RUN_START + s.loop * 9)) < 0.01),
  'speed: на новой локации разгон начинается заново',
);

// монетки/сердечки не должны оказываться внутри препятствий
const rectsOverlapFn = vm.runInContext('rectsOverlap', sandbox);
let insideObstacle = 0;
for (const e of game.world.entities) {
  if (!e.collectible) continue;
  const ib = { x: e.x, y: e.baseY ?? e.y, w: e.w, h: e.h };
  for (const o of game.world.entities) {
    if (!o.isObstacle || o.isPit) continue;
    if (rectsOverlapFn(ib, o.hitbox)) insideObstacle++;
  }
}
assert(insideObstacle === 0, 'items: монетки не внутри препятствий (' + insideObstacle + ')');

player.takeDamage = realTakeDamage; // возвращаем смертность

// ===========================================================================
// 5) Пауза и возврат
// ===========================================================================

game.setState('pause');
frames(10);
assert(game.state === game.states.pause, 'pause: состояние паузы');
const pausedDist = game.world.distance;
frames(30);
assert(game.world.distance === pausedDist, 'pause: мир заморожен');
game.setState('play');
frames(10);
assert(game.state === game.states.play, 'play: возврат из паузы');

// ===========================================================================
// 6) Смерть и экран Game Over
// ===========================================================================

for (let i = 0; i < 4 && game.state === game.states.play; i++) {
  frames(130); // ждём конца неуязвимости
  if (game.state === game.states.play) game.world.player.takeDamage(1);
}
assert(sandbox.__deaths >= 1, 'death: событие смерти отправлено');
frames(80);
assert(game.state === game.states.over, 'over: экран Game Over (' + game.state.constructor.name + ')');

// ===========================================================================
// 7) Рестарт и рекорд
// ===========================================================================

frames(50); // canRetry
game.startRun();
frames(30);
assert(game.state === game.states.play, 'restart: новая попытка стартует');
assert(game.world.distance < 30, 'restart: дистанция сброшена');
assert(game.world.player.lives === 3, 'restart: жизни восстановлены');
assert(game.best > 0, 'best: рекорд сохранён (' + game.best + ')');

// ===========================================================================
// Итог
// ===========================================================================

const failed = checks.filter((c) => !c.ok);
console.log(`\nSmoke test: ${checks.length - failed.length}/${checks.length} проверок прошло`);
if (failed.length) {
  console.log('Провалены:');
  for (const f of failed) console.log(' -', f.msg);
  process.exit(1);
}
console.log('OK');
