/**
 * Temple — заброшенный храм майя: ночное небо со звёздами, дальние и
 * ближние пирамиды со ступенями, стена с резными масками, обломки колонн,
 * светящиеся факелы, висящие лианы, пылинки. Самая злая локация:
 * статуи, длинные ямы, каменные балки под проскальзывание, воины.
 */
class Temple extends Biome {
  constructor(seed) {
    super(seed);
    const rng = this.rng;

    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({ x: rng() * CONFIG.WIDTH, y: rng() * (CONFIG.GROUND_Y - 50), tw: rng() * 6 });
    }

    this.farPyramids = [];
    for (let i = 0; i < 6; i++) {
      this.farPyramids.push({ x: i * 64 + rng() * 24, w: 40 + rng() * 26, h: 26 + rng() * 22 });
    }

    this.pyramids = [];
    for (let i = 0; i < 5; i++) {
      this.pyramids.push({
        x: i * 78 + rng() * 26,
        w: 46 + rng() * 26,
        h: 34 + rng() * 26,
        door: rng() > 0.4,
      });
    }

    this.masks = [];
    for (let i = 0; i < 5; i++) {
      this.masks.push({ x: i * 68 + rng() * 24, hue: rng() > 0.5 ? '#c9a83e' : '#7fae5a', glow: rng() > 0.5 });
    }

    this.columns = [];
    for (let i = 0; i < 6; i++) {
      this.columns.push({ x: i * 58 + rng() * 20, h: 26 + rng() * 22, broken: rng() > 0.35 });
    }

    this.torches = [];
    for (let i = 0; i < 6; i++) this.torches.push({ x: i * 56 + rng() * 20 });

    this.vines = [];
    for (let i = 0; i < 9; i++) this.vines.push({ x: i * 44 + rng() * 16, len: 16 + rng() * 26 });

    this.rubles = [];
    for (let i = 0; i < 10; i++) this.rubles.push({ x: i * 36 + rng() * 14, w: 5 + rng() * 11 });

    // руны на стене (слабо мерцают)
    this.runes = [];
    for (let i = 0; i < 6; i++) {
      this.runes.push({ x: i * 57 + rng() * 30, kind: Math.floor(rng() * 3) });
    }

    // черепа и камни у самой земли
    this.skulls = [];
    for (let i = 0; i < 4; i++) {
      this.skulls.push({ x: i * 93 + rng() * 34, flip: rng() > 0.5 });
    }
  }

  get name() { return 'ХРАМ'; }
  get track() { return 'temple'; }
  get skyTop() { return '#151129'; }
  get skyBottom() { return '#4a3160'; }
  get groundTop() { return '#6a6f78'; }
  get groundDirt() { return '#4a4e56'; }
  get groundShade() { return '#3a3d44'; }
  get groundLine() { return '#8a9099'; }

  drawBackground(ctx, cam) {
    const W = CONFIG.WIDTH, GY = CONFIG.GROUND_Y;
    const t = this.time;

    // --- ночное небо ---
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(0.7, '#33254c');
    g.addColorStop(1, this.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GY);

    // --- мерцающие звезды ---
    const starOff = (cam.x * 0.03) % W;
    for (const s of this.stars) {
      const sx = ((s.x - starOff) % W + W) % W;
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + s.tw));
      ctx.fillStyle = 'rgba(235,235,215,' + alpha.toFixed(2) + ')';
      ctx.fillRect(Math.round(sx), Math.round(s.y), 1, 1);
      if (alpha > 0.9) {
        ctx.fillRect(Math.round(sx) - 1, Math.round(s.y), 3, 1);
        ctx.fillRect(Math.round(sx), Math.round(s.y) - 1, 1, 3);
      }
    }

    // --- луна с ореолом и кратерами ---
    const moonX = 70 - ((cam.x * 0.03) % 800);
    ctx.fillStyle = 'rgba(232,224,200,0.14)';
    ctx.fillRect(moonX - 16, 12, 32, 32);
    ctx.fillStyle = 'rgba(232,224,200,0.3)';
    ctx.fillRect(moonX - 13, 15, 26, 26);
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(moonX - 10, 18, 20, 20);
    ctx.fillStyle = '#d5cdaf';
    ctx.fillRect(moonX + 4, 20, 6, 6);
    ctx.fillStyle = '#c8c0a8';
    ctx.fillRect(moonX - 6, 24, 4, 4);
    ctx.fillRect(moonX + 1, 30, 3, 3);
    ctx.fillRect(moonX - 8, 32, 2, 2);

    // --- дальние силуэты пирамид со ступенями ---
    Biome.parallax(ctx, cam, 0.14, 390, this.farPyramids, (ctx2, x, p) => {
      const base = GY + 3; // пирамиды стоят на земле
      for (let k = 0; k < p.h; k++) {
        const w = Math.round(p.w * (1 - 0.75 * (k / p.h)));
        ctx2.fillStyle = k > p.h * 0.55 ? '#211c38' : '#282243';
        ctx2.fillRect(x + Math.round((p.w - w) / 2), base - k, w, 1);
      }
      // лестница по центру
      ctx2.fillStyle = '#1a1630';
      for (let k = 0; k < p.h; k += 4) {
        const w = Math.round(p.w * (1 - 0.75 * (k / p.h)));
        ctx2.fillRect(x + Math.round(p.w / 2) - 2, base - k, 4, 1);
      }
    });

    // --- ближние проработанные пирамиды ---
    Biome.parallax(ctx, cam, 0.3, 430, this.pyramids, (ctx2, x, p) => {
      const base = GY + 2; // пирамиды стоят на земле
      // ступени
      for (let k = 0; k < p.h; k++) {
        const w = Math.round(p.w * (1 - 0.7 * (k / p.h)));
        ctx2.fillStyle = k % 4 === 0 ? '#3f3860' : (k > p.h * 0.5 ? '#383156' : '#443c68');
        ctx2.fillRect(x + Math.round((p.w - w) / 2), base - k, w, 1);
      }
      // центральная лестница (светлые ступени)
      for (let k = 0; k < p.h; k += 3) {
        const w = Math.round(p.w * (1 - 0.7 * (k / p.h)));
        ctx2.fillStyle = '#54497a';
        ctx2.fillRect(x + Math.round(p.w / 2) - 3, base - k, 6, 1);
      }
      // храм на вершине
      ctx2.fillStyle = '#4a4170';
      ctx2.fillRect(x + p.w / 2 - 7, base - p.h - 9, 14, 10);
      ctx2.fillStyle = '#332c50';
      ctx2.fillRect(x + p.w / 2 - 9, base - p.h - 11, 18, 3);
      ctx2.fillStyle = '#2a2444';
      ctx2.fillRect(x + p.w / 2 - 5, base - p.h - 9, 10, 2);
      // светящийся дверной проём
      if (p.door) {
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + x * 0.1);
        ctx2.fillStyle = 'rgba(224,165,58,' + (0.3 + pulse * 0.3).toFixed(2) + ')';
        ctx2.fillRect(x + p.w / 2 - 5, base - p.h - 6, 10, 7);
        ctx2.fillStyle = '#e0a53a';
        ctx2.fillRect(x + p.w / 2 - 3, base - p.h - 4, 6, 5);
        ctx2.fillStyle = '#ffe9a8';
        ctx2.fillRect(x + p.w / 2 - 2, base - p.h - 3, 4, 3);
      }
      // головы змей по углам основания
      ctx2.fillStyle = '#54497a';
      ctx2.fillRect(x - 4, base - 5, 6, 5);
      ctx2.fillRect(x + p.w - 2, base - 5, 6, 5);
      ctx2.fillStyle = '#c9a83e';
      ctx2.fillRect(x - 3, base - 4, 2, 2);
      ctx2.fillRect(x + p.w, base - 4, 2, 2);
    });

    // --- каменная стена с резными масками ---
    const wallY = GY - 24;
    ctx.fillStyle = '#272238';
    ctx.fillRect(0, wallY, W, 4);
    ctx.fillStyle = '#2f2946';
    ctx.fillRect(0, wallY + 4, W, GY - wallY - 4);
    // каменные блоки
    const wallOff = (cam.x * 0.55) % 28;
    ctx.fillStyle = '#373054';
    for (let x = -wallOff; x < W; x += 28) {
      ctx.fillRect(Math.round(x), wallY + 5, 12, 2);
      ctx.fillRect(Math.round(x) + 6, wallY + 9, 12, 2);
      ctx.fillRect(Math.round(x), wallY + 13, 12, 2);
    }
    ctx.fillStyle = '#221d34';
    ctx.fillRect(0, wallY + 7, W, 1);
    ctx.fillRect(0, wallY + 11, W, 1);
    // барельефы-маски, у которых светятся глаза
    Biome.parallax(ctx, cam, 0.55, 340, this.masks, (ctx2, x, m) => {
      const my = wallY + 4;
      ctx2.fillStyle = '#4a4170';
      ctx2.fillRect(x, my, 14, 14);
      ctx2.fillStyle = '#3a3358';
      ctx2.fillRect(x + 2, my + 2, 10, 10);
      // глаза-уголки и рот-зубы
      ctx2.fillStyle = m.hue;
      ctx2.fillRect(x + 3, my + 4, 3, 3);
      ctx2.fillRect(x + 8, my + 4, 3, 3);
      ctx2.fillStyle = '#2a2444';
      ctx2.fillRect(x + 4, my + 5, 1, 1);
      ctx2.fillRect(x + 9, my + 5, 1, 1);
      ctx2.fillStyle = m.hue;
      ctx2.fillRect(x + 4, my + 9, 6, 1);
      ctx2.fillStyle = '#e8edf5';
      ctx2.fillRect(x + 5, my + 9, 1, 2);
      ctx2.fillRect(x + 8, my + 9, 1, 2);
      // свечение глаз
      if (m.glow) {
        const pulse = Math.sin(t * 3 + x * 0.2) > 0.2;
        if (pulse) {
          ctx2.fillStyle = 'rgba(255,210,122,0.5)';
          ctx2.fillRect(x + 2, my + 3, 5, 5);
          ctx2.fillRect(x + 7, my + 3, 5, 5);
        }
      }
    });

    // --- руны на камне стены (слабо мерцают) ---
    Biome.parallax(ctx, cam, 0.55, 340, this.runes, (ctx2, x, r) => {
      const my = wallY + 6;
      const glow = 0.22 + 0.18 * Math.sin(t * 1.6 + r.x * 0.3);
      ctx2.fillStyle = 'rgba(224,165,58,' + glow.toFixed(2) + ')';
      if (r.kind === 0) {
        ctx2.fillRect(x, my, 1, 8);
        ctx2.fillRect(x - 2, my, 5, 1);
        ctx2.fillRect(x - 2, my + 7, 5, 1);
      } else if (r.kind === 1) {
        ctx2.fillRect(x, my, 4, 1);
        ctx2.fillRect(x + 1, my + 2, 2, 1);
        ctx2.fillRect(x, my + 4, 4, 1);
        ctx2.fillRect(x + 1, my + 6, 2, 1);
      } else {
        ctx2.fillRect(x, my, 1, 8);
        ctx2.fillRect(x + 3, my, 1, 8);
        ctx2.fillRect(x, my + 3, 4, 1);
      }
    });

    // --- обломки колонн ---
    Biome.parallax(ctx, cam, 0.68, 370, this.columns, (ctx2, x, c) => {
      const base = GY + 2; // колонны стоят на земле
      ctx2.fillStyle = '#4a4e56';
      ctx2.fillRect(x, base - c.h, 8, c.h);
      ctx2.fillStyle = '#5a5f69';
      ctx2.fillRect(x, base - c.h, 3, c.h);
      // каннелюры
      ctx2.fillStyle = '#3a3d44';
      for (let i = 0; i < 4; i++) ctx2.fillRect(x + 5, base - c.h + 4 + i * 7, 1, 4);
      // обломанный верх / капитель
      if (c.broken) {
        ctx2.fillStyle = '#3a3d44';
        ctx2.fillRect(x + 2, base - c.h - 3, 4, 3);
        ctx2.fillStyle = '#5a5f69';
        ctx2.fillRect(x + 4, base - c.h - 4, 3, 2);
      } else {
        ctx2.fillStyle = '#5a5f69';
        ctx2.fillRect(x - 2, base - c.h - 4, 12, 4);
        ctx2.fillStyle = '#6a6f78';
        ctx2.fillRect(x - 2, base - c.h - 4, 12, 1);
      }
      // мх снизу
      ctx2.fillStyle = '#3e7a3a';
      ctx2.fillRect(x, base - 2, 3, 2);
    });

    // --- факелы с анимированным пламенем и световым пятном ---
    Biome.parallax(ctx, cam, 0.8, 460, this.torches, (ctx2, x, f) => {
      const base = GY - 22;
      // свет на стене
      const pulse = 0.16 + 0.06 * Math.sin(t * 8 + f.x);
      ctx2.fillStyle = 'rgba(255,170,80,' + pulse.toFixed(2) + ')';
      ctx2.fillRect(x - 7, base - 14, 20, 20);
      // держатель
      ctx2.fillStyle = '#5c4a30';
      ctx2.fillRect(x + 1, base, 3, 12);
      ctx2.fillStyle = '#6a563a';
      ctx2.fillRect(x, base, 5, 2);
      ctx2.fillStyle = '#3d3122';
      ctx2.fillRect(x + 1, base + 10, 3, 2);
      // пламя из трёх языков
      const fl = Math.floor(t * 10 + f.x) % 3;
      ctx2.fillStyle = '#c94f1e';
      ctx2.fillRect(x, base - 7 - fl, 5, 8 + fl);
      ctx2.fillStyle = '#e07a2e';
      ctx2.fillRect(x + 1, base - 5 - fl, 3, 6);
      ctx2.fillStyle = '#ffd27a';
      ctx2.fillRect(x + 1, base - 4, 3, 3);
      ctx2.fillStyle = '#fff3c8';
      ctx2.fillRect(x + 2, base - 3, 1, 2);
    });

    // --- висящие лианы (с покачиванием) ---
    Biome.parallax(ctx, cam, 0.9, 340, this.vines, (ctx2, x, v) => {
      const sway = Math.round(Math.sin(t * 1.3 + x * 0.2) * 3);
      ctx2.fillStyle = '#26502e';
      ctx2.fillRect(x + sway, 0, 2, v.len);
      ctx2.fillStyle = '#357040';
      ctx2.fillRect(x + 6 - sway, 0, 2, v.len - 6);
      ctx2.fillStyle = '#2b6b31';
      ctx2.fillRect(x - 2 + sway, v.len - 4, 5, 4);
      ctx2.fillRect(x + 5 - sway, v.len - 9, 4, 3);
      // узлы на лианах
      ctx2.fillStyle = '#1f4f26';
      ctx2.fillRect(x + sway, Math.round(v.len * 0.5), 2, 2);
    });

    // --- черепа и камни у земли ---
    Biome.parallax(ctx, cam, 0.9, 330, this.skulls, (ctx2, x, s) => {
      const base = GY + 2;
      ctx2.fillStyle = '#c8c0a8';
      ctx2.fillRect(x, base - 6, 6, 5);
      ctx2.fillStyle = '#a8a08a';
      ctx2.fillRect(x, base - 2, 6, 1);
      ctx2.fillStyle = '#2a2444';
      ctx2.fillRect(x + 1, base - 5, 1, 2);
      ctx2.fillRect(x + 4, base - 5, 1, 2);
      ctx2.fillStyle = '#4a4e56';
      ctx2.fillRect(x + (s.flip ? -5 : 7), base - 2, 3, 2);
    });
  }

  drawForeground(ctx, cam) {
    const t = this.time;

    // пылинки, мерно плывущие в свете
    ctx.fillStyle = 'rgba(226,216,180,0.5)';
    for (let i = 0; i < 10; i++) {
      const x = ((i * 53 + t * 6 * (i % 2 ? 1 : -1)) % (CONFIG.WIDTH + 30)) - 15;
      const y = 24 + Math.sin(t * 1.1 + i * 1.9) * 18 + i * 12;
      ctx.fillRect(Math.round(x), Math.round(y) % CONFIG.GROUND_Y, 1, 1);
    }

    // угольки, поднимающиеся от факелов
    for (let i = 0; i < 8; i++) {
      const rise = (t * 22 + i * 30) % (CONFIG.GROUND_Y + 10);
      const x = (((i * 67 + Math.sin(t * 2 + i) * 14 - t * 6) % (CONFIG.WIDTH + 40)) + CONFIG.WIDTH + 40) % (CONFIG.WIDTH + 40) - 20;
      const alpha = Math.max(0, 0.8 - rise / (CONFIG.GROUND_Y * 0.8));
      ctx.fillStyle = 'rgba(255,170,80,' + alpha.toFixed(2) + ')';
      ctx.fillRect(Math.round(x), Math.round(CONFIG.GROUND_Y - rise), 1, 1);
    }

    // падающие листья
    for (let i = 0; i < 3; i++) {
      const fall = (t * 14 + i * 55) % (CONFIG.GROUND_Y + 20);
      const x = 40 + i * 90 + Math.sin(t * 2 + i * 2.5) * 12;
      ctx.fillStyle = '#3e7a3a';
      ctx.fillRect(Math.round(x), Math.round(fall), 3, 2);
      ctx.fillStyle = '#2b5f2c';
      ctx.fillRect(Math.round(x) + 1, Math.round(fall) + 2, 2, 1);
    }

    // каменная крошка на земле переднего плана
    const off = (cam.x * 1.15) % 90;
    ctx.fillStyle = '#241f36';
    for (let i = 0; i < 6; i++) {
      const x = Math.round((((i * 17 - off) % 90) + 90) % 90) + i * 50 - 30;
      if (x > -10 && x < CONFIG.WIDTH) ctx.fillRect(x, CONFIG.GROUND_Y + 2 + (i % 3) * 3, 4 + (i % 4) * 2, 3);
    }

    // тёмные пилястры по краям кадра (виньетка храма)
    ctx.fillStyle = 'rgba(20,16,36,0.85)';
    ctx.fillRect(0, 0, 6, CONFIG.HEIGHT);
    ctx.fillRect(CONFIG.WIDTH - 6, 0, 6, CONFIG.HEIGHT);
    ctx.fillStyle = 'rgba(20,16,36,0.35)';
    ctx.fillRect(6, 0, 4, CONFIG.HEIGHT);
    ctx.fillRect(CONFIG.WIDTH - 10, 0, 4, CONFIG.HEIGHT);
  }

  getPattern(d) {
    const rng = this.rng;
    const P = (weight, value) => ({ weight, value });
    // Храм: шипы, статуи, балки, ямы, воины и мыши (свой набор — своя музыка, свои мобы)
    const table = [
      P(2.5, { length: 110, spawns: [], items: Biome.idolArc(40, 5, 30) }),
      P(3, { length: 145, spawns: [{ type: 'spikes', at: 60 }], items: Biome.idolArc(50, 5, 48) }),
      P(3, (dd) => ({
        length: 160,
        spawns: [{ type: 'pit', at: 50, w: dd > 0.4 ? 44 : 38 }],
        items: Biome.idolArc(44, 4, 48),
      })),
      P(3, {
        length: 150,
        spawns: [{ type: 'beam', at: 70 }],
        items: [{ type: 'idol', at: 60, alt: 0 }, { type: 'idol', at: 72, alt: 0 }, { type: 'idol', at: 84, alt: 0 }],
      }),
      P(d > 0.25 ? 2.5 : 0, { length: 200, spawns: [{ type: 'statue', at: 110 }], items: [] }),
      P(d > 0.2 ? 2.5 : 0, { length: 190, spawns: [{ type: 'warrior', at: 120 }], items: [] }),
      P(d > 0.3 ? 2 : 0, {
        length: 210, spawns: [{ type: 'statue', at: 70 }, { type: 'spikes', at: 150 }], items: [],
      }),
      P(d > 0.2 ? 2 : 0, {
        length: 215,
        spawns: [{ type: 'beam', at: 58 }, { type: 'beam', at: 87 }],   // длинное скольжение
        items: [{ type: 'idol', at: 54, alt: 0 }, { type: 'idol', at: 72, alt: 0 }, { type: 'idol', at: 91, alt: 0 }],
      }),
      P(d > 0.35 ? 2 : 0, (dd) => ({
        length: 175,
        spawns: dd > 0.6
          ? [{ type: 'bat', at: 100, alt: 19 }, { type: 'bat', at: 134, alt: 19 }]
          : [{ type: 'bat', at: 100, alt: 19 }],
        items: [],
      })),
      P(d > 0.4 ? 2 : 0, {
        length: 205, spawns: [{ type: 'spikes', at: 60 }, { type: 'warrior', at: 152 }], items: [],
      }),
      P(d > 0.45 ? 1.5 : 0, {
        length: 200, spawns: [{ type: 'pit', at: 46, w: 38 }, { type: 'statue', at: 140 }], items: [],
      }),
      P(d > 0.5 ? 1.5 : 0, {
        length: 210, spawns: [{ type: 'warrior', at: 80 }, { type: 'warrior', at: 170 }], items: [],
      }),
      P(d > 0.55 ? 1.5 : 0, {
        length: 210, spawns: [{ type: 'beam', at: 55 }, { type: 'spikes', at: 130 }], items: [],
      }),
      P(0.5, { length: 130, spawns: [], items: [{ type: 'heart', at: 60, alt: 32 }] }),
    ];
    const picked = Biome.weightedPick(rng, table);
    return typeof picked === 'function' ? picked(d) : picked;
  }
}
