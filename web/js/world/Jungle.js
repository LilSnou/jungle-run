/**
 * Jungle — джунгли: стартовая локация.
 * Фон: солнце, горы, деревья джунглей, крона и vines сверху.
 */
class Jungle extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.clouds = [];
    for (let i = 0; i < 5; i++) this.clouds.push({ x: i * 64 + rng() * 30, y: 16 + rng() * 22, w: 26 + rng() * 26 });

    this.mountains = [];
    for (let i = 0; i < 6; i++) this.mountains.push({ x: i * 58 + rng() * 20, w: 40 + rng() * 26, h: 26 + rng() * 24 });

    this.trees = [];
    for (let i = 0; i < 7; i++) this.trees.push({ x: i * 46 + rng() * 18, h: 24 + rng() * 18, w: 14 + rng() * 10 });

    this.canopy = [];
    for (let i = 0; i < 10; i++) this.canopy.push({ x: i * 32 + rng() * 10, r: 8 + rng() * 8 });
  }

  get name() { return 'JUNGLE'; }
  get track() { return 'jungle'; }
  get skyTop() { return '#3f9fd8'; }
  get skyBottom() { return '#9fd6a2'; }
  get groundTop() { return '#4e9a3f'; }
  get groundDirt() { return '#6b4a25'; }
  get groundShade() { return '#54381b'; }
  get groundLine() { return '#2f6b28'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    // небо
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // солнце
    const sunX = 250 - ((cam.x * 0.05) % 600);
    ctx.fillStyle = '#ffe98a';
    ctx.fillRect(sunX - 14, 20, 28, 28);
    ctx.fillStyle = '#fff6c2';
    ctx.fillRect(sunX - 9, 25, 18, 18);

    // облака
    Biome.parallax(ctx, cam, 0.08, 320, this.clouds, (ctx2, x, c) => {
      ctx2.fillStyle = '#eef7ef';
      ctx2.fillRect(x, c.y, c.w, 6);
      ctx2.fillRect(x + 6, c.y - 4, c.w - 14, 5);
    });

    // дальние горы
    Biome.parallax(ctx, cam, 0.16, 348, this.mountains, (ctx2, x, m) => {
      ctx2.fillStyle = '#2f6b63';
      for (let k = 0; k < m.h; k++) {
        const w = Math.round(m.w * (1 - k / m.h));
        ctx2.fillRect(x + Math.round((m.w - w) / 2), CONFIG.GROUND_Y - 14 - k, w, 1);
      }
    });

    // деревья джунглей
    Biome.parallax(ctx, cam, 0.38, 322, this.trees, (ctx2, x, t) => {
      const base = CONFIG.GROUND_Y - 10;
      ctx2.fillStyle = '#4a3520';
      ctx2.fillRect(x + 2, base - t.h, 4, t.h);
      ctx2.fillStyle = '#2f7a3a';
      ctx2.fillRect(x - t.w / 2 + 2, base - t.h - 10, t.w, 12);
      ctx2.fillRect(x - t.w / 4 + 2, base - t.h - 16, t.w / 2, 8);
      ctx2.fillStyle = '#3fae4a';
      ctx2.fillRect(x - t.w / 3 + 2, base - t.h - 12, t.w / 2, 6);
    });

    // крона сверху
    Biome.parallax(ctx, cam, 0.7, 320, this.canopy, (ctx2, x, c) => {
      ctx2.fillStyle = '#1f4f26';
      ctx2.fillRect(x - c.r, 0, c.r * 2, 10);
      ctx2.fillRect(x - c.r / 2, 10, c.r, 5);
      ctx2.fillStyle = '#2b6b31';
      ctx2.fillRect(x - c.r + 3, 4, c.r, 4);
    });
  }

  drawForeground(ctx, cam) {
    // парящие светлячки-споры
    const t = this.time;
    ctx.fillStyle = '#d8f5a3';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 73 + t * 12 * (i % 2 ? 1 : -1)) % (CONFIG.WIDTH + 40)) - 20;
      const y = 40 + Math.sin(t * 1.4 + i * 2.1) * 18 + i * 12;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  getPattern(d) {
    const rng = this.rng;
    const P = (weight, value) => ({ weight, value });
    const table = [
      P(3, { length: 110, spawns: [], items: Biome.idolArc(40, 4, 30) }),
      P(3, { length: 145, spawns: [{ type: 'spikes', at: 60 }], items: Biome.idolArc(50, 5, 48) }),
      P(3, {
        length: 150,
        spawns: [{ type: 'log', at: 70 }],
        items: [{ type: 'idol', at: 62, alt: 13 }, { type: 'idol', at: 76, alt: 13 }],
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
      P(d > 0.25 ? 2 : 0, (dd) => ({
        length: 165,
        spawns: dd > 0.6
          ? [{ type: 'bat', at: 95, alt: 18 }, { type: 'bat', at: 128, alt: 18 }]
          : [{ type: 'bat', at: 95, alt: 18 }],
        items: [],
      })),
      P(d > 0.4 ? 2 : 0, { length: 200, spawns: [{ type: 'jaguar', at: 150 }], items: [] }),
      P(d > 0.35 ? 1.5 : 0, {
        length: 190, spawns: [{ type: 'log', at: 60 }, { type: 'spikes', at: 130 }], items: [],
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
