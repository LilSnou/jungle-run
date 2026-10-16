# -*- coding: utf-8 -*-
"""
render.py — порт чиптюнового синтеза игры Jungle Run с Web Audio (JS) на чистый Python.

Источник истины (только чтение, web/ не меняем):
    web/js/core/AudioManager.js  (+ события play()/playSong() в web/js/game/Game.js)

Что перенесено «один в один»:
  * осцилляторы square / sawtooth / triangle + белый шум через bandpass (Q = 1.2);
  * огибающая тона (#tone): атака 8 мс (0.0001 -> vol, экспонента),
    экспоненциальное затухание до 0.0001 к концу ноты, затем «хвост»
    на уровне 0.0001 ещё TAIL = 0.02 с (osc.stop(t + dur + 0.02));
  * скольжение частоты glideTo — экспонентный ramp в течение всего dur;
  * шумовая огибающая (#noise): vol -> 0.0001 экспонентно за dur, без атаки;
  * степ-секвенсор (#schedule): шаг stepDur = 60 / bpm / 4 (16-е ноты),
    петля из 16 шагов (длина = song.bass.length);
    длительности нот: bass = stepDur * 1.8, lead = stepDur * 0.9, arp = stepDur * 0.7;
  * барабаны: k (0.09 c, 400 -> 80), h (0.03, 9000 -> 6000),
    s (0.14, 4000 -> 900), t (0.11, 900 -> 150);
  * треки jungle / village / temple и все эффекты play() — как в JS;
  * гейны: master 0.9, musicGain 0.42, sfxGain 0.75.
    ВАЖНО: в JS #noise жёстко подключён к #sfxGain (в #noise нет параметра dest),
    поэтому барабаны музыкальных треков идут через 0.75, а не через 0.42.
    Эта особенность сведения сохранена намеренно.

Про «тики» / dt:
    игровой цикл JS (Game.start) живёт на requestAnimationFrame с dt, зажатым
    clamp(dt, 0, 0.05) — то есть до 20 кадров/с в худшем случае. НО аудио к кадрам
    не привязано: Web Audio считает в секундах, планировщик вызывается
    setInterval(..., 25) с упреждением 0.14 с, а момент ноты накапливается
    точно: nextTime += stepDur. Ни 1/30, ни 1/60 в синтезе нет.
    Вывод для порта: шаг синтеза — реальные секунды, stepDur = 60/bpm/4,
    ноты ставятся без квантайзинга по кадрам (офлайн-рендер к тому же не имеет
    джиттера опроса setInterval, который в браузере ≤ 25 мс).

Сведение: mono, 16 бит, 22050 Гц, пик <= 0.89 (без клиппинга).
Зависимости: только stdlib — math, wave, array, random, os, sys.
"""

import math
import os
import random
import sys
import wave
from array import array

# Русский отчёт в консоли Windows (cp1251/cp866) — иначе кракозябры
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# ---------------------------------------------------------------------------
# Константы синтеза (значения взяты из AudioManager.js)
# ---------------------------------------------------------------------------
SR = 22050                 # частота дискретизации (Godot-совместимая, чиптюновая)
G_MASTER = 0.9             # #master.gain.value
G_MUSIC = 0.42             # #musicGain.gain.value
G_SFX = 0.75               # #sfxGain.gain.value
PEAK_LIMIT = 0.89          # потолок пика после сведения
EPS = 0.0001               # нижняя граница экспоненциальных ramp'ов Web Audio
ATTACK = 0.008             # атака огибающей: exponentialRamp(.., t + 0.008)
TAIL = 0.02                # osc.stop(t + dur + 0.02) / src.stop(...)
NOISE_Q = 1.2              # filt.Q.value = 1.2
TARGET_LEN = 48.0          # целевая длина музыкального лупа, сек (40..60)
VICTORY_LEN = 3.2          # длина фанфары (в JS она ~1.4 с, добиваем тишиной)

# Гейн-шинели: куда что подключено в JS
BUS_MUSIC = G_MUSIC * G_MASTER   # бас/лид/арп -> musicGain -> master
BUS_SFX = G_SFX * G_MASTER       # барабаны и эффекты -> sfxGain -> master

# Барабаны #schedule(): буква -> (dur, vol, from, to)
DRUMS = {
    'k': (0.09, 0.35, 400, 80),      # кик
    'h': (0.03, 0.12, 9000, 6000),   # хэт
    's': (0.14, 0.25, 4000, 900),    # малый барабан
    't': (0.11, 0.30, 900, 150),     # «том» (деревня)
}

# Базовые полутоны для разбора нот вида «C4», «F#3», «Bb1» (как в #freq)
_BASE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

# Общий генератор шума (детерминированный — рендер воспроизводим бит в бит)
RNG = random.Random(0x4A554E47)  # «JUNG»


def note_freq(name):
    """Частота ноты вида «C4», «F#3», «Bb1»; null/пусто/'.' — пауза (0)."""
    if not name or name == '.':
        return 0.0
    if name[0] not in _BASE:
        return 0.0
    base = _BASE[name[0]]
    i = 1
    acc = 0
    if i < len(name) and name[i] in '#b':
        acc = 1 if name[i] == '#' else -1
        i += 1
    oct_str = name[i:]
    if not oct_str or len(oct_str) > 2:
        return 0.0
    try:
        octave = int(oct_str)
    except ValueError:
        return 0.0
    midi = base + acc + (octave + 1) * 12
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


# ---------------------------------------------------------------------------
# Модель данных
# ---------------------------------------------------------------------------
class Note:
    """Одна нота осциллятора — порт объекта-аргумента #tone(...) из JS."""

    __slots__ = ('wave', 'freq', 'glide_to', 'dur', 'vol', 'when', 'bus')

    def __init__(self, wave='square', freq=440.0, glide_to=0.0, dur=0.1,
                 vol=0.5, when=0.0, bus='sfx'):
        self.wave = wave          # 'square' | 'sawtooth' | 'triangle'
        self.freq = freq          # стартовая частота, Гц
        self.glide_to = glide_to  # 0 — без скольжения
        self.dur = dur            # длительность ноты, с
        self.vol = vol            # пик огибающей
        self.when = when          # смещение от начала трека, с
        self.bus = bus            # 'music' (0.42) | 'sfx' (0.75)

    @property
    def end(self):
        """Момент остановки осциллятора (dur + хвост 0.02 с)."""
        return self.when + self.dur + TAIL


class NoiseBurst:
    """Шумовой всплеск — порт #noise(...): барабаны, «скольжение», удары."""

    __slots__ = ('dur', 'vol', 'f_from', 'f_to', 'when', 'bus')

    def __init__(self, dur=0.1, vol=0.4, f_from=8000.0, f_to=600.0,
                 when=0.0, bus='sfx'):
        self.dur = dur
        self.vol = vol
        self.f_from = f_from      # стартовая центральная частота bandpass
        self.f_to = f_to          # конечная (exponentialRamp, минимум 60)
        self.when = when
        self.bus = bus

    @property
    def end(self):
        return self.when + self.dur + TAIL


# ---------------------------------------------------------------------------
# Синтез
# ---------------------------------------------------------------------------
class Synth:
    """Посэмпловый синтез: осциллятор (+glide, +огибающая) и шумовой bandpass.

    Вместо AudioParam-автоматики — те же экспоненты, но рекуррентно
    (env *= r, f *= r): за тысячи сэмплов погрешность float64 ~1e-12,
    зато ноль вызовов math.exp на сэмпл.
    """

    TAU = math.tau

    @staticmethod
    def grow(buf, need):
        """Догнать буфер нулями до need сэмплов."""
        if len(buf) < need:
            buf.extend([0.0] * (need - len(buf)))

    @classmethod
    def tone(cls, buf, start, note, gain, sr=SR):
        """Осциллятор + огибающая (порт #tone). start — индекс сэмпла."""
        if note.freq <= 0.0:
            return
        n_att = int(round(ATTACK * sr))
        n_dur = int(round(note.dur * sr))
        if n_dur <= 0:
            return
        n = n_dur + int(round(TAIL * sr))          # osc.stop(t + dur + 0.02)
        if n_att > n_dur:
            n_att = n_dur
        cls.grow(buf, start + n)

        f0 = float(note.freq)
        glide = bool(note.glide_to)
        f1 = max(20.0, float(note.glide_to)) if glide else f0
        # Множители экспонентных ramp'ов
        r_att = math.exp(math.log(note.vol / EPS) / max(1, n_att))
        r_dec = (math.exp(math.log(EPS / note.vol) / max(1, n_dur - n_att))
                 if n_dur > n_att else 1.0)
        r_fly = math.exp(math.log(f1 / f0) / max(1, n_dur)) if glide else 1.0

        wtype = note.wave
        inv_tau = 1.0 / cls.TAU
        inc = cls.TAU / sr                         # приращение фазы за 1 сэмпл
        phase = 0.0
        f = f0
        env = EPS                                  # setValueAtTime(0.0001, t)

        i = 0
        while i < n:
            # --- огибающая: атака -> затухание -> хвост 0.0001 ---
            if i < n_dur:
                if i < n_att:
                    if i:
                        env *= r_att              # 0.0001 -> vol за 8 мс
                else:
                    if i == n_att:
                        env = note.vol
                    else:
                        env *= r_dec              # vol -> 0.0001 к концу ноты
                if glide and i:
                    f *= r_fly                    # экспонентный скан частоты
            elif i == n_dur:
                env = EPS                         # хвост до osc.stop
                f = f1
            # --- фаза и форма волны ---
            phase += inc * f
            while phase >= cls.TAU:
                phase -= cls.TAU
            x = phase * inv_tau
            if wtype == 'square':
                v = 1.0 if x < 0.5 else -1.0
            elif wtype == 'sawtooth':
                v = 2.0 * x - 1.0
            else:                                  # triangle
                v = 4.0 * abs(x - 0.5) - 1.0
            buf[start + i] += gain * env * v
            i += 1

    @classmethod
    def noise(cls, buf, start, ev, gain, sr=SR, rng=None):
        """Шумовой всплеск через bandpass (порт #noise)."""
        if rng is None:
            rng = RNG
        n_env = int(round(ev.dur * sr))
        if n_env <= 0:
            return
        n = n_env + int(round(TAIL * sr))          # src.stop(t + dur + 0.02)
        cls.grow(buf, start + n)

        f_from = float(ev.f_from)
        f_to = max(60.0, float(ev.f_to))           # Math.max(60, to)
        r_fly = math.exp(math.log(f_to / f_from) / n_env)
        r_dec = math.exp(math.log(EPS / ev.vol) / n_env)
        two_pi_over_sr = cls.TAU / sr
        q = NOISE_Q
        rnd = rng.random

        f = f_from
        env = ev.vol                               # setValueAtTime(vol, t)
        x1 = x2 = y1 = y2 = 0.0                    # состояние биквада

        i = 0
        while i < n:
            if i < n_env:
                if i:
                    f *= r_fly                     # экспонентный скан  f_from -> f_to
                    env *= r_dec                   # vol -> 0.0001 за dur
            elif i == n_env:
                f = f_to
                env = EPS
            # Коэффициенты RBJ-bandpass (0 дБ на резонансе) пересчитываются
            # на каждом сэмпле — ровно так Web Audio «сканирует» частоту фильтра.
            w0 = two_pi_over_sr * f
            cw = math.cos(w0)
            alpha = math.sin(w0) / (2.0 * q)
            a0 = 1.0 + alpha
            b0 = alpha / a0
            a1 = -2.0 * cw / a0
            a2 = (1.0 - alpha) / a0
            x0 = rnd() * 2.0 - 1.0                 # белый шум из Math.random()*2-1
            # прямое I: y[n] = b0*x[n] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2], b1 = 0
            y0 = b0 * x0 - b0 * x2 - a1 * y1 - a2 * y2
            buf[start + i] += gain * env * y0
            x2 = x1
            x1 = x0
            y2 = y1
            y1 = y0
            i += 1


# ---------------------------------------------------------------------------
# Треки
# ---------------------------------------------------------------------------
class Track:
    """Музыкальный трек: bpm + четыре 16-шаговых паттерна (bass/lead/arp/drums).

    Порт объектов AudioTracks.{jungle,village,temple} из AudioManager.js.
    """

    def __init__(self, name, bpm, bass, lead, drums, arp=None):
        self.name = name
        self.bpm = bpm
        self.bass = bass
        self.lead = lead
        self.drums = drums
        self.arp = arp

    @property
    def steps(self):
        """Длина петли в шагах — в JS цикл идёт по song.bass.length."""
        return len(self.bass)

    @property
    def step_dur(self):
        """Шаг секвенсора: 60 / bpm / 4 — 16-е ноты (как в #schedule)."""
        return 60.0 / self.bpm / 4.0

    @property
    def pattern_dur(self):
        """Длительность полного паттерна (16 шагов = 1 такт 4/4), сек."""
        return self.step_dur * self.steps

    def events(self, cycles):
        """События на N полных паттернов: (ноты, шумовые всплески)."""
        sd = self.step_dur
        n = self.steps
        tones = []
        noises = []
        arp = self.arp
        for c in range(cycles):
            base = c * self.pattern_dur
            for i in range(n):
                when = base + i * sd
                bass = self.bass[i]
                lead = self.lead[i]
                arp_i = arp[i] if arp else None
                drum = self.drums[i]
                # длительности каналов — множители stepDur из JS
                if bass and bass != '.':
                    tones.append(Note('triangle', note_freq(bass), 0.0,
                                      sd * 1.8, 0.5, when, 'music'))
                if lead and lead != '.':
                    tones.append(Note('square', note_freq(lead), 0.0,
                                      sd * 0.9, 0.16, when, 'music'))
                if arp_i and arp_i != '.':
                    tones.append(Note('square', note_freq(arp_i), 0.0,
                                      sd * 0.7, 0.07, when, 'music'))
                spec = DRUMS.get(drum)
                if spec:
                    noises.append(NoiseBurst(spec[0], spec[1],
                                             float(spec[2]), float(spec[3]),
                                             when, 'sfx'))
        return tones, noises

    @staticmethod
    def builtin():
        """Все треки игры — копия const AudioTracks = {...} из JS."""
        return {
            'jungle': Track(
                name='jungle', bpm=132,   # C-минор, «мчащийся» рифф
                bass=['C2', 'C2', '.', 'C2', 'Eb2', '.', 'C2', '.',
                      'Bb1', 'Bb1', '.', 'Bb1', 'G2', '.', 'Ab2', '.'],
                lead=['G4', '.', 'Ab4', 'G4', '.', 'Eb4', '.', 'C4',
                      'Eb4', '.', 'F4', 'G4', '.', 'Bb4', '.', 'G4'],
                arp=['.', '.', 'C4', '.', '.', '.', 'Eb4', '.',
                     '.', '.', 'G4', '.', '.', '.', 'C5', '.'],
                drums=['k', 'h', 'h', 'h', 's', 'h', 'k', 'h',
                       'k', 'h', 'h', 'h', 's', 'h', 'h', 's'],
            ),
            'village': Track(
                name='village', bpm=112,  # F-мажор, племенные том-барабаны
                bass=['F2', '.', 'F2', '.', 'F2', '.', 'C2', '.',
                      'Bb1', '.', 'Bb1', '.', 'C2', '.', 'C2', '.'],
                lead=['A4', '.', 'C5', '.', 'A4', 'G4', 'F4', '.',
                      'G4', '.', 'A4', 'C5', '.', 'A4', '.', '.'],
                arp=['.', '.', '.', 'F4', '.', '.', '.', 'A4',
                     '.', '.', '.', 'C5', '.', '.', '.', 'A4'],
                drums=['k', '.', 't', 'k', 'h', '.', 'k', '.',
                       'k', '.', 't', 'k', 's', 'h', 'k', '.'],
            ),
            'temple': Track(
                name='temple', bpm=150,   # D-минор, тревожный arp-канал
                bass=['D2', '.', 'D2', 'D2', '.', 'A2', '.', 'D2',
                      'C2', '.', 'C2', 'C2', '.', 'G2', '.', 'C2'],
                lead=['D5', '.', 'C5', '.', 'A4', '.', 'B4', '.',
                      'C5', '.', 'D5', 'F5', '.', 'E5', '.', 'D5'],
                arp=['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A4', 'C5',
                     'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'B4'],
                drums=['k', 'h', 'h', 'k', 's', 'h', 'k', 'h',
                       'k', 'h', 'k', 'h', 's', 'h', 'h', 's'],
            ),
        }


# ---------------------------------------------------------------------------
# Эффекты (порт switch(name) из AudioManager.play)
# ---------------------------------------------------------------------------
def build_sfx():
    """Словарь «имя эффекта -> события», точная копия play(name) из JS."""
    f = note_freq
    sfx = {
        'jump': [
            Note('square', 300.0, 640.0, 0.13, 0.35),
        ],
        'doublejump': [
            Note('square', 480.0, 980.0, 0.12, 0.30),
            Note('triangle', 960.0, 0.0, 0.08, 0.20, when=0.02),
        ],
        'slide': [
            NoiseBurst(0.22, 0.35, 5200.0, 700.0),
        ],
        'coin': [
            Note('square', f('B5'), 0.0, 0.06, 0.32),
            Note('square', f('E6'), 0.0, 0.18, 0.32, when=0.06),
        ],
        'heart': [
            Note('triangle', f('C5'), 0.0, 0.07, 0.40),
            Note('triangle', f('E5'), 0.0, 0.07, 0.40, when=0.07),
            Note('triangle', f('G5'), 0.0, 0.16, 0.40, when=0.14),
        ],
        'stomp': [
            Note('square', 340.0, 90.0, 0.14, 0.40),
            NoiseBurst(0.10, 0.30, 2500.0, 300.0),
        ],
        'hurt': [
            Note('sawtooth', 420.0, 70.0, 0.28, 0.40),
            NoiseBurst(0.20, 0.30, 3000.0, 250.0),
        ],
        'fall': [
            Note('sawtooth', 500.0, 50.0, 0.50, 0.40),
        ],
        # «Game Over»: нисходящее арпеджио G3-E3-C3-G2
        'gameover': [
            Note('triangle', f(n), 0.0, 0.22, 0.45, when=i * 0.16)
            for i, n in enumerate(['G3', 'E3', 'C3', 'G2'])
        ],
        # старт забега: восходящее C4-E4-G4-C5
        'start': [
            Note('square', f(n), 0.0, 0.10, 0.35, when=i * 0.08)
            for i, n in enumerate(['C4', 'E4', 'G4', 'C5'])
        ],
        # смена биома: восходящее E4-G4-B4-E5
        'biome': [
            Note('triangle', f(n), 0.0, 0.14, 0.40, when=i * 0.09)
            for i, n in enumerate(['E4', 'G4', 'B4', 'E5'])
        ],
        'click': [
            Note('square', 720.0, 520.0, 0.07, 0.25),
        ],
    }
    return sfx


def victory_events():
    """Фанфара победы (case 'victory'): квадрат + октава ниже на треугольнике."""
    seq = [
        ('C4', 0.00, 0.12), ('E4', 0.12, 0.12), ('G4', 0.24, 0.12),
        ('C5', 0.36, 0.30), ('G4', 0.66, 0.10), ('C5', 0.76, 0.60),
    ]
    ev = []
    for name, when, dur in seq:
        f0 = note_freq(name)
        ev.append(Note('square', f0, 0.0, dur, 0.40, when))
        ev.append(Note('triangle', f0 / 2.0, 0.0, dur, 0.28, when))
    return ev


# ---------------------------------------------------------------------------
# Рендер / WAV
# ---------------------------------------------------------------------------
class Renderer:
    """Сведение треков и эффектов в mono 16-бит WAV + отчёт."""

    def __init__(self, sr=SR, rng=None):
        self.sr = sr
        self.rng = rng or RNG

    # --- музыка -----------------------------------------------------------
    def render_music(self, track, cycles):
        """Ровно `cycles` полных паттернов, луп без обрыва хвостов нот."""
        tones, noises = track.events(cycles)
        loop_len = int(round(track.pattern_dur * cycles * self.sr))
        # запас под хвосты последних нот (bass тянет 1.8 шага + 0.02 с)
        buf = [0.0] * (loop_len + int(0.6 * self.sr) + 8)
        for nt in tones:
            Synth.tone(buf, int(round(nt.when * self.sr)), nt,
                       BUS_MUSIC if nt.bus == 'music' else BUS_SFX, self.sr)
        for ev in noises:
            # внимание: в JS барабаны музыки идут через sfxGain (0.75) — сохраняем
            Synth.noise(buf, int(round(ev.when * self.sr)), ev,
                        BUS_SFX, self.sr, self.rng)
        # Хвосты, вылезшие за границу петли, сворачиваем в её начало:
        # это слуховой эквивалент бесконечного лупа секвенсора в игре
        # (хвост прошлого цикла накладывается на начало следующего).
        for i in range(loop_len, len(buf)):
            buf[i - loop_len] += buf[i]
        return buf[:loop_len]

    # --- эффекты ----------------------------------------------------------
    def render_events(self, events, min_len=0.0, pad=0.05):
        """Рендер списка событий; min_len — добивка тишиной до нужной длины."""
        end = 0.0
        for ev in events:
            end = max(end, ev.end)
        total = int(round(max(end + pad, min_len) * self.sr))
        buf = [0.0] * total
        for ev in events:
            start = int(round(ev.when * self.sr))
            if isinstance(ev, Note):
                Synth.tone(buf, start, ev,
                           BUS_MUSIC if ev.bus == 'music' else BUS_SFX,
                           self.sr)
            else:
                Synth.noise(buf, start, ev, BUS_SFX, self.sr, self.rng)
        return buf

    # --- запись -----------------------------------------------------------
    @staticmethod
    def _to_i16(v):
        if v > 1.0:
            v = 1.0
        elif v < -1.0:
            v = -1.0
        return int(round(v * 32767.0))

    @staticmethod
    def peak_of(samples):
        peak = 0.0
        for v in samples:
            a = v if v >= 0.0 else -v
            if a > peak:
                peak = a
        return peak

    def write(self, path, samples, gain=1.0):
        """Запись mono 16-бит WAV: общий множитель `gain` на категорию
        (музыка / эффекты), но не выше потолка пика 0.89 — без клиппинга."""
        peak = self.peak_of(samples)
        if peak * gain > PEAK_LIMIT:
            gain = PEAK_LIMIT / peak if peak > 0.0 else 1.0
        data = array('h', (self._to_i16(v * gain) for v in samples))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with wave.open(path, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(self.sr)
            w.writeframes(data.tobytes())
        return self.verify(path, gain * peak)

    @staticmethod
    def verify(path, peak_est):
        """Переоткрыть WAV и снять настоящие параметры с диска (валидация)."""
        with wave.open(path, 'rb') as w:
            ch = w.getnchannels()
            width = w.getsampwidth()
            rate = w.getframerate()
            nframes = w.getnframes()
            raw = w.readframes(nframes)
        peak = 0.0
        vals = array('h')
        vals.frombytes(raw)
        for x in vals:
            a = x if x >= 0 else -x
            if a > peak:
                peak = a
        return {
            'path': path,
            'dur': nframes / float(rate),
            'sr': rate,
            'ch': ch,
            'bits': width * 8,
            'peak': peak / 32767.0,
            'est': peak_est,
        }

    @staticmethod
    def report(rows):
        """Печать отчёта по всем выведенным файлам."""
        print('=== Jungle Run / audiogen: отчёт рендера ===')
        print('{:<46} {:>9} {:>7} {:>5} {:>5} {:>8}'.format(
            'файл', 'длит., с', 'Гц', 'кан.', 'бит', 'пик'))
        ok = True
        for r in rows:
            rel = r['path']
            print('{:<46} {:>9.3f} {:>7} {:>5} {:>5} {:>8.3f}'.format(
                rel, r['dur'], r['sr'], r['ch'], r['bits'], r['peak']))
            if r['ch'] != 1 or r['bits'] != 16 or r['sr'] != SR:
                ok = False
            # допуск — одно деление int16 (округление при записи)
            if r['peak'] > PEAK_LIMIT + 1.0 / 32767.0:
                ok = False
        print('Файлов: {}, все WAV валидны (mono/16 бит/{} Гц), пик <= {}: {}'.format(
            len(rows), SR, PEAK_LIMIT, 'ДА' if ok else 'НЕТ'))


# ---------------------------------------------------------------------------
# Точка входа
# ---------------------------------------------------------------------------
def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, '..', '..'))
    music_dir = os.path.join(root, 'godot', 'assets', 'audio', 'music')
    sfx_dir = os.path.join(root, 'godot', 'assets', 'audio', 'sfx')

    r = Renderer()
    jobs = []            # (категория, путь, сэмплы)

    # --- треки биомов: минимум 2 полных цикла паттерна, ~40..60 с ---
    for name, track in Track.builtin().items():
        cycles = max(2, int(round(TARGET_LEN / track.pattern_dur)))
        samples = r.render_music(track, cycles)
        jobs.append(('music', os.path.join(music_dir, name + '.wav'), samples))

    # --- фанфара победы (play('victory')), без лупа ---
    samples = r.render_events(victory_events(), min_len=VICTORY_LEN)
    jobs.append(('sfx', os.path.join(music_dir, 'victory.wav'), samples))

    # --- все звуковые эффекты play() ---
    sfx = build_sfx()
    for name in sorted(sfx):
        samples = r.render_events(sfx[name])
        jobs.append(('sfx', os.path.join(sfx_dir, name + '.wav'), samples))

    # Общий множитель на категорию: максимальный пик категории = 0.89.
    # Так громкость ОТНОСИТЕЛЬНЫХ файлов сохраняется (не как при
    # пофайловой нормализации), а клиппинг исключён.
    cat_peak = {}
    for cat, _path, samples in jobs:
        p = r.peak_of(samples)
        if p > cat_peak.get(cat, 0.0):
            cat_peak[cat] = p
    gains = {c: (PEAK_LIMIT / p if p > 0 else 1.0) for c, p in cat_peak.items()}

    rows = [r.write(path, samples, gains[cat]) for cat, path, samples in jobs]

    # относительные пути в отчёте — как в выводе задания
    for row in rows:
        row['path'] = os.path.relpath(row['path'], root)
    Renderer.report(rows)


if __name__ == '__main__':
    main()
