#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генератор фонов биомов и тайлов земли для Jungle Run (Godot-порт).

Источник истины — tools/artgen/SPEC.md:
  * §7   — точное описание процедурных слоёв каждого биома;
  * §8   — структура земли (кромка/верх/грунт + крапинки);
  * §11B — контракт имён и размеров PNG-слоёв (bg_/fg_<biome>_<layer>.png);
  * §11C — контракт тайлов земли (tiles_<biome>.png, 4 варианта 16x16).

Канвас логический: 320x180, GROUND_Y = 150. Все координаты «мировые»
(как в §7); каждый слой хранится в PNG своих размеров со смещением
y0 (верхняя строка PNG = мировая строка y0) и корректно повторяется
по X: каждый элемент рисуется в позициях x-W, x, x+W, поэтому левый
и правый края слоя совпадают при тайлинге.

Стиль: попиксельная отрисовка Pillow, без anti-aliasing; градиенты —
ступенчатая интерполяция + дизеринг Байера 4x4; «случайные»
расстановки — детерминированный mulberry32 (тот же алгоритм, что
makeRandom(seed) в игре). Светящиеся/мерцающие элементы (водопады,
огоньки, руны, звёзды, пламя) зафиксированы в статичной «средней»
фазе — анимацию добавит движок.

Запуск:  python tools/artgen/gen_backgrounds.py
Выход:   godot/assets/bg/*.png, godot/assets/tiles/*.png,
         tools/artgen/preview_bg/preview_composite_*.png,
         tools/artgen/preview_bg/preview_tiles.png,
         tools/artgen/preview_bg/seams/seam_*.png (контроль швов).
"""

import math
import os

from PIL import Image

# --------------------------------------------------------------------------
# Пути и константы канваса (§1, §10.1)
# --------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_BG = os.path.join(ROOT, 'godot', 'assets', 'bg')
OUT_TILES = os.path.join(ROOT, 'godot', 'assets', 'tiles')
OUT_PREVIEW = os.path.join(ROOT, 'tools', 'artgen', 'preview_bg')
OUT_SEAMS = os.path.join(OUT_PREVIEW, 'seams')

CANVAS_W, CANVAS_H = 320, 180
GY = 150                      # CONFIG.GROUND_Y
GRAD_STEP = 8.0               # ступень квантования градиентов (дизеринг)

# --------------------------------------------------------------------------
# Детерминированный ГПСЧ: mulberry32 — точный порт Utils.makeRandom из игры
# --------------------------------------------------------------------------


def mulberry32(seed):
    a = seed & 0xFFFFFFFF

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        u = ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF
        t = ((t + u) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rnd


def fl(v):
    """floor для координат — никакого anti-aliasing."""
    return int(math.floor(v))


def jr(v):
    """Math.round из JS (для формул вида round(sin(...)*n))."""
    return int(math.floor(v + 0.5))


def C(s, a=255):
    """'#rrggbb' (+ alpha) -> кортеж RGBA 0..255."""
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def clampi(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


# --------------------------------------------------------------------------
# Слой: попиксельный холст с мировыми координатами, клиппингом,
# альфа-блендингом и опциональным тайлингом по X.
# --------------------------------------------------------------------------

class Layer:
    def __init__(self, name, w, h, y0=0, wrap=True):
        self.name = name
        self.w, self.h, self.y0, self.wrap = w, h, y0, wrap
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.img.load()
        self.elements = 0

    # --- низкоуровневая заливка прямоугольника (уже в пикселях изображения)
    def _blit(self, x, y, w, h, color):
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(self.w, x + w), min(self.h, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        r, g, b, a = color
        if a >= 255:
            for py in range(y0, y1):
                for pxx in range(x0, x1):
                    self.px[pxx, py] = (r, g, b, 255)
            return
        sa = a / 255.0
        for py in range(y0, y1):
            for pxx in range(x0, x1):
                dr, dg, db, da = self.px[pxx, py]
                da_f = da / 255.0
                oa = sa + da_f * (1.0 - sa)
                if oa <= 0.0:
                    continue
                nr = (r * sa + dr * da_f * (1.0 - sa)) / oa
                ng = (g * sa + dg * da_f * (1.0 - sa)) / oa
                nb = (b * sa + db * da_f * (1.0 - sa)) / oa
                self.px[pxx, py] = (clampi(int(nr + 0.5), 0, 255),
                                    clampi(int(ng + 0.5), 0, 255),
                                    clampi(int(nb + 0.5), 0, 255),
                                    clampi(int(oa * 255 + 0.5), 0, 255))

    # --- прямоугольник в мировых координатах (y = мировое, y0 = сдвиг слоя)
    def rect(self, x, y, w, h, color):
        x, y, w, h = fl(x), fl(y), fl(w), fl(h)
        if w <= 0 or h <= 0:
            return
        self.elements += 1
        yy = y - self.y0
        if self.wrap:
            if w > self.w:
                raise ValueError('%s: rect шире слоя (%d > %d)' % (self.name, w, self.w))
            for dx in (-self.w, 0, self.w):
                self._blit(x + dx, yy, w, h, color)
        else:
            self._blit(x, yy, w, h, color)

    def px1(self, x, y, color):
        self.rect(x, y, 1, 1, color)

    def glow_rect(self, x, y, w, h, color):
        """Прямоугольник с дизерингом альфы — «8-битное свечение».

        Пиксель заполняется, если alpha > порога Байера 8x8: плотность
        светящихся пикселей равна alpha, квадрат читается как мягкое
        пятно света, а не как жёсткая коробка.
        """
        x, y, w, h = fl(x), fl(y), fl(w), fl(h)
        if w <= 0 or h <= 0:
            return
        self.elements += 1
        r, g, b, a = color
        sa = a / 255.0
        yy0 = y - self.y0
        y_lo, y_hi = max(0, yy0), min(self.h, yy0 + h)
        xs = [x - self.w, x, x + self.w] if self.wrap else [x]
        for xx in xs:
            for j in range(y_lo, y_hi):
                row = BAYER8[j & 7]
                for i in range(max(0, -xx), min(w, self.w - xx)):
                    if sa > (row[(xx + i) & 7] + 0.5) / 64.0:
                        self._blit(xx + i, j, 1, 1, (r, g, b, 255))

    def bbox(self):
        bb = self.img.getbbox()
        return bb  # (l, t, r, b) или None

    def save(self, folder=OUT_BG):
        path = os.path.join(folder, self.name + '.png')
        self.img.save(path)
        return path


# --------------------------------------------------------------------------
# Дизеринг вертикального градиента (небо) — ступени + Bayer 4x4
# --------------------------------------------------------------------------

BAYER8 = ((0, 32, 8, 40, 2, 34, 10, 42),
          (48, 16, 56, 24, 50, 18, 58, 26),
          (12, 44, 4, 36, 14, 46, 6, 38),
          (60, 28, 52, 20, 62, 30, 54, 22),
          (3, 35, 11, 43, 1, 33, 9, 41),
          (51, 19, 59, 27, 49, 17, 57, 25),
          (15, 47, 7, 39, 13, 45, 5, 37),
          (63, 31, 55, 23, 61, 29, 53, 21))


def _lerp_stops(stops, t):
    if t <= stops[0][0]:
        return stops[0][1]
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        if t <= p1:
            f = (t - p0) / (p1 - p0)
            return (c0[0] + (c1[0] - c0[0]) * f,
                    c0[1] + (c1[1] - c0[1]) * f,
                    c0[2] + (c1[2] - c0[2]) * f)
    return stops[-1][1]


def dither_gradient(layer, stops, span):
    """Вертикальный градиент: span px (t = y/(span-1)), ниже — последний цвет.

    Квантование по GRAD_STEP на канал + дизеринг Байера 4x4 —
    честный 8-битный градиент без anti-aliasing.
    """
    step = GRAD_STEP
    for y in range(layer.h):
        t = min(1.0, y / max(1, span - 1))
        base = _lerp_stops(stops, t)
        row = BAYER8[y & 7]
        for x in range(layer.w):
            thr = (row[x & 7] + 0.5) / 64.0
            out = []
            for k in range(3):
                lv = base[k] / step
                flr = math.floor(lv)
                frac = lv - flr
                v = (flr + (1.0 if frac > thr else 0.0)) * step
                out.append(clampi(int(v + 0.5), 0, 255))
            layer.px[x, y] = (out[0], out[1], out[2], 255)


# --------------------------------------------------------------------------
# Общие примитивы (горы/пирамиды с сужением, как в §7)
# --------------------------------------------------------------------------

def taper_rows(layer, x, base, w, h, taper, color_fn):
    """Строки с сужением: строка k (0 = нижняя), высота 1 px."""
    w, h = int(w), int(h)
    for k in range(h):
        rw = max(1, jr(w * (1.0 - taper * k / h)))
        x0 = x + int((w - rw) / 2)
        col = color_fn(k)
        if col is not None:
            layer.rect(x0, base - k, rw, 1, col)


# ==========================================================================
# JUNGLE (§7.1) — сид 1337, как в игре
# ==========================================================================

def jungle_sky():
    L = Layer('bg_jungle_sky', 320, 180, wrap=False)
    dither_gradient(L, [(0.0, C('#3f9fd8')[:3]),
                        (0.65, C('#7fc4b8')[:3]),
                        (1.0, C('#a9dba4')[:3])], 150)
    return L


def jungle_sun():
    L = Layer('bg_jungle_sun', 640, 68)           # параллакс 0.04
    sun_x = 250
    L.glow_rect(sun_x - 22, 12, 44, 44, C('#fff0aa', 64))   # rgba(255,240,170,0.25)
    L.glow_rect(sun_x - 17, 17, 34, 34, C('#fff0aa', 115))  # rgba(...,0.45)
    L.rect(sun_x - 13, 21, 26, 26, C('#ffe98a'))
    L.rect(sun_x - 8, 26, 16, 16, C('#fff6c2'))
    return L


def jungle_clouds():
    rnd = mulberry32(1337 + 2)
    L = Layer('bg_jungle_clouds', 324, 40)        # параллакс 0.06, период 324
    body, shade = C('#eef7ef'), C('#d4e8d8')
    for i in range(6):
        x = i * 54 + fl(rnd() * 26)
        y = 12 + fl(rnd() * 18)                   # контрактная высота 40 px
        w = 30 + fl(rnd() * 30)
        h = 6 + fl(rnd() * 4)
        L.rect(x, y, w, h, body)
        L.rect(x + 6, y - 4, w - 16, 5, body)
        L.rect(x + 2, y + h, w - 6, 2, shade)
    return L


def jungle_mountains_far():
    rnd = mulberry32(1337 + 3)
    L = Layer('bg_jungle_mountains_far', 350, 158)   # параллакс 0.13, период 350
    base = GY + 4                                     # 154
    deep, peak = C('#3d7f74'), C('#2f6b63')
    fall_bright, fall_dim, splash = C('#bfe8f0'), C('#8fd0e0'), C('#d8f0f4')
    for i in range(7):
        x = i * 50 + fl(rnd() * 16)
        w = 44 + fl(rnd() * 30)
        h = 34 + fl(rnd() * 26)
        fall = rnd() > 0.6
        taper_rows(L, x, base, w, h, 0.85,
                   lambda k: peak if k > h * 0.6 else deep)
        if fall:
            fx = x + jr(w / 2) - 1
            phase = i % 3                              # разные фазы шиммера
            for k in range(26):                     # статичный шиммер
                col = fall_bright if (k + phase) % 3 == 0 else fall_dim
                L.rect(fx + (k % 2), base - 26 + k, 2, 1, col)
            L.rect(fx - 3, base - 3, 8, 1, fall_dim)
            L.rect(fx - 3, base - 2, 8, 2, splash)
    return L


def jungle_fog():
    L = Layer('bg_jungle_fog', 320, 180, wrap=False)
    L.rect(0, GY - 26, 320, 8, C('#d2ebdc', 89))     # rgba(210,235,220,0.35)
    L.rect(0, GY - 20, 320, 6, C('#d2ebdc', 51))     # rgba(...,0.2)
    return L


def jungle_mountains_near():
    rnd = mulberry32(1337 + 4)
    L = Layer('bg_jungle_mountains_near', 336, 156)  # параллакс 0.22, период 336
    base = GY + 3                                     # 153
    dark, light = C('#2b5f3f'), C('#35704a')
    for i in range(6):
        x = i * 56 + fl(rnd() * 20)
        w = 50 + fl(rnd() * 26)
        h = 22 + fl(rnd() * 18)
        taper_rows(L, x, base, w, h, 0.9,
                   lambda k: dark if k > h * 0.5 else light)
    return L


def jungle_trees():
    rnd = mulberry32(1337 + 5)
    L = Layer('bg_jungle_trees', 324, 172)           # параллакс 0.38, период 324
    base = GY + 2                                     # 152
    trunk0, crown0, crown1, crown2 = (C('#4a3520'), C('#276b34'),
                                      C('#3fae4a'), C('#57c25c'))
    palm_trunk, palm_d, palm_l = C('#6b5030'), C('#2f7a3a'), C('#43964a')
    dry_trunk, dry_vine = C('#5c4526'), C('#3f7a3a')
    for i in range(9):
        x = i * 36 + fl(rnd() * 14)
        kind = fl(rnd() * 3)
        h = 26 + fl(rnd() * 18)
        w = 16 + fl(rnd() * 12)
        if kind == 0:                                # широкая крона
            L.rect(x + 3, base - h, 4, h, trunk0)
            L.rect(x - w / 2 + 3, base - h - 10, w, 12, crown0)
            L.rect(x - w / 4 + 3, base - h - 16, w / 2, 8, crown0)
            L.rect(x - w / 3 + 3, base - h - 12, w / 2, 6, crown1)
            L.rect(x - w / 4 + 3, base - h - 15, 4, 3, crown2)
        elif kind == 1:                              # пальма
            for k in range(h):
                L.rect(x + 2 + jr(math.sin(k / 9.0) * 3), base - k, 2, 1,
                       palm_trunk)
            top_x = x + 2 + jr(math.sin(h / 9.0) * 3)
            L.rect(top_x - 8, base - h - 2, 7, 2, palm_d)
            L.rect(top_x + 1, base - h - 2, 7, 2, palm_d)
            L.rect(top_x - 5, base - h - 4, 10, 2, palm_d)
            L.rect(top_x - 3, base - h - 5, 6, 2, palm_l)
        else:                                        # сухое дерево
            L.rect(x + 2, base - h, 3, h, dry_trunk)
            L.rect(x - 3, base - h + 6, 6, 2, dry_trunk)
            L.rect(x + 4, base - h + 10, 6, 2, dry_trunk)
            L.rect(x - 2, base - h + 8, 1, 6, dry_vine)
            L.rect(x + 8, base - h + 12, 1, 8, dry_vine)
    return L


def jungle_bushes():
    rnd = mulberry32(1337 + 6)
    L = Layer('bg_jungle_bushes', 320, 155)          # параллакс 0.72, период 320
    base = GY + 2
    body, light, flower = C('#276b34'), C('#3fae4a'), C('#d94f6b')
    for i in range(10):
        x = i * 32 + fl(rnd() * 12)
        w = 10 + fl(rnd() * 12)
        h = 6 + fl(rnd() * 5)
        L.rect(x, base - h, w, h, body)
        L.rect(x + 2, base - h - 3, w - 4, 4, body)
        L.rect(x + 2, base - h - 1, w - 6, 2, light)
        if w > 14:
            L.rect(x + w - 5, base - h - 3, 2, 2, flower)
    return L


def jungle_canopy():
    rnd = mulberry32(1337 + 7)
    L = Layer('bg_jungle_canopy', 324, 60)           # «сверху», параллакс 0.85
    dark, lite, shade = C('#1f4f26'), C('#2b6b31'), C('#173d1e')
    vine_stem, vine_leaf = C('#2f6b35'), C('#4e9a3f')
    for i in range(12):
        x = i * 27 + fl(rnd() * 9)
        r = 9 + fl(rnd() * 9)
        vines = 2 + fl(rnd() * 3) if rnd() > 0.45 else 0
        L.rect(x - r, 0, 2 * r, 11, dark)
        L.rect(x - r / 2, 11, r, 5, dark)
        L.rect(x - r + 3, 4, r, 4, lite)
        L.rect(x - r + 1, 9, 4, 2, shade)
        for v in range(vines):
            sway = jr(math.sin(v + x * 0.05) * 2)    # статичная поза качания
            ln = 12 + (v * 5) % 14
            vx = x - r + 4 + v * 7
            L.rect(vx + sway, 14, 1, ln, vine_stem)
            L.rect(vx + sway - 1, 14 + ln - 2, 3, 2, vine_leaf)
    return L


def jungle_rays():
    L = Layer('bg_jungle_rays', 90, 150, wrap=False)  # тайл лучей, сдвиг 0.5
    col = C('#fff8d8', 18)                            # alpha 0.07 запечён
    for i in range(-1, 6):
        rx = i * 90
        for y in range(150):
            left = 20.0 * y / 150.0
            right = 26.0 + 34.0 * y / 150.0
            x0 = int(math.ceil(left))
            x1 = int(math.floor(right))
            if x1 > x0:
                L.rect(rx + x0, y, x1 - x0, 1, col)
    return L


def jungle_ferns():
    rnd = mulberry32(1337 + 8)
    L = Layer('fg_jungle_ferns', 350, 8, y0=GY - 7)  # параллакс 1.05, период 350
    fern_d, fern_l = C('#2f6b35'), C('#4e9a3f')
    stem, cap, dot = C('#efe3c8'), C('#b03027'), C('#efe3c8')
    stalk, bud = C('#3fae4a'), C('#d94f6b')
    for i in range(14):
        x = i * 25 + fl(rnd() * 10)
        kind = fl(rnd() * 3)
        if kind == 0:                                # папоротник
            L.rect(x, GY - 6, 1, 6, fern_d)
            L.rect(x - 3, GY - 5, 3, 1, fern_d)
            L.rect(x + 1, GY - 4, 3, 1, fern_d)
            L.rect(x - 2, GY - 7, 2, 1, fern_d)
            L.rect(x + 1, GY - 6, 3, 1, fern_l)
        elif kind == 1:                              # гриб
            L.rect(x, GY - 4, 2, 4, stem)
            L.rect(x - 2, GY - 7, 6, 3, cap)
            L.rect(x - 1, GY - 6, 1, 1, dot)
            L.rect(x + 1, GY - 5, 1, 1, dot)
        else:                                        # цветок
            L.rect(x, GY - 5, 1, 5, stalk)
            L.rect(x + 2, GY - 4, 1, 4, stalk)
            L.rect(x + 4, GY - 3, 1, 3, stalk)
            L.rect(x, GY - 7, 2, 2, bud)
    return L


def gen_jungle():
    """Порядок drawBackground (§7.1): sky, sun, clouds, mountains_far, fog,
    mountains_near, trees, bushes, canopy, rays. Плюс foreground: ferns."""
    bg = [jungle_sky(), jungle_sun(), jungle_clouds(), jungle_mountains_far(),
          jungle_fog(), jungle_mountains_near(), jungle_trees(),
          jungle_bushes(), jungle_canopy(), jungle_rays()]
    fg = [jungle_ferns()]
    return bg, fg


# ==========================================================================
# VILLAGE (§7.2) — закат, хижины, тотемы
# ==========================================================================

def village_sky():
    L = Layer('bg_village_sky', 320, 150, wrap=False)
    dither_gradient(L, [(0.0, C('#6d3a86')[:3]),
                        (0.55, C('#c95e63')[:3]),
                        (1.0, C('#f7a04b')[:3])], 150)
    return L


def village_sun():
    L = Layer('bg_village_sun', 700, 60, y0=75)      # параллакс 0.035, период 700
    sun_x, sun_y = 200, GY - 42                      # 108
    L.glow_rect(sun_x - 26, sun_y - 26, 52, 52, C('#ffd27a', 56))   # 0.22
    L.glow_rect(sun_x - 20, sun_y - 20, 40, 40, C('#ffd27a', 102))  # 0.4
    L.rect(sun_x - 15, sun_y - 15, 30, 30, C('#ffd27a'))
    L.rect(sun_x - 9, sun_y - 9, 18, 18, C('#ffe9a8'))
    return L


def village_clouds():
    rnd = mulberry32(4242 + 2)
    L = Layer('bg_village_clouds', 340, 36)          # параллакс 0.07, период 340
    body, top, bot = C('#e8a06a'), C('#f7c38a'), C('#b96a52')
    for i in range(5):
        x = i * 68 + fl(rnd() * 26)
        y = 12 + fl(rnd() * 14)                      # контрактная высота 36 px
        w = 34 + fl(rnd() * 26)
        h = 5 + fl(rnd() * 3)
        L.rect(x, y, w, h, body)
        L.rect(x + 4, y - 2, w - 12, 2, top)
        L.rect(x + 2, y + h, w - 8, 1, bot)
    return L


def village_hills_far():
    rnd = mulberry32(4242 + 3)
    L = Layer('bg_village_hills_far', 348, 150)      # параллакс 0.12, период 348
    base = GY + 3
    dark, light = C('#5c3050'), C('#6d3a5e')
    for i in range(6):
        x = i * 58 + fl(rnd() * 18)
        w = 48 + fl(rnd() * 28)
        h = 24 + fl(rnd() * 20)
        taper_rows(L, x, base, w, h, 0.92,
                   lambda k: dark if k > h * 0.5 else light)
    return L


def village_palms():
    rnd = mulberry32(4242 + 4)
    L = Layer('bg_village_palms', 324, 165)          # параллакс 0.28, период 324
    base = GY + 2
    trunk, frond_d, frond_l, coco = (C('#5c4526'), C('#3f7a3a'),
                                     C('#4e9a3f'), C('#6b4a25'))
    for i in range(6):
        x = i * 54 + fl(rnd() * 20)
        h = 28 + fl(rnd() * 14)
        flip = rnd() > 0.5
        d = -1 if flip else 1
        for k in range(h):
            L.rect(x + jr(math.sin(k / 12.0) * 4 * d), base - k, 2, 1, trunk)
        top_x = x + jr(math.sin(h / 12.0) * 4 * d)
        xa = top_x - 9 * d
        if d < 0:
            xa -= 8                                  # при dir<0 — 8 px влево
        L.rect(xa, base - h - 2, 8, 2, frond_d)
        L.rect(top_x - 1, base - h - 2, 9, 2, frond_d)
        L.rect(top_x - 6, base - h - 4, 12, 2, frond_d)
        L.rect(top_x - 4, base - h - 5, 8, 2, frond_l)
        L.rect(top_x - 2, base - h, 2, 2, coco)
    return L


def village_huts():
    rnd = mulberry32(4242 + 5)
    L = Layer('bg_village_huts', 360, 175)           # параллакс 0.4, период 360
    base = GY + 2
    wall, bamboo, beam = C('#7a5230'), C('#c9a86a'), C('#5c381b')
    roof_a, roof_b, roof_c = C('#d9b26a'), C('#c99a4b'), C('#e8c882')
    door, fire = C('#3d2a17'), C('#e8a53a')
    for i in range(6):
        x = i * 60 + fl(rnd() * 22)
        w = 24 + fl(rnd() * 12)
        h = 15 + fl(rnd() * 7)
        smoke = rnd() > 0.35                         # дым анимирует движок
        _ = smoke
        L.rect(x, base - h, w, h, wall)
        for bx in range(0, w, 5):
            L.rect(x + bx, base - h, 2, h, bamboo)
        L.rect(x, base - h, w, 2, beam)
        L.rect(x - 4, base - h - 8, w + 8, 8, roof_a)
        L.rect(x - 1, base - h - 12, w + 2, 5, roof_b)
        L.rect(x + 2, base - h - 13, w - 4, 2, roof_c)
        L.rect(x + w / 2 - 3, base - 9, 6, 9, door)
        L.rect(x + w / 2 - 2, base - 6, 4, 3, fire)
    return L


def village_racks():
    rnd = mulberry32(4242 + 6)
    L = Layer('bg_village_racks', 360, 165)          # параллакс 0.4, период 360
    base = GY + 2
    post = C('#6b4a25')
    cloth, cloth_top = C('#d94f6b'), C('#e07a8a')
    fish, tail = C('#9aa3ad'), C('#5c5e6b')
    for i in range(3):
        x = i * 121 + fl(rnd() * 40)
        clothed = rnd() > 0.5
        L.rect(x, base - 14, 1, 14, post)
        L.rect(x + 16, base - 14, 1, 14, post)
        L.rect(x, base - 14, 17, 1, post)
        if clothed:
            sway = jr(math.sin(x) * 2)               # статичная поза качания
            L.rect(x + 3 + sway, base - 13, 6, 8, cloth)
            L.rect(x + 3 + sway, base - 13, 6, 2, cloth_top)
        else:
            for j in range(3):
                fy = jr(base - 12 + math.sin(j + x))
                L.rect(x + 3 + j * 4, fy, 2, 6, fish)
                L.rect(x + 3 + j * 4, fy + 4, 2, 1, tail)
    return L


def village_totems():
    rnd = mulberry32(4242 + 7)
    L = Layer('bg_village_totems', 380, 175)         # параллакс 0.52, период 380
    base = GY + 2
    post, shade = C('#8a4b23'), C('#6b3717')
    eye, mouth_r, mouth_g = C('#e0c53a'), C('#b03027'), C('#3fae4a')
    f_red, f_yel, f_grn = C('#b03027'), C('#e0c53a'), C('#3fae4a')
    for i in range(5):
        x = i * 76 + fl(rnd() * 26)
        h = 24 + fl(rnd() * 14)
        L.rect(x, base - h, 9, h, post)
        L.rect(x + 7, base - h, 2, h, shade)
        for f in range(3):
            fy = base - h + 3 + f * ((h - 4) // 3)
            L.rect(x + 1, fy, 2, 2, eye)
            L.rect(x + 5, fy, 2, 2, eye)
            L.rect(x + 2, fy + 3, 4, 2, mouth_r if f % 2 else mouth_g)
        L.rect(x - 1, base - h - 4, 3, 4, f_red)
        L.rect(x + 3, base - h - 5, 3, 5, f_yel)
        L.rect(x + 7, base - h - 4, 3, 4, f_grn)
    return L


def village_fences():
    rnd = mulberry32(4242 + 8)
    L = Layer('bg_village_fences', 300, 155)         # параллакс 0.66, период 300
    base = GY + 2
    post, lite, tip, rail = C('#6b4a25'), C('#845c30'), C('#54381b'), C('#54381b')
    for i in range(6):
        x = i * 50 + fl(rnd() * 18)
        posts = 3 + fl(rnd() * 3)
        for p in range(posts):
            px = x + p * 8
            L.rect(px, base - 9, 2, 9, post)
            L.rect(px, base - 9, 1, 9, lite)
            L.rect(px, base - 10, 2, 1, tip)
        rw = (posts - 1) * 8 + 2
        L.rect(x, base - 7, rw, 1, rail)
        L.rect(x, base - 3, rw, 1, rail)
    return L


def village_fires():
    rnd = mulberry32(4242 + 9)
    L = Layer('bg_village_fires', 460, 160)          # параллакс 0.8, период 460
    base = GY + 2
    log_a, log_b = C('#5c381b'), C('#6b4a25')
    flame, inner, core = C('#e07a2e'), C('#ffd27a'), C('#fff3c8')
    glow = C('#ffb45a', 46)                          # rgba(255,180,90,0.18)
    for i in range(4):
        x = i * 92 + fl(rnd() * 30)
        L.rect(x - 2, base - 3, 9, 2, log_a)
        L.rect(x, base - 4, 6, 2, log_b)
        fl_ = i % 3                    # фаза статичная, но разная у объектов
        L.rect(x, base - 8 - fl_, 6, 5 + fl_, flame)
        L.rect(x + 1, base - 7 - fl_, 4, 4 + fl_, inner)
        L.rect(x + 2, base - 5, 2, 2, core)
        L.glow_rect(x - 8, base, 22, 3, glow)
    return L


def village_grass():
    rnd = mulberry32(4242 + 10)
    L = Layer('fg_village_grass', 312, 7, y0=GY - 6)  # параллакс 1.2, период 312
    dark, lite = C('#8a6a2e'), C('#a8843a')
    for i in range(12):
        x = i * 26 + fl(rnd() * 10)
        h = min(6, 5 + fl(rnd() * 6))                 # влезает в слой 7 px
        sway = jr(math.sin(x) * 2)
        L.rect(x + sway, GY - h, 1, h, dark)
        L.rect(x + 3 + sway, GY - h + 2, 1, h - 2, dark)
        L.rect(x + 6 - sway, GY - h + 1, 1, h - 1, lite)
    return L


def gen_village():
    """Порядок drawBackground (§7.2): sky, sun, clouds, hills_far, palms,
    huts, totems, fences, fires, racks. Плюс foreground: grass."""
    bg = [village_sky(), village_sun(), village_clouds(), village_hills_far(),
          village_palms(), village_huts(), village_totems(),
          village_fences(), village_fires(), village_racks()]
    fg = [village_grass()]
    return bg, fg


# ==========================================================================
# TEMPLE (§7.3) — ночь, пирамиды, стена с рунами, факелы
# ==========================================================================

def temple_sky():
    L = Layer('bg_temple_sky', 320, 150, wrap=False)
    dither_gradient(L, [(0.0, C('#151129')[:3]),
                        (0.7, C('#33254c')[:3]),
                        (1.0, C('#4a3160')[:3])], 150)
    return L


def temple_stars():
    rnd = mulberry32(7777 + 1)
    L = Layer('bg_temple_stars', 320, 100)           # параллакс 0.03
    for i in range(40):
        x = fl(rnd() * 320)
        y = fl(rnd() * (GY - 50))
        tw = rnd() * 6
        alpha = 0.35 + 0.65 * abs(math.sin(tw))      # статичная фаза мерцания
        col = C('#ebebd7', clampi(int(alpha * 255 + 0.5), 0, 255))
        L.rect(x, y, 1, 1, col)
        if alpha > 0.9:
            L.rect(x - 1, y, 3, 1, col)
            L.rect(x, y - 1, 1, 3, col)
    return L


def temple_moon():
    L = Layer('bg_temple_moon', 800, 48)             # параллакс 0.03, период 800
    moon_x = 70
    L.glow_rect(moon_x - 16, 12, 32, 32, C('#e8e0c8', 36))    # 0.14
    L.glow_rect(moon_x - 13, 15, 26, 26, C('#e8e0c8', 77))    # 0.3
    L.rect(moon_x - 10, 18, 20, 20, C('#e8e0c8'))
    L.rect(moon_x + 4, 20, 6, 6, C('#d5cdaf'))
    L.rect(moon_x - 6, 24, 4, 4, C('#c8c0a8'))
    L.rect(moon_x + 1, 30, 3, 3, C('#c8c0a8'))
    L.rect(moon_x - 8, 32, 2, 2, C('#c8c0a8'))
    return L


def temple_pyramids_far():
    rnd = mulberry32(7777 + 3)
    L = Layer('bg_temple_pyramids_far', 390, 156)    # параллакс 0.14, период 390
    base = GY + 3
    dark, light, stair = C('#211c38'), C('#282243'), C('#1a1630')
    for i in range(6):
        x = i * 64 + fl(rnd() * 24)
        w = 40 + fl(rnd() * 26)
        h = 26 + fl(rnd() * 22)
        taper_rows(L, x, base, w, h, 0.75,
                   lambda k: dark if k > h * 0.55 else light)
        for k in range(0, h, 4):                     # лестница по центру
            L.rect(x + jr(w / 2) - 2, base - k, 4, 1, stair)
    return L


def temple_pyramids():
    rnd = mulberry32(7777 + 4)
    L = Layer('bg_temple_pyramids', 430, 180)        # параллакс 0.3, период 430
    base = GY + 2
    step_hi, step_lo, step_edge = C('#3f3860'), C('#383156'), C('#443c68')
    stair = C('#54497a')
    shrine, roof_a, roof_b = C('#4a4170'), C('#332c50'), C('#2a2444')
    door_core, door_lite = C('#e0a53a'), C('#ffe9a8')
    snake, snake_eye = C('#54497a'), C('#c9a83e')
    for i in range(5):
        x = i * 78 + fl(rnd() * 26)
        w = 46 + fl(rnd() * 26)
        h = 34 + fl(rnd() * 26)
        door = rnd() > 0.4

        def col(k, h=h):
            if k % 4 == 0:
                return step_hi
            return step_lo if k > h * 0.5 else step_edge

        taper_rows(L, x, base, w, h, 0.7, col)
        for k in range(0, h, 3):                     # центральная лестница
            L.rect(x + jr(w / 2) - 3, base - k, 6, 1, stair)
        cx = x + w / 2
        L.rect(cx - 7, base - h - 9, 14, 10, shrine)
        L.rect(cx - 9, base - h - 11, 18, 3, roof_a)
        L.rect(cx - 5, base - h - 9, 10, 2, roof_b)
        if door:                                     # статичная «средняя» пульсация
            pulse = 0.55 + 0.45 * math.sin(x * 0.1)
            a = clampi(int((0.3 + pulse * 0.3) * 255 + 0.5), 0, 255)
            L.glow_rect(cx - 5, base - h - 6, 10, 7, C('#e0a53a', a))
            L.rect(cx - 3, base - h - 4, 6, 5, door_core)
            L.rect(cx - 2, base - h - 3, 4, 3, door_lite)
        L.rect(x - 4, base - 5, 6, 5, snake)
        L.rect(x + w - 2, base - 5, 6, 5, snake)
        L.rect(x - 3, base - 4, 2, 2, snake_eye)
        L.rect(x + w, base - 4, 2, 2, snake_eye)
    return L


def temple_wall():
    L = Layer('bg_temple_wall', 320, 24, y0=GY - 24, wrap=False)  # блоки: 0.55
    edge, body, block, seam = (C('#272238'), C('#2f2946'),
                               C('#373054'), C('#221d34'))
    wall_y = GY - 24                                  # 126
    L.rect(0, wall_y, 320, 4, edge)
    L.rect(0, wall_y + 4, 320, 20, body)
    for bx in range(0, 320 + 28, 28):                 # wallOff = 0 (статично)
        L.rect(bx, wall_y + 5, 12, 2, block)
        L.rect(bx + 6, wall_y + 9, 12, 2, block)
        L.rect(bx, wall_y + 13, 12, 2, block)
    L.rect(0, wall_y + 7, 320, 1, seam)
    L.rect(0, wall_y + 11, 320, 1, seam)
    return L


def temple_masks():
    rnd = mulberry32(7777 + 5)
    L = Layer('bg_temple_masks', 340, 20, y0=GY - 20)  # параллакс 0.55
    plate, inner = C('#4a4170'), C('#3a3358')
    pupil, teeth = C('#2a2444'), C('#e8edf5')
    glow_col = C('#ffd27a', 128)                       # rgba(255,210,122,0.5)
    my = GY - 20                                       # 130
    for i in range(5):
        x = i * 68 + fl(rnd() * 24)
        hue = C('#c9a83e') if rnd() > 0.5 else C('#7fae5a')
        glow = rnd() > 0.5
        L.rect(x, my, 14, 14, plate)
        L.rect(x + 2, my + 2, 10, 10, inner)
        L.rect(x + 3, my + 4, 3, 3, hue)
        L.rect(x + 8, my + 4, 3, 3, hue)
        L.rect(x + 4, my + 5, 1, 1, pupil)
        L.rect(x + 9, my + 5, 1, 1, pupil)
        L.rect(x + 4, my + 9, 6, 1, hue)
        L.rect(x + 5, my + 9, 1, 2, teeth)
        L.rect(x + 8, my + 9, 1, 2, teeth)
        if glow and math.sin(x * 0.2) > 0.2:           # статичное свечение
            L.rect(x + 2, my + 3, 5, 5, glow_col)
            L.rect(x + 7, my + 3, 5, 5, glow_col)
    return L


def temple_runes():
    rnd = mulberry32(7777 + 6)
    L = Layer('bg_temple_runes', 340, 8, y0=GY - 18)   # параллакс 0.55, y=132
    my = GY - 18                                       # 132
    for i in range(6):
        x = i * 57 + fl(rnd() * 30)
        kind = fl(rnd() * 3)
        glow = 0.22 + 0.18 * abs(math.sin(x * 0.3))     # статичное мерцание 0.22..0.40
        col = C('#e0a53a', clampi(int(glow * 255 + 0.5), 0, 255))
        if kind == 0:                                  # «I» с засечками
            L.rect(x, my, 1, 8, col)
            L.rect(x - 2, my, 5, 1, col)
            L.rect(x - 2, my + 7, 5, 1, col)
        elif kind == 1:                                # змейка «С»
            L.rect(x, my, 4, 1, col)
            L.rect(x + 1, my + 2, 2, 1, col)
            L.rect(x, my + 4, 4, 1, col)
            L.rect(x + 1, my + 6, 2, 1, col)
        else:                                          # «Н»
            L.rect(x, my, 1, 8, col)
            L.rect(x + 3, my, 1, 8, col)
            L.rect(x, my + 3, 4, 1, col)
    return L


def temple_columns():
    rnd = mulberry32(7777 + 7)
    L = Layer('bg_temple_columns', 370, 180)           # параллакс 0.68, период 370
    base = GY + 2
    trunk, lite, flute = C('#4a4e56'), C('#5a5f69'), C('#3a3d44')
    cap_a, cap_b, moss = C('#5a5f69'), C('#6a6f78'), C('#3e7a3a')
    for i in range(6):
        x = i * 58 + fl(rnd() * 20)
        h = 26 + fl(rnd() * 22)
        broken = rnd() > 0.35
        L.rect(x, base - h, 8, h, trunk)
        L.rect(x, base - h, 3, h, lite)
        for f in range(4):
            L.rect(x + 5, base - h + 4 + f * 7, 1, 4, flute)
        if broken:
            L.rect(x + 2, base - h - 3, 4, 3, flute)
            L.rect(x + 4, base - h - 4, 3, 2, lite)
        else:
            L.rect(x - 2, base - h - 4, 12, 4, cap_a)
            L.rect(x - 2, base - h - 4, 12, 1, cap_b)
        L.rect(x, base - 2, 3, 2, moss)
    return L


def temple_torches():
    rnd = mulberry32(7777 + 8)
    L = Layer('bg_temple_torches', 460, 40, y0=GY - 36)  # параллакс 0.8, y=114
    base = GY - 22                                       # 128
    holder, holder_t, holder_b = C('#5c4a30'), C('#6a563a'), C('#3d3122')
    flame, inner, lite, core = (C('#c94f1e'), C('#e07a2e'),
                                C('#ffd27a'), C('#fff3c8'))
    for i in range(6):
        x = i * 56 + fl(rnd() * 20)
        pulse = 0.16 + 0.06 * math.sin(x)               # статичный свет
        a = clampi(int(pulse * 255 + 0.5), 0, 255)
        L.glow_rect(x - 7, base - 14, 20, 20, C('#ffaa50', a))
        L.rect(x + 1, base, 3, 12, holder)
        L.rect(x, base, 5, 2, holder_t)
        L.rect(x + 1, base + 10, 3, 2, holder_b)
        fl_ = i % 3                    # фаза статичная, но разная у объектов
        L.rect(x, base - 7 - fl_, 5, 8 + fl_, flame)
        L.rect(x + 1, base - 5 - fl_, 3, 6, inner)
        L.rect(x + 1, base - 4, 3, 3, lite)
        L.rect(x + 2, base - 3, 1, 2, core)
    return L


def temple_vines():
    rnd = mulberry32(7777 + 9)
    L = Layer('bg_temple_vines', 340, 44)               # «сверху», параллакс 0.9
    stem_a, stem_b = C('#26502e'), C('#357040')
    leaf, knot = C('#2b6b31'), C('#1f4f26')
    for i in range(9):
        x = i * 44 + fl(rnd() * 16)
        ln = 16 + fl(rnd() * 26)
        sway = jr(math.sin(x * 0.2) * 3)                # статичная поза качания
        L.rect(x + sway, 0, 2, ln, stem_a)
        L.rect(x + 6 - sway, 0, 2, ln - 6, stem_b)
        L.rect(x - 2 + sway, ln - 4, 5, 4, leaf)
        L.rect(x + 5 - sway, ln - 9, 4, 3, leaf)
        L.rect(x + sway, jr(ln * 0.5), 2, 2, knot)
    return L


def temple_skulls():
    rnd = mulberry32(7777 + 10)
    L = Layer('bg_temple_skulls', 330, 145, y0=8)       # параллакс 0.9
    base = GY + 2
    skull, jaw, eye, stone = C('#c8c0a8'), C('#a8a08a'), C('#2a2444'), C('#4a4e56')
    for i in range(4):
        x = i * 93 + fl(rnd() * 34)
        flip = rnd() > 0.5
        L.rect(x, base - 6, 6, 5, skull)
        L.rect(x, base - 2, 6, 1, jaw)
        L.rect(x + 1, base - 5, 1, 2, eye)
        L.rect(x + 4, base - 5, 1, 2, eye)
        L.rect(x + (-5 if flip else 7), base - 2, 3, 2, stone)
    return L


def temple_rubble():
    rnd = mulberry32(7777 + 11)
    L = Layer('fg_temple_rubble', 90, 9, y0=GY + 2)     # параллакс 1.15, период 90
    col = C('#241f36')
    for i in range(6):
        x = i * 15 + fl(rnd() * 6)
        y = GY + 2 + (i % 3) * 3
        L.rect(x, y, 4 + (i % 4) * 2, 3, col)
    return L


def temple_vignette():
    L = Layer('fg_temple_vignette', 320, 180, wrap=False)
    dark = C('#141024', 217)                            # rgba(20,16,36,0.85)
    soft = C('#141024', 89)                             # rgba(20,16,36,0.35)
    L.rect(0, 0, 6, 180, dark)
    L.rect(320 - 6, 0, 6, 180, dark)
    L.rect(6, 0, 4, 180, soft)
    L.rect(320 - 10, 0, 4, 180, soft)
    return L


def gen_temple():
    """Порядок drawBackground (§7.3): sky, stars, moon, pyramids_far,
    pyramids, wall, masks, runes, columns, torches, vines, skulls.
    Плюс foreground: rubble, vignette."""
    bg = [temple_sky(), temple_stars(), temple_moon(), temple_pyramids_far(),
          temple_pyramids(), temple_wall(), temple_masks(), temple_runes(),
          temple_columns(), temple_torches(), temple_vines(), temple_skulls()]
    fg = [temple_rubble(), temple_vignette()]
    return bg, fg


# ==========================================================================
# Тайлы земли (§8.1, §11C): 4 варианта 16x16 -> полоса 64x16
# ==========================================================================

GROUND_COLORS = {
    'jungle': ('#2f6b28', '#4e9a3f', '#6b4a25', '#54381b'),
    'village': ('#5c381b', '#b98a4b', '#8a5a2e', '#6e4522'),
    'temple': ('#8a9099', '#6a6f78', '#4a4e56', '#3a3d44'),
}


def gen_tiles(biome):
    line, top, dirt, shade = (C(c) for c in GROUND_COLORS[biome])
    img = Image.new('RGBA', (64, 16), (0, 0, 0, 0))
    px = img.load()

    def fill(x, y, w, h, col):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                px[xx, yy] = col

    for cell in range(4):
        ox = cell * 16
        if cell < 3:
            fill(ox, 0, 16, 2, line)        # кромка травы/камня (y0..1)
            fill(ox, 2, 16, 6, top)         # верхний слой (y2..7)
            fill(ox, 8, 16, 8, dirt)        # грунт (y8..15)
        else:
            fill(ox, 0, 16, 16, dirt)       # чистый грунт (нижние ряды)
        if cell == 0:
            fill(ox + 4, 12, 7, 3, shade)   # крапинка 7x3
        elif cell == 1:
            fill(ox + 6, 12, 4, 2, shade)   # крапинка 4x2
    path = os.path.join(OUT_TILES, 'tiles_%s.png' % biome)
    img.save(path)
    return img, path


# ==========================================================================
# Контрольные превью
# ==========================================================================

def composite_biome(biome, bg_layers, fg_layers, tiles_img, path, scale=2):
    """Сборка кадра 320x180, как в игре (§1.5): фон -> земля -> foreground."""
    img = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    for L in bg_layers:
        img.alpha_composite(L.img, (0, L.y0))
    # земля: верхний ряд — варианты 0/2/1/2, ниже — чистый грунт (вариант 3)
    pattern = (0, 2, 1, 2)
    for col in range(CANVAS_W // 16 + 1):
        v = pattern[col % len(pattern)]
        cell = tiles_img.crop((v * 16, 0, v * 16 + 16, 16))
        img.paste(cell, (col * 16, GY), cell)
    fill_cell = tiles_img.crop((48, 0, 64, 16))
    for row_y in (GY + 16, GY + 32):
        for col in range(CANVAS_W // 16 + 1):
            img.paste(fill_cell, (col * 16, row_y), fill_cell)
    for L in fg_layers:
        img.alpha_composite(L.img, (0, L.y0))
    img = img.resize((CANVAS_W * scale, CANVAS_H * scale), Image.NEAREST)
    img.save(path)
    return path


def tiles_preview(tiles, path, scale=4):
    """Полосы тайлов трёх биомов, увеличенные ×4, на тёмном фоне."""
    gap, pad = 8, 4
    strip_w, strip_h = 64 * scale, 16 * scale
    w = strip_w + pad * 2
    h = (strip_h + gap) * len(tiles) + gap
    img = Image.new('RGBA', (w, h), C('#141220'))
    y = gap
    for biome, t in tiles:
        big = t.resize((strip_w, strip_h), Image.NEAREST)
        img.paste(big, (pad, y), big)
        y += strip_h + gap
    img.save(path)
    return path


def seam_check(L):
    """Эвристика X-тайлинга: наборы непрозрачных строк у левого и правого
    краёв должны совпадать (элемент, пересекающий границу, появляется на
    обоих краях). Для элементных слоёв это ловит незавернутые элементы."""
    px = L.img.load()
    left = set(y for y in range(L.h) if px[0, y][3] > 0)
    right = set(y for y in range(L.h) if px[L.w - 1, y][3] > 0)
    return left == right, len(left), len(right)


def seam_preview(L, path, scale=2, bg='#202028'):
    """Слой, наложенный сам на себя со сдвигом на ширину — шов посередине."""
    img = Image.new('RGBA', (L.w * 2, L.h), C(bg))
    img.alpha_composite(L.img, (0, 0))
    img.alpha_composite(L.img, (L.w, 0))
    img = img.resize((L.w * 2 * scale, L.h * scale), Image.NEAREST)
    img.save(path)
    return path


# ==========================================================================
# main
# ==========================================================================

def main():
    os.makedirs(OUT_BG, exist_ok=True)
    os.makedirs(OUT_TILES, exist_ok=True)
    os.makedirs(OUT_PREVIEW, exist_ok=True)
    os.makedirs(OUT_SEAMS, exist_ok=True)

    manifest = []     # (имя, ширина, высота, y0)
    seam_report = []  # (имя, ok, left, right)

    all_biomes = {}
    for biome, gen in (('jungle', gen_jungle),
                       ('village', gen_village),
                       ('temple', gen_temple)):
        bg_layers, fg_layers = gen()
        all_biomes[biome] = (bg_layers, fg_layers)
        for L in bg_layers + fg_layers:
            L.save(OUT_BG)
            manifest.append((L.name + '.png', L.w, L.h, L.y0, L.elements))
            if L.wrap and L.w <= 500:
                ok, nl, nr = seam_check(L)
                seam_report.append((L.name, ok, nl, nr))
                seam_preview(L, os.path.join(OUT_SEAMS, 'seam_%s.png' % L.name))

    tiles = {}
    for biome in ('jungle', 'village', 'temple'):
        t, path = gen_tiles(biome)
        tiles[biome] = t
        manifest.append((os.path.basename(path), t.width, t.height, 0, 4))

    for biome in ('jungle', 'village', 'temple'):
        bg_layers, fg_layers = all_biomes[biome]
        composite_biome(biome, bg_layers, fg_layers, tiles[biome],
                        os.path.join(OUT_PREVIEW,
                                     'preview_composite_%s.png' % biome))

    tiles_preview([(b, tiles[b]) for b in ('jungle', 'village', 'temple')],
                  os.path.join(OUT_PREVIEW, 'preview_tiles.png'))

    print('=== Manifest (PNG, логические пиксели) ===')
    for name, w, h, y0, n in manifest:
        extra = '  y0=%d' % y0 if y0 else ''
        print('%-34s %4dx%-4d%s  rect=%d' % (name, w, h, extra, n))

    print('\n=== Проверка X-тайлинга (левый/правый край: непрозрачные строки) ===')
    bad = 0
    for name, ok, nl, nr in seam_report:
        status = 'OK ' if ok else 'DIFF'
        if not ok:
            bad += 1
        print('%-8s %-32s left=%d right=%d' % (status, name, nl, nr))
    print('всего слоёв с проверкой: %d, расхождений: %d '
          '(DIFF допустим, если элемент только касается края — '
          'см. preview_bg/seams/)' % (len(seam_report), bad))


if __name__ == '__main__':
    main()
