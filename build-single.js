/**
 * build-single.js — собирает всю игру в ОДИН самодостаточный HTML-файл.
 *
 * Зачем: игра по умолчанию — это index.html + ~35 JS-файлов рядом.
 * Такой файл нельзя переслать одним сообщением (другу придет пустой экран).
 * Сборщик инлайнит все <script src> в один файл, который открывается
 * из любой папки, с флешки, из Telegram или почты — двойным кликом.
 *
 * Запуск:  node build-single.js   →  появится JungleRun.html
 */
const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, 'web');
const html = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');

let inlined = 0;
const out = html.replace(/<script src="([^"]+)"\s*><\/script>/g, (all, src) => {
  const file = path.join(webDir, src.replace(/\//g, path.sep));
  let code = fs.readFileSync(file, 'utf8');
  // защита: строка "</script>" внутри кода сломала бы разметку
  code = code.replace(/<\/script/gi, '<\\/script');
  inlined++;
  return `<script>\n/* ==== ${src} ==== */\n${code}\n</script>`;
});

const remaining = /<script src=/.test(out);
if (remaining) throw new Error('Не все скрипты были инлайнены!');

const target = path.join(__dirname, 'JungleRun.html');
fs.writeFileSync(target, out);

const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`OK: ${inlined} скриптов инлайнено -> ${target} (${kb} КБ)`);

// ---------------------------------------------------------------------------
// Самопроверка: запускаем собранный файл в песочнице (как smoke-тест) и
// убеждаемся, что игра создается и кадры крутятся.
// ---------------------------------------------------------------------------

const vm = require('vm');

function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p === 'measureText') return () => ({ width: 0 });
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

function makeCanvas() {
  const ctx = makeCtx();
  return {
    width: 320, height: 180,
    getContext: () => ctx,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
  };
}

let pendingRaf = null;
const sandbox = {
  console, Math,
  setInterval: () => 0, clearInterval: () => {},
  setTimeout: () => 0, clearTimeout: () => {},
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
sandbox.window = { addEventListener() {}, AudioContext: undefined, webkitAudioContext: undefined };
vm.createContext(sandbox);

// выполняем только содержимое <script>...</script> (без тегов)
const code = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n;\n');
vm.runInContext(code, sandbox, { filename: 'JungleRun-single.js' });

const game = sandbox.window.JungleRun;
if (!game) throw new Error('Собранный файл не создал игру (window.JungleRun пуст)');

let now = 0;
for (let i = 0; i < 60; i++) {
  const cb = pendingRaf;
  pendingRaf = null;
  if (!cb) throw new Error('Цикл кадров оборвался на кадре ' + i);
  now += 1000 / 60;
  cb(now);
}
const stateName = game.state && game.state.constructor && game.state.constructor.name;
if (stateName !== 'MenuState') throw new Error('Ожидался MenuState, получен ' + stateName);
console.log('OK: самопроверка — игра создается, 60 кадров отрисованы, меню активно');
