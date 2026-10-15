/**
 * Temple — заброшенный храм майя: каменные пирамиды, факелы,
 * висящие лианы. Самая злая локация: статуи, длинные ямы, воины.
 */
class Temple extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.pyramids = [];
    for (let i = 0; i < 5; i++) this.pyramids.push({ x: i * 74 + rng() * 26, w: 44 + rng() * 26, h: 30 + rng() * 26 });

    this.torches = [];
    for (let i = 0; i < 6; i++) this.torches.push({ x: i * 56 + rng() * 20 });

    this.vines = [];
    for (let i = 0; i < 7; i++) this.vines.push({ x: i * 48 + rng() * 16, len: 16 + rng() * 22 });

    this.rubles = [];
    for (let i = 0; i < 8; i++) this.rubles.push({ x: i * 40 + rng() * 14, w: 6 + rng() * 10 });
  }

  get name() { return 'TEMPLE'; }
  get track() { return 'temple'; }
  get skyTop() { return '#1d1830'; }
  get skyBottom() { return '#5a3f63'; }
  get groundTop() { return '#6a6f78'; }
  get groundDirt() { return '#4a4e56'; }
  get groundShade() { return '#3a3d44'; }
  get groundLine() { return '#8a9099'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // луна
    const moonX = 70 - ((cam.x * 0.03) % 800);
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(moonX - 10, 18, 20, 20);
    ctx.fillStyle = '#c8c0a8';
    ctx.fillRect(moonX - 6, 24, 4, 4);
    ctx.fillRect(moonX + 2, 20, 3, 3);

    // пирамиды
    Biome.parallax(ctx, cam, 0.2, 370, this.pyramids, (ctx2, x, p) => {
      const base = CONFIG.GROUND_Y - 8;
      ctx2.fillStyle = '#2f2a44';
      for (let k = 0; k < p.h; k++) {
        const w = Math.round(p.w * (1 - 0.7 * (k / p.h)));
        ctx2.fillRect(x + Math.round((p.w - w) / 2), base - k, w, 1);
      }
      // храм сверху
      ctx2.fillStyle = '#3d3657';
      ctx2.fillRect(x + p.w / 2 - 5, base - p.h - 6, 10, 7);
      ctx2.fillStyle = '#e0a53a'; // свечение в дверном проёме
      ctx2.fillRect(x + p.w / 2 - 2, base - p.h - 4, 4, 4);
    });

    // стены храма с узорами
    ctx.fillStyle = '#272238';
    ctx.fillRect(0, CONFIG.GROUND_Y - 22, W, 3);
    const wallOff = (cam.x * 0.55) % 24;
    ctx.fillStyle = '#332c48';
    for (let x = -wallOff; x < W; x += 24) {
      ctx.fillRect(Math.round(x), CONFIG.GROUND_Y - 19, 10, 2);
    }

    // висящие vines
    Biome.parallax(ctx, cam, 0.55, 336, this.vines, (ctx2, x, v) => {
      ctx2.fillStyle = '#26502e';
      ctx2.fillRect(x, 0, 2, v.len);
      ctx2.fillStyle = '#357040';
      ctx2.fillRect(x + 6, 0, 2, v.len - 6);
      ctx2.fillStyle = '#2b6b31';
      ctx2.fillRect(x - 2, v.len - 3, 5, 3);
    });

    // факелы с анимированным пламенем
    const t = this.time;
    Biome.parallax(ctx, cam, 0.8, 456, this.torches, (ctx2, x, f) => {
      const base = CONFIG.GROUND_Y - 20;
      ctx2.fillStyle = '#5c4a30';
      ctx2.fillRect(x + 1, base, 3, 10);
      const fl = Math.floor(t * 10 + f.x) % 3;
      ctx2.fillStyle = '#e07a2e';
      ctx2.fillRect(x, base - 5 - fl, 5, 6 + fl);
      ctx2.fillStyle = '#ffd27a';
      ctx2.fillRect(x + 1, base - 3 - fl, 3, 4);
    });
  }

  drawForeground(ctx, cam) {
    // каменная крошка на переднем плане
    const off = (cam.x * 1.15) % 90;
    ctx.fillStyle = '#241f36';
    for (let i = 0; i < 6; i++) {
      const x = Math.round(((i * 17 - off) % 90 + 90) % 90) + i * 50 - 30;
      if (x > -10 && x < CONFIG.WIDTH) ctx.fillRect(x, CONFIG.GROUND_Y + 2 + (i % 3) * 3, 4 + (i % 4) * 2, 3);
    }
  }

  getPattern(d) {
    const rng = this.rng;
    const P = (weight, value) => ({ weight, value });
    const table = [
      P(2.5, { length: 110, spawns: [], items: Biome.idolArc(40, 5, 30) }),
      P(3, { length: 145, spawns: [{ type: 'spikes', at: 60 }], items: Biome.idolArc(50, 5, 48) }),
      P(3, (dd) => ({
        length: 160,
        spawns: [{ type: 'pit', at: 50, w: dd > 0.4 ? 44 : 38 }],
        items: Biome.idolArc(44, 4, 48),
      })),
      P(d > 0.25 ? 2.5 : 0, { length: 200, spawns: [{ type: 'statue', at: 110 }], items: [] }),
      P(d > 0.2 ? 2.5 : 0, { length: 190, spawns: [{ type: 'warrior', at: 120 }], items: [] }),
      P(d > 0.3 ? 2 : 0, {
        length: 210, spawns: [{ type: 'statue', at: 70 }, { type: 'spikes', at: 150 }], items: [],
      }),
      P(d > 0.35 ? 2 : 0, (dd) => ({
        length: 175,
        spawns: dd > 0.6
          ? [{ type: 'bat', at: 100, alt: 18 }, { type: 'bat', at: 134, alt: 18 }]
          : [{ type: 'bat', at: 100, alt: 18 }],
        items: [],
      })),
      P(d > 0.4 ? 2 : 0, { length: 205, spawns: [{ type: 'jaguar', at: 155 }], items: [] }),
      P(d > 0.45 ? 1.5 : 0, {
        length: 200, spawns: [{ type: 'pit', at: 46, w: 38 }, { type: 'statue', at: 140 }], items: [],
      }),
      P(d > 0.5 ? 1.5 : 0, {
        length: 210, spawns: [{ type: 'warrior', at: 80 }, { type: 'warrior', at: 170 }], items: [],
      }),
      P(0.5, { length: 130, spawns: [], items: [{ type: 'heart', at: 60, alt: 32 }] }),
    ];
    const picked = Biome.weightedPick(rng, table);
    return typeof picked === 'function' ? picked(d) : picked;
  }
}
