/**
 * AudioManager — паттерн «Одиночка» (Singleton).
 *
 * Вся музыка и звуки синтезируются «на лету» через Web Audio API
 * (без единого аудиофайла) в стиле чиптюнов 8-битных консолей:
 *   - квадратная волна  → мелодия и бас (NES-подобный «пульс»)
 *   - шумовой канал     → ударные
 *
 * Инкапсуляция: AudioContext, громкость и планировщик нот скрыты
 * за приватными полями; наружу — только play()/musicOn()/unlock().
 */
class AudioManager {
  static #instance = null;

  /** @returns {AudioManager} единственный экземпляр. */
  static get instance() {
    if (!AudioManager.#instance) AudioManager.#instance = new AudioManager();
    return AudioManager.#instance;
  }

  #ctx = null;
  #master = null;
  #musicGain = null;
  #sfxGain = null;
  #noiseBuffer = null;
  #timer = null;
  #step = 0;
  #nextTime = 0;
  #song = null;
  #muted = false;

  constructor() {
    if (AudioManager.#instance) throw new Error('AudioManager — одиночка, используйте AudioManager.instance');
  }

  /** Разблокировка аудио (нужен жест пользователя). */
  unlock() {
    if (this.#ctx) { if (this.#ctx.state === 'suspended') this.#ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.#ctx = new AC();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = this.#muted ? 0 : 0.9;
    this.#master.connect(this.#ctx.destination);

    this.#musicGain = this.#ctx.createGain();
    this.#musicGain.gain.value = 0.42;
    this.#musicGain.connect(this.#master);

    this.#sfxGain = this.#ctx.createGain();
    this.#sfxGain.gain.value = 0.75;
    this.#sfxGain.connect(this.#master);

    // если трек уже выбран — запускаем секвенсор
    if (this.#song && !this.#timer) {
      this.#nextTime = this.#ctx.currentTime + 0.06;
      this.#timer = setInterval(() => this.#schedule(), 25);
    }

    // Буфер белого шума для ударных и «скольжения».
    const len = this.#ctx.sampleRate * 0.4;
    this.#noiseBuffer = this.#ctx.createBuffer(1, len, this.#ctx.sampleRate);
    const data = this.#noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  get muted() { return this.#muted; }

  /** Переключение звука (клавиша M / кнопка динамика). */
  toggleMute() {
    this.#muted = !this.#muted;
    if (this.#master) this.#master.gain.value = this.#muted ? 0 : 0.9;
    return this.#muted;
  }

  /** Частота ноты вида «C4», «F#3»; null/пусто — пауза. */
  static #freq(note) {
    if (!note || note === '.') return 0;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    if (!m) return 0;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    const acc = m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0);
    const midi = base + acc + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Осциллятор + огибающая. */
  #tone({ type = 'square', freq = 440, when = 0, dur = 0.1, vol = 0.5, glideTo = 0, dest = null }) {
    if (!this.#ctx) return;
    const t = this.#ctx.currentTime + when;
    const osc = this.#ctx.createOscillator();
    const g = this.#ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(dest || this.#sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  /** Шумовой всплеск (ударные, «скольжение», взрывы). */
  #noise({ when = 0, dur = 0.1, vol = 0.4, from = 8000, to = 600 }) {
    if (!this.#ctx || !this.#noiseBuffer) return;
    const t = this.#ctx.currentTime + when;
    const src = this.#ctx.createBufferSource();
    src.buffer = this.#noiseBuffer;
    const filt = this.#ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(from, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + dur);
    filt.Q.value = 1.2;
    const g = this.#ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.#sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  /** Воспроизведение эффекта по имени. */
  play(name) {
    if (!this.#ctx || this.#muted) return;
    switch (name) {
      case 'jump':
        this.#tone({ freq: 300, glideTo: 640, dur: 0.13, vol: 0.35 });
        break;
      case 'doubleJump':
        this.#tone({ freq: 480, glideTo: 980, dur: 0.12, vol: 0.3 });
        this.#tone({ type: 'triangle', freq: 960, when: 0.02, dur: 0.08, vol: 0.2 });
        break;
      case 'slide':
        this.#noise({ dur: 0.22, vol: 0.35, from: 5200, to: 700 });
        break;
      case 'coin':
        this.#tone({ freq: AudioManager.#freq('B5'), dur: 0.06, vol: 0.32 });
        this.#tone({ freq: AudioManager.#freq('E6'), when: 0.06, dur: 0.18, vol: 0.32 });
        break;
      case 'stomp':
        this.#tone({ freq: 340, glideTo: 90, dur: 0.14, vol: 0.4 });
        this.#noise({ dur: 0.1, vol: 0.3, from: 2500, to: 300 });
        break;
      case 'hurt':
        this.#tone({ type: 'sawtooth', freq: 420, glideTo: 70, dur: 0.28, vol: 0.4 });
        this.#noise({ dur: 0.2, vol: 0.3, from: 3000, to: 250 });
        break;
      case 'fall':
        this.#tone({ type: 'sawtooth', freq: 500, glideTo: 50, dur: 0.5, vol: 0.4 });
        break;
      case 'heart':
        this.#tone({ type: 'triangle', freq: AudioManager.#freq('C5'), dur: 0.07, vol: 0.4 });
        this.#tone({ type: 'triangle', freq: AudioManager.#freq('E5'), when: 0.07, dur: 0.07, vol: 0.4 });
        break;
      case 'gameOver': {
        const seq = ['G3', 'E3', 'C3', 'G2'];
        seq.forEach((n, i) => this.#tone({
          type: 'triangle', freq: AudioManager.#freq(n), when: i * 0.16, dur: 0.22, vol: 0.45,
        }));
        break;
      }
      case 'start':
        ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => this.#tone({
          freq: AudioManager.#freq(n), when: i * 0.08, dur: 0.1, vol: 0.35,
        }));
        break;
      case 'biome':
        ['E4', 'G4', 'B4', 'E5'].forEach((n, i) => this.#tone({
          type: 'triangle', freq: AudioManager.#freq(n), when: i * 0.09, dur: 0.14, vol: 0.4,
        }));
        break;
      case 'click':
        this.#tone({ freq: 720, glideTo: 520, dur: 0.07, vol: 0.25 });
        break;
      case 'victory': {
        // фанфара: восходящее арpeggio и длинная финальная нота
        const seq = [
          ['C4', 0, 0.12], ['E4', 0.12, 0.12], ['G4', 0.24, 0.12], ['C5', 0.36, 0.3],
          ['G4', 0.66, 0.1], ['C5', 0.76, 0.6],
        ];
        for (const [n, when, dur] of seq) {
          this.#tone({ freq: AudioManager.#freq(n), when, dur, vol: 0.4 });
          this.#tone({ type: 'triangle', freq: AudioManager.#freq(n) / 2, when, dur, vol: 0.28 });
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // Музыка: маленький степ-секвенсор (2 канала + ударные).
  // ------------------------------------------------------------------

  /**
   * Смена биома меняет «саундтрек»: свой темп и паттерны для
   * джунглей, деревни и храма.
   */
  playSong(name) {
    if (this.#song && this.#song.name === name) return;
    this.#song = AudioTracks[name] || null;
    this.#step = 0;
    if (this.#song && this.#ctx && !this.#timer) {
      this.#nextTime = this.#ctx.currentTime + 0.06;
      this.#timer = setInterval(() => this.#schedule(), 25);
    }
    if (!this.#song) { clearInterval(this.#timer); this.#timer = null; }
  }

  /** Полная остановка музыки (экран победы). */
  stopSong() {
    this.#song = null;
    clearInterval(this.#timer);
    this.#timer = null;
  }

  #schedule() {
    if (!this.#ctx || !this.#song || this.#muted) return;
    const stepDur = 60 / this.#song.bpm / 4; // 16-е ноты
    while (this.#nextTime < this.#ctx.currentTime + 0.14) {
      const i = this.#step % this.#song.bass.length;
      const lead = this.#song.lead[i];
      const bass = this.#song.bass[i];
      const drum = this.#song.drums[i];
      const arp = this.#song.arp ? this.#song.arp[i] : null;
      const when = this.#nextTime - this.#ctx.currentTime;

      if (bass && bass !== '.') {
        this.#tone({ type: 'triangle', freq: AudioManager.#freq(bass), when, dur: stepDur * 1.8, vol: 0.5, dest: this.#musicGain });
      }
      if (lead && lead !== '.') {
        this.#tone({ type: 'square', freq: AudioManager.#freq(lead), when, dur: stepDur * 0.9, vol: 0.16, dest: this.#musicGain });
      }
      if (arp && arp !== '.') {
        this.#tone({ type: 'square', freq: AudioManager.#freq(arp), when, dur: stepDur * 0.7, vol: 0.07, dest: this.#musicGain });
      }
      if (drum === 'k') this.#noise({ when, dur: 0.09, vol: 0.35, from: 400, to: 80 });
      if (drum === 'h') this.#noise({ when, dur: 0.03, vol: 0.12, from: 9000, to: 6000 });
      if (drum === 's') this.#noise({ when, dur: 0.14, vol: 0.25, from: 4000, to: 900 });
      if (drum === 't') this.#noise({ when, dur: 0.11, vol: 0.3, from: 900, to: 150 }); // «том» для деревни

      this.#nextTime += stepDur;
      this.#step++;
    }
  }
}

/**
 * Музыкальные треки биомов (16-шаговые петли, NES-стиль).
 * У каждой локации — свой темп, тональность и ритм:
 *   jungle  — 132 BPM, C-минор, «мчащийся» рифф;
 *   village — 112 BPM, F-мажор, племенные том-барабаны;
 *   temple  — 150 BPM, D-минор, тревожный арпеджио-канал (arp).
 * '.', — пауза. k — бочка, s — малый барабан, h — хэт, t — том.
 */
const AudioTracks = {
  jungle: {
    name: 'jungle', bpm: 132,
    bass:  ['C2', 'C2', '.', 'C2', 'Eb2', '.', 'C2', '.',
            'Bb1', 'Bb1', '.', 'Bb1', 'G2', '.', 'Ab2', '.'],
    lead:  ['G4', '.', 'Ab4', 'G4', '.', 'Eb4', '.', 'C4',
            'Eb4', '.', 'F4', 'G4', '.', 'Bb4', '.', 'G4'],
    arp:   ['.', '.', 'C4', '.', '.', '.', 'Eb4', '.',
            '.', '.', 'G4', '.', '.', '.', 'C5', '.'],
    drums: ['k', 'h', 'h', 'h', 's', 'h', 'k', 'h',
            'k', 'h', 'h', 'h', 's', 'h', 'h', 's'],
  },
  village: {
    name: 'village', bpm: 112,
    bass:  ['F2', '.', 'F2', '.', 'F2', '.', 'C2', '.',
            'Bb1', '.', 'Bb1', '.', 'C2', '.', 'C2', '.'],
    lead:  ['A4', '.', 'C5', '.', 'A4', 'G4', 'F4', '.',
            'G4', '.', 'A4', 'C5', '.', 'A4', '.', '.'],
    arp:   ['.', '.', '.', 'F4', '.', '.', '.', 'A4',
            '.', '.', '.', 'C5', '.', '.', '.', 'A4'],
    drums: ['k', '.', 't', 'k', 'h', '.', 'k', '.',
            'k', '.', 't', 'k', 's', 'h', 'k', '.'],
  },
  temple: {
    name: 'temple', bpm: 150,
    bass:  ['D2', '.', 'D2', 'D2', '.', 'A2', '.', 'D2',
            'C2', '.', 'C2', 'C2', '.', 'G2', '.', 'C2'],
    lead:  ['D5', '.', 'C5', '.', 'A4', '.', 'B4', '.',
            'C5', '.', 'D5', 'F5', '.', 'E5', '.', 'D5'],
    arp:   ['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A4', 'C5',
            'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'B4'],
    drums: ['k', 'h', 'h', 'k', 's', 'h', 'k', 'h',
            'k', 'h', 'k', 'h', 's', 'h', 'h', 's'],
  },
};
