#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор спрайтов препятствий, статуй, шипов и декора Jungle Run (Pillow).

Стиль: 8-битный пиксель-арт, попиксельная отрисовка без anti-aliasing.
Контракт: tools/artgen/SPEC.md §4 (препятствия), §7.4 (декор).
Размеры ячеек (в арт-пикселях; игровой масштаб x2 => логический размер = арт/2):
  log1/log2/vine1   48x18   (24x9)   — подвешенные брёвна/жгут лиан
  ropetrap          56x24   (28x12)  — верёвка-ловушка между столбами
  statue            24x60   (12x30)  — каменный тотем майя
  spikes            16x14   (8x7)    — ячейка шипов (ширина = клеток x 8)
  stonebeam         48x16   (24x8)   — упавшая балка колонны
  diamond           28x20x2 (14x10)  — бриллиант за прохождение локации
  decor_mushroom     6x8    (3x4), decor_fern 8x10 (4x5), decor_skull 6x8 (3x4),
  decor_rune         4x8x3  (2x4), decor_butterfly 8x6x2 (4x3)

Запуск:  python tools/artgen/gen_obstacles.py
Выход:   godot/assets/sprites/*.png  +  tools/artgen/preview/preview_obstacles.png
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "godot" / "assets" / "sprites"
PREVIEW = ROOT / "tools" / "artgen" / "preview"

# ---------------------------------------------------------------- палитры

K = (20, 18, 32, 255)        # контур
# дерево
W1 = (160, 118, 66, 255)
W2 = (132, 92, 48, 255)
W3 = (86, 60, 32, 255)
W4 = (58, 40, 22, 255)
WR = (186, 146, 92, 255)     # блик дерева
# верёвка/ткань
R1 = (217, 179, 130, 255)
R2 = (165, 138, 95, 255)
BONE = (207, 199, 174, 255)  # кость
# камень
S1 = (150, 156, 167, 255)
S2 = (112, 118, 129, 255)
S3 = (78, 83, 93, 255)
S4 = (52, 56, 64, 255)
SH = (186, 192, 202, 255)    # блик камня
# металл шипов
M1 = (232, 237, 245, 255)
M2 = (194, 201, 212, 255)
M3 = (154, 163, 173, 255)
# зелень
G1 = (96, 162, 72, 255)
G2 = (63, 122, 58, 255)
G3 = (38, 82, 36, 255)
GL = (128, 190, 92, 255)
# золото/охра
AU = (201, 131, 46, 255)
AU2 = (143, 111, 20, 255)
AUL = (235, 176, 78, 255)
# бриллиант
D1 = (140, 224, 255, 255)
D2 = (66, 168, 224, 255)
D3 = (30, 110, 168, 255)
# бабочка
O1 = (232, 132, 42, 255)
O2 = (176, 88, 26, 255)


# ---------------------------------------------------------------- холст

class Canvas:
    """Маленький RGBA-холст с попиксельными примитивами."""

    def __init__(self, w: int, h: int):
        self.w = w
        self.h = h
        self.img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def px(self, x, y, col):
        xi, yi = int(x), int(y)
        if 0 <= xi < self.w and 0 <= yi < self.h:
            self.img.putpixel((xi, yi), col)

    def rect(self, x, y, w, h, col):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.px(xx, yy, col)

    def hline(self, x, y, w, col):
        self.rect(x, y, w, 1, col)

    def vline(self, x, y, h, col):
        self.rect(x, y, 1, h, col)

    def outl(self):
        """Тёмный контур по внешнему краю непрозрачных пикселей."""
        src = self.img.copy()
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3] == 0:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < self.w and 0 <= ny < self.h):
                        continue
                    if src.getpixel((nx, ny))[3] == 0:
                        self.px(nx, ny, K)


def strip(frames):
    w = sum(f.w for f in frames)
    h = frames[0].h
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = 0
    for f in frames:
        out.paste(f.img, (x, 0))
        x += f.w
    return out


def preview(made: dict, path: Path, scale: int = 4, gap: int = 8) -> Path:
    """Контрольный лист увеличенных спрайтов."""
    items = list(made.items())
    cols = 4
    rows = (len(items) + cols - 1) // cols
    cell_w = max(im.width for _, im in items) * scale + gap * 2
    cell_h = max(im.height for _, im in items) * scale + gap * 2 + 10
    sheet = Image.new("RGBA", (cell_w * cols, cell_h * rows), (40, 36, 52, 255))
    for i, (name, im) in enumerate(items):
        cx = (i % cols) * cell_w + gap
        cy = (i // cols) * cell_h + gap
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        sheet.paste(big, (cx, cy), big)
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)
    return path


# ---------------------------------------------------------------- брёвна/жгуты

def _ropes(c: Canvas, x_left: int, x_right: int, top_h: int, col1, col2) -> None:
    """Плетёные подвесы (верёвки/стебли) от верха кадра до бревна."""
    for xx in (x_left, x_right):
        for y in range(top_h):
            shade = col1 if (y // 2) % 2 == 0 else col2
            c.vline(xx, y, 1, shade)
            c.vline(xx + 1, y, 1, col2 if shade == col1 else col1)
        # узел-мятина
        c.rect(x_left - 1 if xx == x_left else x_right - 1, top_h - 3, 4, 2, col2)


def gen_log1() -> Canvas:
    """Деревянное бревно на верёвках: видны оба торца с годовыми кольцами."""
    c = Canvas(48, 18)
    _ropes(c, 5, 40, 6, R1, R2)
    # торцы: слева и справа «круги» с годовыми кольцами
    for ex in (0, 44):
        c.rect(ex, 8, 4, 8, W2)
        c.rect(ex + 1, 9, 2, 6, W1)
        c.px(ex + 1, 10, W3)
        c.px(ex + 2, 12, W3)
        c.px(ex + 1, 14, W3)
        c.vline(ex + 3, 8, 8, W3)
    # тело бревна
    c.hline(4, 7, 40, K)                 # верхний контур
    c.hline(4, 8, 40, WR)                # блик
    for y in range(9, 15):
        c.hline(4, y, 40, W2)
    for x in range(6, 44, 5):            # вертикальные полосы коры
        c.vline(x, 9, 5, W3)
        c.px(x + 1, 10 + (x % 3), W3)
    # узлы-наросты
    for nx in (14, 30):
        c.rect(nx, 10, 3, 3, W3)
        c.px(nx + 1, 10, W1)
    c.hline(4, 15, 40, W3)
    c.hline(4, 16, 40, W4)
    c.hline(4, 17, 40, K)                # тёмный контур снизу (требование)
    c.outl()
    return c


def gen_log2() -> Canvas:
    """Каменное бревно-«каток» храма: резные каннелюры и трещины."""
    c = Canvas(48, 18)
    _ropes(c, 5, 40, 6, R1, R2)
    for ex in (0, 44):
        c.rect(ex, 8, 4, 8, S2)
        c.rect(ex + 1, 9, 2, 6, S1)
        c.px(ex + 1, 11, S3)
        c.px(ex + 2, 13, S3)
        c.vline(ex + 3, 8, 8, S3)
    c.hline(4, 7, 40, K)
    c.hline(4, 8, 40, SH)
    for y in range(9, 15):
        c.hline(4, y, 40, S2)
    for x in range(6, 44, 4):            # каннелюры
        c.vline(x, 9, 5, S3)
    c.px(12, 11, S4)                     # трещины
    c.px(13, 12, S4)
    c.px(14, 13, S4)
    c.px(29, 10, S4)
    c.px(30, 11, S4)
    c.px(31, 12, S4)
    c.hline(4, 15, 40, S3)
    c.hline(4, 16, 40, S4)
    c.hline(4, 17, 40, K)
    c.outl()
    return c


def gen_vine1() -> Canvas:
    """Жгут из лиан: свисающие стебли и листья-маски каждые 6px."""
    c = Canvas(48, 18)
    # стебли-подвесы (5 штук) с лёгким смещением — «живые» лианы
    for i, sx in enumerate((4, 13, 22, 31, 40)):
        top = 0
        bottom = 8 + (i % 2)
        for y in range(top, bottom):
            c.vline(sx, y, 1, G2 if y % 2 == 0 else G3)
            c.vline(sx + 1, y, 1, G3 if y % 2 == 0 else G2)
    c.hline(0, 8, 48, K)                 # верх жгута
    c.hline(0, 9, 48, G1)
    for y in range(10, 15):
        c.hline(0, y, 48, G2)
    # листья-маски каждые 6px
    for lx in range(2, 48, 6):
        c.rect(lx, 10, 4, 3, G1)         # лист
        c.vline(lx + 1, 10, 3, G2)       # прожилка
        c.px(lx, 13, G3)
        c.px(lx + 3, 13, G3)
        c.px(lx + 2, 9, GL)              # роса-блик
    c.hline(0, 15, 48, G3)
    c.hline(0, 16, 48, G3)
    c.hline(0, 17, 48, K)                # тёмный контур снизу
    c.outl()
    return c


def gen_rope() -> Canvas:
    """Верёвка-ловушка: два резных столба и провисшая верёвка."""
    c = Canvas(56, 24)
    for px0 in (0, 50):
        # столб
        c.rect(px0 + 1, 5, 4, 19, W2)
        c.vline(px0 + 1, 5, 19, W1)
        c.vline(px0 + 4, 5, 19, W3)
        c.vline(px0 + 5, 5, 19, W4)
        # резное навершие (ступенчатый узор охрой)
        c.rect(px0, 0, 6, 2, AU)
        c.rect(px0 + 1, 2, 4, 2, AU2)
        c.px(px0 + 2, 2, AUL)
        c.rect(px0 + 2, 4, 2, 2, AU2)
        c.px(px0, 1, AU2)
        c.px(px0 + 5, 1, AU2)
    # провисшая верёвка (дуга от столбов к центру)
    for x in range(6, 50):
        t = (x - 6) / 44.0
        sag = int(round(math.sin(t * math.pi) * 3.0))
        c.px(x, 8 + sag, R1)
        c.px(x, 9 + sag, R2)
        c.px(x, 10 + sag, K)             # контур снизу
        if x % 7 == 0:                   # узлы
            c.px(x, 7 + sag, R2)
            c.px(x + 1, 9 + sag, R1)
    c.outl()
    return c


# ---------------------------------------------------------------- храм

def _mask(c: Canvas, cx: int, top: int, h_m: int, wide: int, mood: int) -> None:
    """Каменная маска тотема: глаза-щели, нос-колонна, рот с зубами."""
    x0 = cx - wide // 2
    c.rect(x0, top, wide, h_m, S1)
    c.vline(x0, top, h_m, SH)            # блик слева (боковой свет)
    c.vline(x0 + wide - 1, top, h_m, S3)
    # брови
    c.hline(x0 + 2, top + 2, wide - 4, S3)
    # глаза
    eye_y = top + 4
    c.rect(x0 + 2, eye_y, 3, 2, S4)
    c.rect(x0 + wide - 5, eye_y, 3, 2, S4)
    c.px(x0 + 3, eye_y, AU if mood == 0 else K)
    c.px(x0 + wide - 4, eye_y, AU if mood == 0 else K)
    # нос
    nose_w = 2 if wide >= 16 else 1
    c.rect(cx - nose_w // 2, top + 3, nose_w, h_m - 8, S2)
    c.vline(cx - nose_w // 2, top + 3, h_m - 8, S3)
    # рот и клыки
    mouth_y = top + h_m - 4
    c.hline(x0 + 2, mouth_y, wide - 4, S4)
    for tx in range(x0 + 3, x0 + wide - 3, 3):
        c.rect(tx, mouth_y + 1, 1, 2, S3)


def gen_statue() -> Canvas:
    """Тотем майя 12x30 (арт 24x60): шапка + три маски-яруса + основание."""
    c = Canvas(24, 60)
    # ступенчатая шапка
    c.rect(10, 0, 4, 2, AU)              # гребень
    c.rect(6, 2, 12, 2, S1)
    c.rect(3, 4, 18, 2, S2)
    c.hline(3, 4, 18, SH)
    c.rect(1, 6, 22, 2, S3)
    # верхняя маска (крупная, «лицо»)
    _mask(c, 12, 8, 17, 20, mood=0)
    c.rect(0, 12, 2, 9, S2)              # боковые уступы
    c.rect(22, 12, 2, 9, S2)
    c.vline(0, 12, 9, SH)
    c.vline(23, 12, 9, S3)
    # средняя маска
    _mask(c, 12, 25, 15, 16, mood=1)
    # основание-ступени
    c.rect(1, 40, 22, 6, S2)
    c.hline(1, 40, 22, SH)
    c.rect(0, 46, 24, 6, S3)
    c.hline(0, 46, 24, S2)
    c.rect(0, 52, 24, 7, S2)
    c.hline(0, 52, 24, SH)
    # трещины и нижний контур
    c.px(6, 43, S4)
    c.px(7, 44, S4)
    c.px(17, 54, S4)
    c.px(16, 55, S4)
    c.hline(0, 59, 24, K)
    c.outl()
    return c


def gen_spikes() -> Canvas:
    """Ячейка шипов 8x7 (арт 16x14): треугольные острия на каменной подложке."""
    c = Canvas(16, 14)
    # подложка
    c.hline(0, 11, 16, S3)
    c.hline(0, 12, 16, S4)
    c.hline(0, 13, 16, K)
    for sx in (0, 8):                    # два острия по 8px
        cx = sx + 4
        for k in range(11):              # строки от вершины к основанию
            y = k
            half = k // 2 + (1 if k > 1 else 0)
            x0 = cx - half
            x1 = cx + half
            for x in range(x0, x1 + 1):
                if x == x0:
                    col = M1            # левый склон — светлый
                elif x == x1:
                    col = M3            # правый — тёмный
                elif x <= cx:
                    col = M2
                else:
                    col = M3
                c.px(x, y, col)
        c.px(cx, 0, M1)                  # кончик-блик
    c.outl()
    return c


def gen_beam() -> Canvas:
    """Упавшая каменная балка 24x8 (арт 48x16): каннелюры и трещина."""
    c = Canvas(48, 16)
    c.hline(0, 0, 48, SH)                # верхняя грань
    c.hline(0, 1, 48, S1)
    for y in range(2, 14):
        c.hline(0, y, 48, S1 if y < 5 else S2)
    for x in range(4, 48, 8):            # резные каннелюры
        c.rect(x, 3, 2, 9, S3)
        c.vline(x + 2, 3, 9, S4)
    # трещина
    for i, (tx, ty) in enumerate(((19, 3), (20, 4), (20, 5), (21, 6), (21, 7), (22, 8))):
        c.px(tx, ty, S4)
        if i % 2 == 0:
            c.px(tx + 1, ty, S3)
    c.hline(0, 14, 48, S3)
    c.hline(0, 15, 48, K)
    c.outl()
    return c


# ---------------------------------------------------------------- бриллиант

def gen_diamond(frame: int) -> Canvas:
    """Бриллиант 14x10 (арт 28x20): два кадра мерцания граней."""
    c = Canvas(28, 20)
    rows = [
        (6, 16),   # корона: узкая площадка
        (4, 18),
        (2, 20),
        (1, 21),
        (0, 22),
    ]
    # корона (трапеция сверху)
    for i, (x0, wdt) in enumerate(rows):
        c.hline(x0, i, wdt, D2 if i % 2 == 0 else D1)
    # павильон (нижний конус)
    total = 10
    for i in range(total):
        y = 5 + i
        shrink = int(round((i + 1) / total * 11.0))
        x0 = 1 + shrink
        wdt = 26 - shrink * 2
        if wdt <= 0:
            continue
        col = D3 if i % 2 == 0 else D2
        c.hline(x0, y, wdt, col)
    # грани: вертикальные рёбра
    for rx in (7, 14, 21):
        for y in range(0, 14):
            c.px(rx, y, D1 if (rx == 14) == (frame == 0) else D2)
    # блик на грани
    if frame == 0:
        c.px(9, 4, (240, 252, 255, 255))
        c.px(10, 4, (240, 252, 255, 255))
        c.px(9, 5, D1)
    else:
        c.px(18, 6, (240, 252, 255, 255))
        c.px(19, 7, (240, 252, 255, 255))
    c.outl()
    return c


# ---------------------------------------------------------------- декор

def gen_mushroom() -> Canvas:
    """Гриб 3x4 (арт 6x8): тёплая шляпка с крапинками."""
    c = Canvas(6, 8)
    c.hline(1, 0, 4, W1)                 # шляпка
    c.hline(0, 1, 6, W2)
    c.hline(0, 2, 6, W2)
    c.px(1, 1, WR)                       # крапинки
    c.px(4, 2, WR)
    c.px(2, 2, W1)
    c.hline(0, 3, 6, W3)                 # низ шляпки
    c.rect(2, 4, 2, 3, R1)               # ножка
    c.vline(3, 4, 3, R2)
    c.hline(1, 7, 4, K)                  # тень снизу
    c.outl()
    return c


def gen_fern() -> Canvas:
    """Папоротник 4x5 (арт 8x10): веер перистых листьев."""
    c = Canvas(8, 10)
    # листья-перья симметрично от центра
    for i, (lx, rx, y) in enumerate(((3, 4, 1), (2, 5, 2), (1, 6, 3), (0, 7, 4),
                                     (1, 6, 5), (2, 5, 6))):
        col = G1 if i % 2 == 0 else G2
        c.px(lx, y, col)
        c.px(rx, y, col)
        if y >= 2:
            c.px(lx, y + 1, G3)
            c.px(rx, y + 1, G3)
    c.vline(3, 6, 3, G3)                 # стебель
    c.vline(4, 6, 3, G2)
    c.hline(3, 9, 2, K)
    c.px(4, 0, GL)                       # блик верхушки
    c.outl()
    return c


def gen_skull() -> Canvas:
    """Череп 3x4 (арт 6x8): жуткий маркер кладбища."""
    c = Canvas(6, 8)
    c.rect(0, 0, 6, 4, BONE)             # черепная коробка
    c.hline(1, 0, 4, (230, 224, 202, 255))
    c.rect(1, 1, 1, 2, K)                # глазницы
    c.rect(4, 1, 1, 2, K)
    c.px(3, 1, K)
    c.px(2, 3, K)                        # нос
    c.rect(1, 4, 4, 3, BONE)             # челюсть
    c.vline(2, 4, 3, K)                  # зубы
    c.vline(4, 4, 3, K)
    c.hline(0, 7, 6, K)
    c.outl()
    return c


def gen_rune(frame: int) -> Canvas:
    """Руна 2x4 (арт 4x8): три фазы свечения на камне."""
    c = Canvas(4, 8)
    c.rect(0, 0, 4, 8, S2)               # плита
    c.vline(0, 0, 8, S1)
    c.vline(3, 0, 8, S3)
    glow = (AU2, AU, AUL)[frame]
    # узор-«ключ»
    c.px(1, 1, glow)
    c.px(2, 1, glow)
    c.px(2, 2, glow)
    c.px(1, 3, glow)
    c.px(2, 4, glow)
    c.px(1, 5, glow)
    c.px(1, 6, glow)
    if frame == 2:                       # вспышка
        c.px(3, 3, SH)
        c.px(0, 5, SH)
    c.hline(0, 7, 4, K)
    c.outl()
    return c


def gen_butterfly(frame: int) -> Canvas:
    """Бабочка 4x3 (арт 8x6): крылья вверх/вниз."""
    c = Canvas(8, 6)
    if frame == 0:                       # крылья подняты
        c.rect(0, 0, 3, 2, O1)           # верхние доли
        c.rect(5, 0, 3, 2, O1)
        c.rect(1, 2, 2, 1, O2)           # нижние
        c.rect(5, 2, 2, 1, O2)
    else:                                # крылья опущены
        c.rect(0, 1, 3, 2, O1)
        c.rect(5, 1, 3, 2, O1)
        c.rect(1, 3, 2, 1, O2)
        c.rect(5, 3, 2, 1, O2)
    c.px(1, 0 if frame == 0 else 1, K)   # крапинки
    c.px(6, 0 if frame == 0 else 1, K)
    c.vline(3, 1, 3, K)                  # тело
    c.vline(4, 1, 3, K)
    c.px(3, 0, K)                        # усики
    c.px(4, 0, K)
    c.outl()
    return c


# ---------------------------------------------------------------- сборка

def main() -> None:
    made = {}
    sheets = {
        "log1": [gen_log1()],
        "log2": [gen_log2()],
        "vine1": [gen_vine1()],
        "ropetrap": [gen_rope()],
        "statue": [gen_statue()],
        "spikes": [gen_spikes()],
        "stonebeam": [gen_beam()],
        "diamond": [gen_diamond(0), gen_diamond(1)],
        "decor_mushroom": [gen_mushroom()],
        "decor_fern": [gen_fern()],
        "decor_skull": [gen_skull()],
        "decor_rune": [gen_rune(0), gen_rune(1), gen_rune(2)],
        "decor_butterfly": [gen_butterfly(0), gen_butterfly(1)],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for name, frames in sheets.items():
        im = strip(frames)
        im.save(OUT / f"{name}.png")
        made[name] = im
        print(f"  {name}.png: {im.width}x{im.height}")
    p = preview(made, PREVIEW / "preview_obstacles.png", scale=4)
    print(f"preview -> {p}")


if __name__ == "__main__":
    main()
