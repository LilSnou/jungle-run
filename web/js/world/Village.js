/**
 * Village — деревня аборигенов: закатное небо, пальмы, хижины с дымом,
 * резные тотемы, заборы, костры с анимированным пламенем.
 * Здесь активнее воины с копьями и верёвки-ловушки.
 */
class Village extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({ x: i * 68 + rng() * 26, y: 12 + rng() * 22, w: 34 + rng() * 26, h: 5 + rng() * 3 });
    }

    this.farHills = [];
    for (let i = 0; i < 6; i++) {
      this.farHills.push({ x: i * 58 + rng() * 18, w: 48 + rng() * 28, h: 24 + rng() * 20 });
    }

    this.palms = [];
    for (let i = 0; i < 6; i++) {
      this.palms.push({ x: i * 54 + rng() * 20, h: 28 + rng() * 14, flip: rng() > 0.5 });
    }

    this.huts = [];
    for (let i = 0; i < 6; i++) {
      this.huts.push({ x: i * 60 + rng() * 22, w: 24 + rng() * 12, h: 15 + rng() * 7, smoke: rng() > 0.35 });
    }

    this.totems = [];
    for (let i = 0; i < 5; i++) {
      this.totems.push({ x: i * 76 + rng() * 26, h: 24 + rng() * 14 });
    }

    this.fences = [];
    for (let i = 0; i < 6; i++) {
      this.fences.push({ x: i * 50 + rng() * 18, posts: 3 + Math.floor(rng() * 3) });
    }

    this.fires = [];
    for (let i = 0; i < 4; i++) {
      this.fires.push({ x: i * 92 + rng() * 30 });
    }

    this.grass = [];
    for (let i = 0; i < 12; i++) {
      this.grass.push({ x: i * 26 + rng() * 10, h: 5 + rng() * 6 });
    }

    // сушильные стойки: ткань и рыба (мизасцена жизни деревни)
    this.racks = [];
    for (let i = 0; i < 3; i++) {
      this.racks.push({ x: i * 121 + rng() * 40, cloth: rng() > 0.5 });
    }

    // жители у хижин (каждая вторая хижина — со своим владельцем)
    this.huts.forEach((h, i) => {
      h.villager = i % 2 === 0;
    });
  }

  get name() { return 'ДЕРЕВНЯ'; }
  get track() { return 'village'; }
  get skyTop() { return '#6d3a86'; }
  get skyBottom() { return '#f7a04b'; }
  get groundTop() { return '#b98a4b'; }
  get groundDirt() { return '#8a5a2e'; }
  get groundShade() { return '#6e4522'; }
  get groundLine() { return '#5c381b'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, GY = CONFIG.GROUND_Y;
    const t = this.time;

    // --- закатный градиент в три слоя ---
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(0.55, '#c95e63');
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GY);

    // --- большое низкое солнце с градиентными кольцами ---
    const sunX = 200 - ((cam.x * 0.035) % 700);
    const sunY = GY - 42;
    ctx.fillStyle = 'rgba(255,210,122,0.22)';
    ctx.fillRect(sunX - 26, sunY - 26, 52, 52);
    ctx.fillStyle = 'rgba(255,210,122,0.4)';
    ctx.fillRect(sunX - 20, sunY - 20, 40, 40);
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(sunX - 15, sunY - 15, 30, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(sunX - 9, sunY - 9, 18, 18);

    // --- вытянутые облачка в свете заката ---
    Biome.parallax(ctx, cam, 0.07, 340, this.clouds, (ctx2, x, c) => {
      ctx2.fillStyle = '#e8a06a';
      ctx2.fillRect(x, c.y, c.w, c.h);
      ctx2.fillStyle = '#f7c38a';
      ctx2.fillRect(x + 4, c.y - 2, c.w - 12, 2);
      ctx2.fillStyle = '#b96a52';
      ctx2.fillRect(x + 2, c.y + c.h, c.w - 8, 1);
    });

    // --- дальние силуэты холмов ---
    Biome.parallax(ctx, cam, 0.12, 348, this.farHills, (ctx2, x, m) => {
      const base = GY + 3; // холмы сидят на земле
      for (let k = 0; k < m.h; k++) {
        const w = Math.round(m.w * (1 - 0.92 * (k / m.h)));
        ctx2.fillStyle = k > m.h * 0.5 ? '#5c3050' : '#6d3a5e';
        ctx2.fillRect(x + Math.round((m.w - w) / 2), base - k, w, 1);
      }
    });

    // --- пальмы ---
    Biome.parallax(ctx, cam, 0.28, 324, this.palms, (ctx2, x, p) => {
      const base = GY + 2; // пальмы стоят на земле
      const dir = p.flip ? -1 : 1;
      ctx2.fillStyle = '#5c4526';
      for (let k = 0; k < p.h; k++) {
        ctx2.fillRect(x + Math.round(Math.sin(k / 12) * 4 * dir), base - k, 2, 1);
      }
      const topX = x + Math.round(Math.sin(p.h / 12) * 4 * dir);
      ctx2.fillStyle = '#3f7a3a';
      ctx2.fillRect(topX - 9 * dir, base - p.h - 2, 8 * dir * (dir > 0 ? 1 : -1) || 8, 2);
      ctx2.fillRect(topX - 1, base - p.h - 2, 9, 2);
      ctx2.fillRect(topX - 6, base - p.h - 4, 12, 2);
      ctx2.fillStyle = '#4e9a3f';
      ctx2.fillRect(topX - 4, base - p.h - 5, 8, 2);
      // кокосы
      ctx2.fillStyle = '#6b4a25';
      ctx2.fillRect(topX - 2, base - p.h, 2, 2);
    });

    // --- хижины с соломенными крышами и дымом ---
    Biome.parallax(ctx, cam, 0.4, 360, this.huts, (ctx2, x, hut) => {
      const base = GY + 2; // хижины стоят на земле
      // стены из бамбука
      ctx2.fillStyle = '#7a5230';
      ctx2.fillRect(x, base - hut.h, hut.w, hut.h);
      ctx2.fillStyle = '#c9a86a';
      for (let i = 1; i < hut.w; i += 5) ctx2.fillRect(x + i, base - hut.h, 2, hut.h);
      ctx2.fillStyle = '#5c381b';
      ctx2.fillRect(x, base - hut.h, hut.w, 2);
      // крыша из соломы (ярусы)
      ctx2.fillStyle = '#d9b26a';
      ctx2.fillRect(x - 4, base - hut.h - 8, hut.w + 8, 8);
      ctx2.fillStyle = '#c99a4b';
      ctx2.fillRect(x - 1, base - hut.h - 12, hut.w + 2, 5);
      ctx2.fillStyle = '#e8c882';
      ctx2.fillRect(x + 2, base - hut.h - 13, hut.w - 4, 2);
      // дверь и огонёк внутри
      ctx2.fillStyle = '#3d2a17';
      ctx2.fillRect(x + hut.w / 2 - 3, base - 9, 6, 9);
      ctx2.fillStyle = '#e8a53a';
      ctx2.fillRect(x + hut.w / 2 - 2, base - 6, 4, 3);
      // дым
      if (hut.smoke) {
        for (let i = 0; i < 4; i++) {
          const rise = (t * 12 + i * 10) % 40;
          ctx2.globalAlpha = Math.max(0, 0.45 - rise / 90);
          ctx2.fillStyle = '#d8d3c8';
          const drift = Math.sin(t * 1.6 + i * 1.7) * 3;
          ctx2.fillRect(Math.round(x + hut.w / 2 + drift), Math.round(base - hut.h - 14 - rise), 3, 3);
        }
        ctx2.globalAlpha = 1;
      }

      // житель у хижины: копьё в руке, слегка покачивается
      if (hut.villager) {
        const vx = Math.round(x + hut.w + 5);
        const bob = Math.floor(t * 2 + hut.x) % 2;
        ctx2.fillStyle = '#3d2a17';          // копьё
        ctx2.fillRect(vx + 4, base - 10 - bob, 1, 10);
        ctx2.fillStyle = '#9aa3ad';          // наконечник
        ctx2.fillRect(vx + 4, base - 12 - bob, 1, 2);
        ctx2.fillStyle = '#8d5a3b';          // тело
        ctx2.fillRect(vx + 1, base - 6 - bob, 3, 4);
        ctx2.fillStyle = '#d9b26a';          // юбка из травы
        ctx2.fillRect(vx, base - 4 - bob, 4, 2);
        ctx2.fillStyle = '#a8703f';          // голова
        ctx2.fillRect(vx + 1, base - 9 - bob, 2, 3);
        ctx2.fillStyle = '#b03027';          // перо
        ctx2.fillRect(vx + 2, base - 11 - bob, 1, 2);
      }
    });

    // --- тотемные столбы с «лицами» ---
    Biome.parallax(ctx, cam, 0.52, 380, this.totems, (ctx2, x, tot) => {
      const base = GY + 2; // тотемы стоят на земле
      ctx2.fillStyle = '#8a4b23';
      ctx2.fillRect(x, base - tot.h, 9, tot.h);
      ctx2.fillStyle = '#6b3717';
      ctx2.fillRect(x + 7, base - tot.h, 2, tot.h);
      // три «лица»
      const faces = 3;
      for (let f = 0; f < faces; f++) {
        const fy = base - tot.h + 3 + f * Math.floor((tot.h - 4) / faces);
        ctx2.fillStyle = '#e0c53a';
        ctx2.fillRect(x + 1, fy, 2, 2);
        ctx2.fillRect(x + 5, fy, 2, 2);
        ctx2.fillStyle = f % 2 ? '#b03027' : '#3fae4a';
        ctx2.fillRect(x + 2, fy + 3, 4, 2);
      }
      // «волосы» из перьев
      ctx2.fillStyle = '#b03027';
      ctx2.fillRect(x - 1, base - tot.h - 4, 3, 4);
      ctx2.fillStyle = '#e0c53a';
      ctx2.fillRect(x + 3, base - tot.h - 5, 3, 5);
      ctx2.fillStyle = '#3fae4a';
      ctx2.fillRect(x + 7, base - tot.h - 4, 3, 4);
    });

    // --- заборы из кольев ---
    Biome.parallax(ctx, cam, 0.66, 300, this.fences, (ctx2, x, f) => {
      const base = GY + 2; // колья воткнуты в землю
      for (let i = 0; i < f.posts; i++) {
        const px = x + i * 8;
        ctx2.fillStyle = '#6b4a25';
        ctx2.fillRect(px, base - 9, 2, 9);
        ctx2.fillStyle = '#845c30';
        ctx2.fillRect(px, base - 9, 1, 9);
        ctx2.fillStyle = '#54381b';
        ctx2.fillRect(px, base - 10, 2, 1);
      }
      ctx2.fillStyle = '#54381b';
      ctx2.fillRect(x, base - 7, (f.posts - 1) * 8 + 2, 1);
      ctx2.fillRect(x, base - 3, (f.posts - 1) * 8 + 2, 1);
    });

    // --- костры с пламенем и световым пятном ---
    Biome.parallax(ctx, cam, 0.8, 460, this.fires, (ctx2, x, f) => {
      const base = GY + 2; // костры на самой земле
      // дрова
      ctx2.fillStyle = '#5c381b';
      ctx2.fillRect(x - 2, base - 3, 9, 2);
      ctx2.fillStyle = '#6b4a25';
      ctx2.fillRect(x, base - 4, 6, 2);
      // пламя (3 языка, анимация)
      const fl = Math.floor(t * 9 + x) % 3;
      ctx2.fillStyle = '#e07a2e';
      ctx2.fillRect(x, base - 8 - fl, 6, 5 + fl);
      ctx2.fillStyle = '#ffd27a';
      ctx2.fillRect(x + 1, base - 7 - fl, 4, 4 + fl);
      ctx2.fillStyle = '#fff3c8';
      ctx2.fillRect(x + 2, base - 5, 2, 2);
      // свет на земле
      ctx2.fillStyle = 'rgba(255,180,90,0.18)';
      ctx2.fillRect(x - 8, base, 22, 3);
    });

    // сушильные стойки: развивающаяся ткань и рыба (мизасцена деревни)
    Biome.parallax(ctx, cam, 0.4, 360, this.racks, (ctx2, x, r) => {
      const base = GY + 2;
      ctx2.fillStyle = '#6b4a25';
      ctx2.fillRect(x, base - 14, 1, 14);
      ctx2.fillRect(x + 16, base - 14, 1, 14);
      ctx2.fillRect(x, base - 14, 17, 1);
      if (r.cloth) {
        const sway = Math.round(Math.sin(t * 2 + r.x) * 2);
        ctx2.fillStyle = '#d94f6b';
        ctx2.fillRect(x + 3 + sway, base - 13, 6, 8);
        ctx2.fillStyle = '#e07a8a';
        ctx2.fillRect(x + 3 + sway, base - 13, 6, 2);
      } else {
        for (let i = 0; i < 3; i++) {
          const fy = Math.round(base - 12 + Math.sin(t * 1.5 + i + r.x));
          ctx2.fillStyle = '#9aa3ad';
          ctx2.fillRect(x + 3 + i * 4, fy, 2, 6);
          ctx2.fillStyle = '#5c5e6b';
          ctx2.fillRect(x + 3 + i * 4, fy + 4, 2, 1);
        }
      }
    });
  }

  drawForeground(ctx, cam) {
    const t = this.time;

    // колышущаяся трава переднего плана
    const off = (cam.x * 1.2) % 312;
    for (const gr of this.grass) {
      let x = gr.x - off;
      if (x < 0) x += 312;
      for (let rep = -1; rep <= 1; rep++) {
        const sx = Math.round(x + rep * 312);
        if (sx < -10 || sx > CONFIG.WIDTH + 10) continue;
        const sway = Math.round(Math.sin(t * 2.2 + gr.x) * 2);
        ctx.fillStyle = '#8a6a2e';
        ctx.fillRect(sx + sway, CONFIG.GROUND_Y - gr.h, 1, gr.h);
        ctx.fillRect(sx + 3 + sway, CONFIG.GROUND_Y - gr.h + 2, 1, gr.h - 2);
        ctx.fillStyle = '#a8843a';
        ctx.fillRect(sx + 6 - sway, CONFIG.GROUND_Y - gr.h + 1, 1, gr.h - 1);
      }
    }

    // светлячки сумерек
    for (let i = 0; i < 5; i++) {
      const x = ((i * 77 + t * 9 * (i % 2 ? -1 : 1)) % (CONFIG.WIDTH + 40)) - 20;
      const y = 70 + Math.sin(t * 1.8 + i * 2.4) * 22 + i * 11;
      if (Math.floor(t * 5 + i) % 3 !== 0) {
        ctx.fillStyle = '#ffe98a';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    }
  }

  getPattern(d) {
    const rng = this.rng;
    const P = (weight, value) => ({ weight, value });
    // Деревня: верёвки-ловушки, ямы, воины с копьями и ягуары (у каждого локация свой набор)
    const table = [
      P(3, { length: 110, spawns: [], items: Biome.idolArc(40, 4, 30) }),
      P(3, { length: 145, spawns: [{ type: 'rope', at: 60 }], items: Biome.idolArc(50, 5, 48) }),
      P(3, {
        length: 150,
        spawns: [{ type: 'rope', at: 70 }],
        items: [{ type: 'idol', at: 60, alt: 0 }, { type: 'idol', at: 72, alt: 0 }, { type: 'idol', at: 84, alt: 0 }],
      }),
      P(3, (dd) => ({
        length: 155,
        spawns: [{ type: 'pit', at: 50, w: dd > 0.5 ? 42 : 34 }],
        items: Biome.idolArc(44, 4, 46),
      })),
      P(d > 0.2 ? 2.5 : 0, { length: 190, spawns: [{ type: 'warrior', at: 120 }], items: [] }),
      P(d > 0.3 ? 2 : 0, {
        length: 195, spawns: [{ type: 'warrior', at: 90 }, { type: 'rope', at: 155 }], items: [],
      }),
      P(d > 0.2 ? 2 : 0, {
        length: 205,
        spawns: [{ type: 'rope', at: 55 }, { type: 'rope', at: 84 }],   // длинное скольжение
        items: [{ type: 'idol', at: 52, alt: 0 }, { type: 'idol', at: 70, alt: 0 }, { type: 'idol', at: 88, alt: 0 }],
      }),
      P(d > 0.35 ? 2 : 0, (dd) => ({
        length: 200,
        spawns: dd > 0.65
          ? [{ type: 'bat', at: 100, alt: 19 }, { type: 'bat', at: 134, alt: 19 }]
          : [{ type: 'bat', at: 100, alt: 19 }],
        items: [],
      })),
      P(d > 0.45 ? 2 : 0, { length: 200, spawns: [{ type: 'jaguar', at: 150 }], items: [] }),
      P(d > 0.4 ? 1.5 : 0, {
        length: 195, spawns: [{ type: 'pit', at: 46, w: 34 }, { type: 'warrior', at: 140 }], items: [],
      }),
    ];
    const picked = Biome.weightedPick(rng, table);
    return typeof picked === 'function' ? picked(d) : picked;
  }
}
