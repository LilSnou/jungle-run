/**
 * Jungle — джунгли: стартовая локация.
 * Многослойный параллакс: два диапазона гор с туманом, водопады,
 * три вида деревьев, кусты у земли, крона с лианами, лучи света,
 * птицы и светлячки.
 */
class Jungle extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({ x: i * 54 + rng() * 26, y: 12 + rng() * 24, w: 30 + rng() * 30, h: 6 + rng() * 4 });
    }

    this.farMountains = [];
    for (let i = 0; i < 7; i++) {
      this.farMountains.push({ x: i * 50 + rng() * 16, w: 44 + rng() * 30, h: 34 + rng() * 26, fall: rng() > 0.6 });
    }

    this.nearMountains = [];
    for (let i = 0; i < 6; i++) {
      this.nearMountains.push({ x: i * 56 + rng() * 20, w: 50 + rng() * 26, h: 22 + rng() * 18 });
    }

    this.trees = [];
    for (let i = 0; i < 9; i++) {
      this.trees.push({
        x: i * 36 + rng() * 14,
        kind: Math.floor(rng() * 3),               // 0 — широкая крона, 1 — пальма, 2 — сухое дерево
        h: 26 + rng() * 18,
        w: 16 + rng() * 12,
      });
    }

    this.bushes = [];
    for (let i = 0; i < 10; i++) {
      this.bushes.push({ x: i * 32 + rng() * 12, w: 10 + rng() * 12, h: 6 + rng() * 5 });
    }

    this.canopy = [];
    for (let i = 0; i < 12; i++) {
      this.canopy.push({ x: i * 27 + rng() * 9, r: 9 + rng() * 9, vines: rng() > 0.45 ? 2 + Math.floor(rng() * 3) : 0 });
    }

    this.birds = [];
    for (let i = 0; i < 3; i++) {
      this.birds.push({ x: i * 110 + rng() * 40, y: 24 + rng() * 30, speed: 14 + rng() * 10, phase: rng() * 6 });
    }
  }

  get name() { return 'ДЖУНГЛИ'; }
  get track() { return 'jungle'; }
  get skyTop() { return '#3f9fd8'; }
  get skyBottom() { return '#a9dba4'; }
  get groundTop() { return '#4e9a3f'; }
  get groundDirt() { return '#6b4a25'; }
  get groundShade() { return '#54381b'; }
  get groundLine() { return '#2f6b28'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT, GY = CONFIG.GROUND_Y;
    const t = this.time;

    // --- небо с градиентом ---
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(0.65, '#7fc4b8');
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // --- солнце с ореолом ---
    const sunX = 250 - ((cam.x * 0.04) % 640);
    ctx.fillStyle = 'rgba(255,240,170,0.25)';
    ctx.fillRect(sunX - 22, 12, 44, 44);
    ctx.fillStyle = 'rgba(255,240,170,0.45)';
    ctx.fillRect(sunX - 17, 17, 34, 34);
    ctx.fillStyle = '#ffe98a';
    ctx.fillRect(sunX - 13, 21, 26, 26);
    ctx.fillStyle = '#fff6c2';
    ctx.fillRect(sunX - 8, 26, 16, 16);

    // --- облака (двухслойные) ---
    Biome.parallax(ctx, cam, 0.06, 324, this.clouds, (ctx2, x, c) => {
      ctx2.fillStyle = '#eef7ef';
      ctx2.fillRect(x, c.y, c.w, c.h);
      ctx2.fillRect(x + 6, c.y - 4, c.w - 16, 5);
      ctx2.fillStyle = '#d4e8d8';
      ctx2.fillRect(x + 2, c.y + c.h, c.w - 6, 2);
    });

    // --- дальние горы с водопадами ---
    Biome.parallax(ctx, cam, 0.13, 350, this.farMountains, (ctx2, x, m) => {
      const base = GY - 16;
      for (let k = 0; k < m.h; k++) {
        const w = Math.round(m.w * (1 - 0.85 * (k / m.h)));
        ctx2.fillStyle = k > m.h * 0.6 ? '#2f6b63' : '#3d7f74';
        ctx2.fillRect(x + Math.round((m.w - w) / 2), base - k, w, 1);
      }
      // водопад, стекающий со скалы
      if (m.fall) {
        const fx = x + Math.round(m.w / 2) - 1;
        for (let k = 0; k < 26; k++) {
          const shimmer = (Math.floor(t * 14) + k) % 3;
          ctx2.fillStyle = shimmer === 0 ? '#bfe8f0' : '#8fd0e0';
          ctx2.fillRect(fx + (k % 2), base - 26 + k, 2, 1);
        }
        // брызги внизу
        ctx2.fillStyle = '#d8f0f4';
        ctx2.fillRect(fx - 3, base - 2, 8, 2);
      }
    });

    // --- полоса тумана у подножия ---
    ctx.fillStyle = 'rgba(210,235,220,0.35)';
    ctx.fillRect(0, GY - 26, W, 8);
    ctx.fillStyle = 'rgba(210,235,220,0.2)';
    ctx.fillRect(0, GY - 20, W, 6);

    // --- ближние холмы ---
    Biome.parallax(ctx, cam, 0.22, 336, this.nearMountains, (ctx2, x, m) => {
      const base = GY - 14;
      for (let k = 0; k < m.h; k++) {
        const w = Math.round(m.w * (1 - 0.9 * (k / m.h)));
        ctx2.fillStyle = k > m.h * 0.5 ? '#2b5f3f' : '#35704a';
        ctx2.fillRect(x + Math.round((m.w - w) / 2), base - k, w, 1);
      }
    });

    // --- деревья трёх видов ---
    Biome.parallax(ctx, cam, 0.38, 324, this.trees, (ctx2, x, tr) => {
      const base = GY - 10;
      if (tr.kind === 0) {
        // широкая тропическая крона
        ctx2.fillStyle = '#4a3520';
        ctx2.fillRect(x + 3, base - tr.h, 4, tr.h);
        ctx2.fillStyle = '#276b34';
        ctx2.fillRect(x - tr.w / 2 + 3, base - tr.h - 10, tr.w, 12);
        ctx2.fillRect(x - tr.w / 4 + 3, base - tr.h - 16, tr.w / 2, 8);
        ctx2.fillStyle = '#3fae4a';
        ctx2.fillRect(x - tr.w / 3 + 3, base - tr.h - 12, tr.w / 2, 6);
        ctx2.fillStyle = '#57c25c';
        ctx2.fillRect(x - tr.w / 4 + 3, base - tr.h - 15, 4, 3);
      } else if (tr.kind === 1) {
        // пальма
        ctx2.fillStyle = '#6b5030';
        for (let k = 0; k < tr.h; k++) ctx2.fillRect(x + 2 + Math.round(Math.sin(k / 9) * 3), base - k, 2, 1);
        const topX = x + 2 + Math.round(Math.sin(tr.h / 9) * 3);
        ctx2.fillStyle = '#2f7a3a';
        ctx2.fillRect(topX - 8, base - tr.h - 2, 7, 2);
        ctx2.fillRect(topX + 1, base - tr.h - 2, 7, 2);
        ctx2.fillRect(topX - 5, base - tr.h - 4, 10, 2);
        ctx2.fillStyle = '#43964a';
        ctx2.fillRect(topX - 3, base - tr.h - 5, 6, 2);
      } else {
        // сухое дерево с vines
        ctx2.fillStyle = '#5c4526';
        ctx2.fillRect(x + 2, base - tr.h, 3, tr.h);
        ctx2.fillRect(x - 3, base - tr.h + 6, 6, 2);
        ctx2.fillRect(x + 4, base - tr.h + 10, 6, 2);
        ctx2.fillStyle = '#3f7a3a';
        ctx2.fillRect(x - 2, base - tr.h + 8, 1, 6);
        ctx2.fillRect(x + 8, base - tr.h + 12, 1, 8);
      }
    });

    // --- кусты у самой земли ---
    Biome.parallax(ctx, cam, 0.72, 320, this.bushes, (ctx2, x, b) => {
      const base = GY - 8;
      ctx2.fillStyle = '#276b34';
      ctx2.fillRect(x, base - b.h, b.w, b.h);
      ctx2.fillRect(x + 2, base - b.h - 3, b.w - 4, 4);
      ctx2.fillStyle = '#3fae4a';
      ctx2.fillRect(x + 2, base - b.h - 1, b.w - 6, 2);
      ctx2.fillStyle = '#d94f6b';  // цветок
      if (b.w > 14) ctx2.fillRect(x + b.w - 5, base - b.h - 3, 2, 2);
    });

    // --- крона сверху с лианами ---
    Biome.parallax(ctx, cam, 0.85, 324, this.canopy, (ctx2, x, c) => {
      ctx2.fillStyle = '#1f4f26';
      ctx2.fillRect(x - c.r, 0, c.r * 2, 11);
      ctx2.fillRect(x - c.r / 2, 11, c.r, 5);
      ctx2.fillStyle = '#2b6b31';
      ctx2.fillRect(x - c.r + 3, 4, c.r, 4);
      ctx2.fillStyle = '#173d1e';
      ctx2.fillRect(x - c.r + 1, 9, 4, 2);
      // лианы, слегка покачивающиеся
      for (let v = 0; v < c.vines; v++) {
        const vx = x - c.r + 4 + v * 7;
        const sway = Math.round(Math.sin(t * 1.1 + v + x * 0.05) * 2);
        const len = 12 + (v * 5) % 14;
        ctx2.fillStyle = '#2f6b35';
        ctx2.fillRect(vx + sway, 14, 1, len);
        ctx2.fillStyle = '#4e9a3f';
        ctx2.fillRect(vx + sway - 1, 14 + len - 2, 3, 2);
      }
    });

    // --- лучи света сквозь крону ---
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#fff8d8';
    const rayShift = (cam.x * 0.5) % 90;
    for (let i = -1; i < 6; i++) {
      const rx = i * 90 - rayShift;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 26, 0);
      ctx.lineTo(rx + 60, GY);
      ctx.lineTo(rx + 20, GY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawForeground(ctx, cam) {
    const t = this.time;

    // стайка птиц, пересекающих экран
    for (const b of this.birds) {
      const bx = ((b.x + t * b.speed) % (CONFIG.WIDTH + 80)) - 40;
      const by = b.y + Math.sin(t * 2 + b.phase) * 4;
      const flap = Math.floor(t * 8 + b.phase) % 2;
      ctx.fillStyle = '#1c2a24';
      ctx.fillRect(Math.round(bx), Math.round(by), 3, 1);
      ctx.fillRect(Math.round(bx) - (flap ? 2 : 1), Math.round(by) - 1, 2, 1);
      ctx.fillRect(Math.round(bx) + 2, Math.round(by) - 1, 2, 1);
    }

    // светлячки-споры
    ctx.fillStyle = '#d8f5a3';
    for (let i = 0; i < 7; i++) {
      const x = ((i * 61 + t * 10 * (i % 2 ? 1 : -1)) % (CONFIG.WIDTH + 40)) - 20;
      const y = 36 + Math.sin(t * 1.4 + i * 2.1) * 20 + i * 13;
      const blink = Math.floor(t * 4 + i) % 3 !== 0;
      if (blink) ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }

    // крупные листья по краям экрана (передний план)
    ctx.fillStyle = '#1f4f26';
    ctx.fillRect(0, 116, 14, 5);
    ctx.fillRect(4, 122, 10, 4);
    ctx.fillStyle = '#2b6b31';
    ctx.fillRect(CONFIG.WIDTH - 13, 104, 13, 5);
    ctx.fillRect(CONFIG.WIDTH - 9, 110, 9, 4);
  }

  getPattern(d) {
    const rng = this.rng;
    const P = (weight, value) => ({ weight, value });
    const table = [
      P(3, { length: 110, spawns: [], items: Biome.idolArc(40, 4, 30) }),
      P(3, { length: 145, spawns: [{ type: 'spikes', at: 60 }], items: Biome.idolArc(50, 5, 48) }),
      P(3, {
        length: 150,
        spawns: [{ type: 'vine', at: 70 }],
        items: [{ type: 'idol', at: 60, alt: 0 }, { type: 'idol', at: 72, alt: 0 }, { type: 'idol', at: 84, alt: 0 }],
      }),
      P(3, (dd) => ({
        length: 155,
        spawns: [{ type: 'pit', at: 50, w: dd > 0.55 ? 42 : 34 }],
        items: Biome.idolArc(44, 4, 46),
      })),
      P(d > 0.1 ? 2 : 0, { length: 150, spawns: [{ type: 'snake', at: 95 }], items: [] }),
      P(d > 0.3 ? 2 : 0, {
        length: 168, spawns: [{ type: 'spikes', at: 60 }, { type: 'spikes', at: 92 }], items: [],
      }),
      P(d > 0.2 ? 2 : 0, {
        length: 200,
        spawns: [{ type: 'vine', at: 60 }, { type: 'vine', at: 89 }],  // длинное скольжение
        items: [{ type: 'idol', at: 56, alt: 0 }, { type: 'idol', at: 74, alt: 0 }, { type: 'idol', at: 92, alt: 0 }],
      }),
      P(d > 0.25 ? 2 : 0, (dd) => ({
        length: 165,
        spawns: dd > 0.6
          ? [{ type: 'bat', at: 95, alt: 18 }, { type: 'bat', at: 128, alt: 18 }]
          : [{ type: 'bat', at: 95, alt: 18 }],
        items: [],
      })),
      P(d > 0.4 ? 2 : 0, { length: 200, spawns: [{ type: 'jaguar', at: 150 }], items: [] }),
      P(d > 0.35 ? 1.5 : 0, {
        length: 190, spawns: [{ type: 'vine', at: 60 }, { type: 'spikes', at: 130 }], items: [],
      }),
      P(d > 0.45 ? 1.5 : 0, {
        length: 190, spawns: [{ type: 'pit', at: 50, w: 34 }, { type: 'snake', at: 132 }], items: [],
      }),
      P(0.6, { length: 130, spawns: [], items: [{ type: 'heart', at: 60, alt: 32 }] }),
    ];
    const picked = Biome.weightedPick(rng, table);
    return typeof picked === 'function' ? picked(d) : picked;
  }
}
