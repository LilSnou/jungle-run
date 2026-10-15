/**
 * Village — деревня аборигенов: закатное небо, хижины, тотемы,
 * дым костров. Здесь активнее воины с копьями.
 */
class Village extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.clouds = [];
    for (let i = 0; i < 4; i++) this.clouds.push({ x: i * 80 + rng() * 30, y: 14 + rng() * 20, w: 30 + rng() * 24 });

    this.huts = [];
    for (let i = 0; i < 6; i++) this.huts.push({ x: i * 56 + rng() * 20, w: 22 + rng() * 10, h: 14 + rng() * 6 });

    this.totems = [];
    for (let i = 0; i < 5; i++) this.totems.push({ x: i * 74 + rng() * 26, h: 22 + rng() * 14 });

    this.fires = [];
    for (let i = 0; i < 4; i++) this.fires.push({ x: i * 92 + rng() * 30 });
  }

  get name() { return 'VILLAGE'; }
  get track() { return 'village'; }
  get skyTop() { return '#7a3f8c'; }
  get skyBottom() { return '#f7a04b'; }
  get groundTop() { return '#b98a4b'; }
  get groundDirt() { return '#8a5a2e'; }
  get groundShade() { return '#6e4522'; }
  get groundLine() { return '#5c381b'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // заходящее солнце
    const sunX = 190 - ((cam.x * 0.04) % 700);
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(sunX - 16, 66, 32, 32);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(sunX - 10, 72, 20, 20);

    // облака
    Biome.parallax(ctx, cam, 0.08, 320, this.clouds, (ctx2, x, c) => {
      ctx2.fillStyle = '#e8b98a';
      ctx2.fillRect(x, c.y, c.w, 5);
      ctx2.fillRect(x + 6, c.y - 3, c.w - 16, 4);
    });

    // хижины
    Biome.parallax(ctx, cam, 0.3, 336, this.huts, (ctx2, x, hut) => {
      const base = CONFIG.GROUND_Y - 12;
      ctx2.fillStyle = '#7a5230';
      ctx2.fillRect(x, base - hut.h, hut.w, hut.h);
      ctx2.fillStyle = '#c9a86a';
      for (let i = 0; i < hut.w; i += 6) ctx2.fillRect(x + i, base - hut.h, 2, hut.h);
      // соломенная крыша
      ctx2.fillStyle = '#d9b26a';
      ctx2.fillRect(x - 3, base - hut.h - 8, hut.w + 6, 8);
      ctx2.fillRect(x + 2, base - hut.h - 12, hut.w - 4, 5);
      // дверь
      ctx2.fillStyle = '#3d2a17';
      ctx2.fillRect(x + hut.w / 2 - 3, base - 8, 6, 8);
    });

    // тотемные столбы
    Biome.parallax(ctx, cam, 0.45, 370, this.totems, (ctx2, x, tot) => {
      const base = CONFIG.GROUND_Y - 12;
      ctx2.fillStyle = '#8a4b23';
      ctx2.fillRect(x, base - tot.h, 8, tot.h);
      ctx2.fillStyle = '#e0c53a';
      ctx2.fillRect(x + 1, base - tot.h + 3, 2, 2);
      ctx2.fillRect(x + 5, base - tot.h + 3, 2, 2);
      ctx2.fillStyle = '#b03027';
      ctx2.fillRect(x + 2, base - tot.h + 8, 4, 2);
      ctx2.fillStyle = '#3fae4a';
      ctx2.fillRect(x, base - tot.h - 4, 8, 4);
    });

    // дым костров
    const t = this.time;
    Biome.parallax(ctx, cam, 0.6, 460, this.fires, (ctx2, x, f) => {
      const base = CONFIG.GROUND_Y - 12;
      for (let i = 0; i < 4; i++) {
        const rise = (t * 14 + i * 9) % 34;
        ctx2.globalAlpha = Math.max(0, 0.5 - rise / 70);
        ctx2.fillStyle = '#d8d3c8';
        const drift = Math.sin(t * 2 + i) * 3;
        ctx2.fillRect(Math.round(x + 2 + drift), Math.round(base - 8 - rise), 4, 4);
      }
      ctx2.globalAlpha = 1;
      ctx2.fillStyle = '#e07a2e';
      ctx2.fillRect(x, base - 4, 6, 4);
    });
  }

  drawForeground(ctx, cam) {
    // бегущие собаки/свиньи вдалеке? — оставим пальмовые листья по краям
    const t = this.time;
    ctx.fillStyle = '#4a7a2f';
    const sway = Math.sin(t * 1.7) * 3;
    ctx.fillRect(6 + sway, 96, 30, 5);
    ctx.fillRect(12 + sway, 102, 20, 4);
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
        spawns: [{ type: 'pit', at: 50, w: dd > 0.5 ? 42 : 34 }],
        items: Biome.idolArc(44, 4, 46),
      })),
      P(d > 0.2 ? 2.5 : 0, { length: 190, spawns: [{ type: 'warrior', at: 120 }], items: [] }),
      P(d > 0.15 ? 2 : 0, { length: 150, spawns: [{ type: 'snake', at: 95 }], items: [] }),
      P(d > 0.3 ? 2 : 0, {
        length: 195, spawns: [{ type: 'warrior', at: 90 }, { type: 'spikes', at: 155 }], items: [],
      }),
      P(d > 0.35 ? 2 : 0, (dd) => ({
        length: 200,
        spawns: dd > 0.65
          ? [{ type: 'bat', at: 100, alt: 18 }, { type: 'bat', at: 134, alt: 18 }]
          : [{ type: 'bat', at: 100, alt: 18 }],
        items: [],
      })),
      P(d > 0.45 ? 2 : 0, { length: 200, spawns: [{ type: 'jaguar', at: 150 }], items: [] }),
      P(d > 0.4 ? 1.5 : 0, {
        length: 195, spawns: [{ type: 'pit', at: 46, w: 34 }, { type: 'warrior', at: 140 }], items: [],
      }),
      P(0.6, { length: 130, spawns: [], items: [{ type: 'heart', at: 60, alt: 32 }] }),
    ];
    const picked = Biome.weightedPick(rng, table);
    return typeof picked === 'function' ? picked(d) : picked;
  }
}
