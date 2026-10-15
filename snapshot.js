// Рендер-снимок игры в PNG (без браузера): свой растеризатор + PNG-энкодер.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const W = 320, H = 180;

// ---------- PNG ----------
function crc32(buf) {
  let c, table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, rgba, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const BG = [0x0b, 0x0f, 0x14];
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const a = rgba[si + 3] / 255;
      const di = y * (w * 3 + 1) + 1 + x * 3;
      raw[di] = Math.round(rgba[si] * a + BG[0] * (1 - a));
      raw[di + 1] = Math.round(rgba[si + 1] * a + BG[1] * (1 - a));
      raw[di + 2] = Math.round(rgba[si + 2] * a + BG[2] * (1 - a));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

// ---------- растр (RGBA; непрорисованное = прозрачное) ----------
function hex(c) {
  if (typeof c !== 'string') return [0, 0, 0, 1];
  if (c[0] === '#') {
    if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16), 1];
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return [0, 0, 0, 1];
}
function makeBuf(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4), alpha: 1 };
}
function blend(buf, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= buf.w || y >= buf.h || a <= 0) return;
  const i = (y * buf.w + x) * 4;
  const da = buf.data[i + 3] / 255;
  const oa = a + da * (1 - a);
  if (oa <= 0) return;
  buf.data[i] = Math.round((r * a + buf.data[i] * da * (1 - a)) / oa);
  buf.data[i + 1] = Math.round((g * a + buf.data[i + 1] * da * (1 - a)) / oa);
  buf.data[i + 2] = Math.round((b * a + buf.data[i + 2] * da * (1 - a)) / oa);
  buf.data[i + 3] = Math.round(oa * 255);
}
function fillRectOn(buf, x, y, w, h, style, alpha) {
  const [r, g, b, aa] = hex(style);
  const a = (aa === undefined ? 1 : aa) * alpha;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) blend(buf, xx, yy, r, g, b, a);
}

function makeCtx(bufRef) {
  const st = { fillStyle: '#000', globalAlpha: 1, imageSmoothingEnabled: false, strokeStyle: '#000', lineWidth: 1 };
  return new Proxy(st, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient') return (x0, y0, x1, y1) => ({ __grad: true, stops: [], addColorStop(o, c) { this.stops.push([o, c]); }, y0, y1 });
      if (p === 'measureText') return () => ({ width: 0 });
      if (p === 'fillRect') {
        return (x, y, w, h) => {
          let style = t.fillStyle;
          if (style && style.__grad) {
            const yy = Math.min(Math.max(y, style.y0), style.y1);
            const k = (yy - style.y0) / Math.max(1, style.y1 - style.y0);
            let c = style.stops[0] && style.stops[0][1];
            for (const [o, col] of style.stops) if (k >= o) c = col;
            style = c || '#000';
          }
          fillRectOn(bufRef.buf, x, y, w, h, style, t.globalAlpha);
        };
      }
      if (p === 'drawImage') {
        return (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
          const src = img.__blit || img;
          if (dh === undefined) { // 3-аргументная форма (img, dx, dy)
            dx = sx; dy = sy; dw = src.w; dh = src.h; sx = 0; sy = 0; sw = src.w; sh = src.h;
          }
          dx = Math.round(dx); dy = Math.round(dy); dw = Math.round(dw); dh = Math.round(dh);
          for (let yy = 0; yy < dh; yy++) {
            const sy2 = Math.floor(sy + (yy / dh) * sh);
            for (let xx = 0; xx < dw; xx++) {
              const sx2 = Math.floor(sx + (xx / dw) * sw);
              if (sx2 < 0 || sy2 < 0 || sx2 >= src.w || sy2 >= src.h) continue;
              const si = (sy2 * src.w + sx2) * 4;
              const sa = (src.data[si + 3] / 255) * t.globalAlpha;
              blend(bufRef.buf, dx + xx, dy + yy, src.data[si], src.data[si + 1], src.data[si + 2], sa);
            }
          }
        };
      }
      if (p === 'save') return () => { t.__saved = { ...st }; };
      if (p === 'restore') return () => { if (t.__saved) Object.assign(st, t.__saved); };
      if (p === 'translate' || p === 'scale' || p === 'beginPath' || p === 'arc' || p === 'fill' || p === 'stroke' || p === 'closePath' || p === 'moveTo' || p === 'lineTo') return () => undefined;
      if (p === 'strokeRect') return (x, y, w, h) => fillRectOn(bufRef.buf, x, y, w, h, t.strokeStyle, t.globalAlpha);
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

function makeCanvas(isSprite) {
  const ref = { buf: null };
  const cv = {
    width: isSprite ? 1 : W,
    height: isSprite ? 1 : H,
    get w() { return this.width; },
    get h() { return this.height; },
    __isSprite: !!isSprite,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: W * 2, height: H * 2 }),
    getContext() {
      if (!ref.buf || ref.buf.w !== this.width || ref.buf.h !== this.height) ref.buf = makeBuf(this.width, this.height);
      this.__buf = ref.buf;
      return makeCtx(ref);
    },
    get __blit() { return ref.buf; },
  };
  return cv;
}

// ---------- песочница ----------
const mainBuf = { buf: makeBuf(W, H) };
let pendingRaf = null;
const listeners = {};
const sandbox = {
  console: { log() {}, error: console.error, warn() {} }, Math, Date, JSON,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  requestAnimationFrame: (cb) => { pendingRaf = cb; },
  document: (() => {
    const byId = {};
    return {
      createElement: (tag) => makeCanvas(true),
      getElementById: (id) => (byId[id] = byId[id] || (() => { const c = makeCanvas(false); c.__main = true; return c; })()),
      addEventListener() {}, hidden: false,
    };
  })(),
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
};
sandbox.window = { addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }, AudioContext: undefined, webkitAudioContext: undefined };
vm.createContext(sandbox);

const webDir = path.join(__dirname, 'web');
const html = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
const files = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1].replace(/\//g, path.sep));
const bundle = files.map((f) => fs.readFileSync(path.join(webDir, f), 'utf8')).join('\n;\n');
vm.runInContext(bundle, sandbox, { filename: 'bundle.js' });

const game = sandbox.window.JungleRun;
const CONFIG = vm.runInContext('CONFIG', sandbox);

function frames(n, each) {
  for (let i = 0; i < n; i++) {
    const cb = pendingRaf; pendingRaf = null;
    if (each) each(i);
    cb(i * 16);
  }
}
function snap(file, caption) {
  const canvas = sandbox.document.getElementById('game');
  const ctx = canvas.getContext('2d');
  game.state.draw(ctx); // гарантировать свежий кадр в буфере
  writePNG(file, canvas.__blit.data, W, H);
  console.log('->', file, caption);
}

frames(5);
game.input.press('jump'); frames(3); game.input.release('jump');
frames(90);

// выставим препятствия рядом
sandbox.__game = game;
vm.runInContext(`
  const w = __game.world;
  for (const e of w.entities) e.kill();
  w.addObstacle(new Spikes(w.player.x + 50));
  w.addObstacle(new LowLog(w.player.x + 90));
  w.addEnemy(new Snake(w.player.x + 130));
  w.addEnemy(new Jaguar(w.player.x + 175));
  w.addItem(new Idol(w.player.x + 60, CONFIG.GROUND_Y - 40));
  w.addItem(new Heart(w.player.x + 210, CONFIG.GROUND_Y - 40));
`, sandbox);
frames(4);
snap(path.join(__dirname, 'snap_game.png'), 'gameplay');
console.log('player y/h =', game.world.player.y, game.world.player.h, 'cam =', JSON.stringify(game.world.camera));

// зум: область вокруг ног игрока (4x); X0/Y0 можно переопределить аргументами
(function zoom() {
  const args = process.argv.slice(2);
  const src = sandbox.document.getElementById('game').__blit;
  const x0 = args[0] !== undefined ? +args[0] : 40;
  const y0 = args[1] !== undefined ? +args[1] : 120;
  const w = args[2] !== undefined ? +args[2] : 60;
  const h = args[3] !== undefined ? +args[3] : 55;
  const k = 4;
  const out = Buffer.alloc(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++) {
    for (let x = 0; x < w * k; x++) {
      const si = ((y0 + Math.floor(y / k)) * src.w + (x0 + Math.floor(x / k))) * 4;
      const di = (y * w * k + x) * 4;
      src.data.copy(out, di, si, si + 4);
    }
  }
  writePNG(path.join(__dirname, 'snap_zoom.png'), out, w * k, h * k);
  console.log('-> snap_zoom.png', { x0, y0, w, h });
})();
