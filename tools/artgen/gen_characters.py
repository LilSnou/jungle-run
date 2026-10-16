#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор спрайт-листов персонажей, врагов и предметов Jungle Run (Pillow).

Стиль: 8-битный пиксель-арт, попиксельная отрисовка без anti-aliasing.
Контракт: tools/artgen/SPEC.md §8 (спрайт-листы).
Размеры ячеек (арт-пиксели, игровой масштаб x2):
  player_run 16x18x8, jump/slide/hurt/dead 16x18,
  player_stand_{jungle,village,temple} 16x18 — стойка в палитре локации,
  snake 14x14x4, bat 14x8x4, jaguar 16x14x6, warrior 16x15x4,
  idol 8x8x4, spear 12x4.

Запуск:  python tools/artgen/gen_characters.py
Выход:   godot/assets/sprites/*.png  +  tools/artgen/preview/preview_characters.png
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from gen_obstacles import Canvas, preview  # общий холст и контрольный лист

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "godot" / "assets" / "sprites"
PREVIEW = ROOT / "tools" / "artgen" / "preview"

K = (20, 18, 32, 255)  # контур

# --- игрок: одежда исследователя (джунгли) ---
SKIN = (239, 192, 142, 255)
SKIN_D = (203, 150, 102, 255)
HAIR = (74, 53, 32, 255)
HAT = (196, 158, 96, 255)
HAT_D = (146, 110, 60, 255)
HAT_L = (222, 190, 130, 255)
SHIRT = (110, 120, 66, 255)
SHIRT_L = (134, 144, 84, 255)
SHIRT_D = (80, 90, 48, 255)
PANTS = (96, 70, 44, 255)
PANTS_D = (70, 50, 32, 255)
BOOT = (54, 40, 28, 255)
PACK = (140, 96, 52, 255)
PACK_D = (104, 70, 38, 255)
BAND = (178, 54, 46, 255)  # красная бандана
GOLD = (232, 184, 37, 255)
EYE_P = (42, 36, 68, 255)

# Палитры стойки по локациям (маска — золотое лицо храма).
PALS = {
    "jungle": {
        "shirt": SHIRT, "shirt_l": SHIRT_L, "shirt_d": SHIRT_D,
        "pants": PANTS, "pants_d": PANTS_D,
        "hat": HAT, "hat_l": HAT_L, "hat_d": HAT_D,
        "boot": BOOT, "mask": None, "band": BAND, "belt": PANTS_D,
    },
    "village": {  # белая рубаха и набедренная юбка
        "shirt": (239, 232, 213, 255), "shirt_l": (252, 248, 235, 255),
        "shirt_d": (200, 190, 168, 255),
        "pants": (138, 58, 46, 255), "pants_d": (104, 42, 34, 255),
        "hat": (178, 54, 46, 255), "hat_l": (214, 84, 74, 255),
        "hat_d": (128, 38, 34, 255),
        "boot": (90, 62, 40, 255), "mask": None, "band": (240, 214, 120, 255),
        "belt": (201, 131, 46, 255),
    },
    "temple": {  # льняной комплект и золотая маска
        "shirt": (238, 230, 206, 255), "shirt_l": (252, 248, 232, 255),
        "shirt_d": (196, 184, 152, 255),
        "pants": (232, 222, 196, 255), "pants_d": (188, 176, 144, 255),
        "hat": (232, 184, 37, 255), "hat_l": (255, 247, 200, 255),
        "hat_d": (143, 111, 20, 255),
        "boot": (120, 96, 60, 255), "mask": (232, 184, 37, 255),
        "band": (143, 111, 20, 255), "belt": (201, 131, 46, 255),
    },
}

# --- змея ---
VG_DARK = (38, 82, 36, 255)
VG_MID = (63, 122, 58, 255)
VG_LIGHT = (96, 162, 72, 255)
VG_BELLY = (188, 196, 116, 255)
TONGUE = (214, 60, 70, 255)
EYE_W = (240, 240, 236, 255)

# --- летучая мышь ---
BAT_MID = (88, 72, 110, 255)
BAT_DARK = (62, 50, 80, 255)
BAT_LIGHT = (116, 98, 140, 255)
BAT_EYE = (224, 84, 74, 255)

# --- ягуар ---
JAG = (204, 146, 74, 255)
JAG_L = (228, 180, 110, 255)
JAG_D = (158, 106, 52, 255)
JAG_SPOT = (74, 53, 32, 255)
JAG_BELLY = (238, 214, 170, 255)

# --- воин ---
W_SKIN = (168, 112, 63, 255)
W_SKIN_D = (130, 84, 46, 255)
W_SKIRT = (217, 178, 106, 255)
W_SKIRT_D = (180, 140, 80, 255)
W_FEATHER = (178, 54, 46, 255)
W_FEATHER2 = (217, 197, 52, 255)
W_SPEAR = (104, 70, 38, 255)
W_SPEAR_D = (74, 53, 32, 255)
W_METAL = (200, 204, 216, 255)
PAINT = (239, 227, 200, 255)

# --- предметы ---
L_DARK = (143, 111, 20, 255)
L_GOLD = (232, 184, 37, 255)
L_RING = (245, 216, 88, 255)
L_HI = (255, 247, 200, 255)
WOOD = (132, 92, 48, 255)
WOOD_D = (86, 60, 32, 255)


# =====================================================================
# Вспомогательное рисование конечностей
# =====================================================================

def limb(c: Canvas, x0: float, y0: float, x1: float, y1: float, col, w: int = 2):
    """Конечность 2px: от (x0,y0) к (x1,y1) по более длинной оси."""
    dx = x1 - x0
    dy = y1 - y0
    steps = max(abs(dx), abs(dy))
    if steps < 1:
        c.rect(int(round(x0)), int(round(y0)), w, 1, col)
        return
    for i in range(int(steps) + 1):
        t = i / steps
        x = int(round(x0 + dx * t))
        y = int(round(y0 + dy * t))
        c.rect(x, y, w, 1, col)


def outline_all(frames: list[Canvas]):
    for f in frames:
        f.outl()


# =====================================================================
# Игрок (16x18) — исследователь; палитра зависит от локации
# =====================================================================

def draw_upper(c: Canvas, bob: int, pal: dict) -> None:
    """Торс, голова, кепка/маска, рюкзак, бандана при сдвиге верха bob."""
    # рюкзак (за спиной, слева — игрок бежит вправо)
    c.rect(3, 7 + bob, 2, 4, PACK)
    c.vline(3, 7 + bob, 4, PACK_D)
    c.px(4, 7 + bob, (168, 120, 70, 255))
    # торс
    c.rect(5, 7 + bob, 5, 4, pal["shirt"])
    c.vline(5, 7 + bob, 4, pal["shirt_l"])
    c.vline(9, 7 + bob, 4, pal["shirt_d"])
    c.hline(5, 10 + bob, 5, pal["belt"])       # пояс
    c.px(7, 10 + bob, GOLD)                     # пряжка
    # голова или золотая маска
    if pal.get("mask"):
        c.rect(6, 4 + bob, 4, 3, pal["mask"])
        c.vline(9, 4 + bob, 3, (180, 138, 30, 255))
        c.px(7, 5 + bob, EYE_P)                 # прорези глаз маски
        c.px(8, 5 + bob, EYE_P)
    else:
        c.rect(6, 4 + bob, 4, 3, SKIN)
        c.vline(9, 4 + bob, 3, SKIN_D)
        c.px(8, 4 + bob, EYE_P)                 # глаз (смотрит вправо)
        c.px(6, 4 + bob, HAIR)                  # волосы на затылке
        c.px(6, 5 + bob, HAIR)
    # кепка/повязка
    c.rect(6, 2 + bob, 4, 1, pal["hat_l"])
    c.rect(6, 3 + bob, 4, 1, pal["hat_d"])      # полоса
    c.hline(4, 3 + bob, 8, pal["hat"])          # поля
    c.hline(4, 4 + bob, 8, pal["hat_d"])
    # хвост банданы, треплется назад
    c.px(4, 5 + bob, pal["band"])
    c.px(3, 6 + bob, pal["band"])


def draw_legs(c: Canvas, bob: int, hip_f, foot_f, hip_b, foot_b, pal: dict) -> None:
    limb(c, hip_f[0], hip_f[1] + bob, foot_f[0], foot_f[1], pal["pants"])
    c.rect(foot_f[0] - 1, foot_f[1], 3, 1, pal["boot"])
    limb(c, hip_b[0], hip_b[1] + bob, foot_b[0], foot_b[1], pal["pants_d"])
    c.rect(foot_b[0] - 1, foot_b[1], 3, 1, pal["boot"])


def draw_arms(c: Canvas, bob: int, sh_f, hand_f, sh_b, hand_b, pal: dict) -> None:
    limb(c, sh_b[0], sh_b[1] + bob, hand_b[0], hand_b[1], pal["shirt_d"])
    c.px(hand_b[0], hand_b[1], SKIN_D)
    limb(c, sh_f[0], sh_f[1] + bob, hand_f[0], hand_f[1], pal["shirt"])
    c.px(hand_f[0], hand_f[1], SKIN)


def player_frame(pose: dict) -> Canvas:
    pal = pose.get("pal", PALS["jungle"])
    c = Canvas(16, 18)
    bob = pose["bob"]
    if pose.get("lying"):
        draw_lying(c)
        return c
    if pose.get("slide"):
        draw_slide(c)
        return c
    draw_upper(c, bob, pal)
    draw_arms(c, bob, (5, 8), pose["hand_b"], (9, 8), pose["hand_f"], pal)
    draw_legs(c, bob, (5, 10), pose["foot_b"], (8, 10), pose["foot_f"], pal)
    if pose.get("hurt"):
        # разинутый рот, шляпа криво
        c.px(8, 5 + bob, (90, 30, 26, 255))
        c.px(7, 5 + bob, (90, 30, 26, 255))
    return c


def draw_slide(c: Canvas) -> None:
    """Кувырок: тело горизонтально, рука вверх, шапка над головой."""
    # голова слева
    c.rect(2, 12, 4, 3, SKIN)
    c.vline(5, 12, 3, SKIN_D)
    c.px(4, 12, EYE_P)
    c.rect(2, 10, 5, 1, HAT)
    c.hline(1, 11, 7, HAT_D)
    c.px(1, 12, BAND)
    # торс горизонтально
    c.rect(6, 13, 5, 3, SHIRT)
    c.hline(6, 13, 5, SHIRT_L)
    c.hline(6, 15, 5, SHIRT_D)
    # рука вверх
    limb(c, 7, 13, 6, 10, SHIRT)
    c.px(6, 9, SKIN)
    # ноги вправо, согнуты
    limb(c, 10, 15, 13, 16, PANTS)
    limb(c, 11, 14, 14, 13, PANTS_D)
    c.rect(12, 16, 3, 1, BOOT)
    c.rect(13, 13, 3, 1, BOOT)


def draw_lying(c: Canvas) -> None:
    """На спине (конец забега): тело у земли, крестик-глаза."""
    # голова слева
    c.rect(1, 14, 4, 3, SKIN)
    c.vline(4, 14, 3, SKIN_D)
    # X-глаза
    c.px(2, 14, K)
    c.px(3, 15, K)
    c.px(3, 14, K)
    c.px(2, 15, K)
    # кепка отлетела рядом
    c.hline(0, 17, 5, HAT)
    c.px(1, 16, HAT)
    # руки вверх (бессильно)
    limb(c, 6, 16, 5, 13, SHIRT_D)
    c.px(5, 12, SKIN_D)
    # торс
    c.rect(5, 15, 6, 2, SHIRT)
    c.hline(5, 15, 6, SHIRT_L)
    # ноги вверх-вправо
    limb(c, 10, 16, 13, 13, PANTS)
    limb(c, 11, 16, 14, 15, PANTS_D)
    c.rect(13, 12, 3, 1, BOOT)
    c.rect(14, 15, 3, 1, BOOT)


def gen_player() -> list[Canvas]:
    # фазы бега: (bob, стопа передней ноги, стопа задней, рука передняя, рука задняя)
    run = [
        (0, (10, 16), (3, 16), (3, 11), (11, 11)),
        (1, (9, 16), (4, 16), (4, 12), (10, 12)),
        (0, (8, 16), (6, 13), (5, 9), (10, 10)),
        (-1, (8, 16), (5, 12), (4, 8), (11, 9)),
        (0, (3, 16), (10, 16), (11, 11), (3, 11)),
        (1, (4, 16), (9, 16), (10, 12), (4, 12)),
        (0, (6, 13), (8, 16), (10, 10), (5, 9)),
        (-1, (5, 12), (8, 16), (11, 9), (4, 8)),
    ]
    frames = []
    for bob, ff, fb, hf, hb in run:
        frames.append(player_frame({"bob": bob, "foot_f": ff, "foot_b": fb,
                                    "hand_f": hf, "hand_b": hb}))
    # прыжок: ноги подтянуты, руки вверх
    frames.append(player_frame({"bob": -1, "foot_f": (9, 13), "foot_b": (6, 13),
                                "hand_f": (11, 5), "hand_b": (4, 5)}))
    # кувырок
    frames.append(player_frame({"bob": 0, "slide": True}))
    # ранен: руки вверх, рот разинут
    frames.append(player_frame({"bob": 0, "foot_f": (9, 16), "foot_b": (5, 16),
                                "hand_f": (11, 6), "hand_b": (4, 7), "hurt": True}))
    # мёртв
    frames.append(player_frame({"bob": 0, "lying": True}))
    outline_all(frames)
    return frames


def gen_stand(biome: str) -> Canvas:
    """Спокойная стойка в палитре локации (меню/заставка)."""
    c = player_frame({"bob": 0, "foot_f": (9, 16), "foot_b": (5, 16),
                      "hand_f": (10, 10), "hand_b": (4, 10), "pal": PALS[biome]})
    c.outl()
    return c


# =====================================================================
# Змея (14x14x4) — свернувшаяся кобра, язычок-фазы
# =====================================================================

def gen_snake(frame: int) -> Canvas:
    c = Canvas(14, 14)
    bob = 1 if frame in (2, 3) else 0
    tongue = frame in (0, 2)
    # нижняя спираль
    c.rect(1, 10, 12, 3, VG_MID)
    c.hline(1, 10, 12, VG_LIGHT)
    c.hline(1, 12, 12, VG_DARK)
    c.rect(3, 13, 8, 1, VG_DARK)
    # верхняя спираль
    c.rect(3, 7, 8, 3, VG_MID)
    c.hline(3, 7, 8, VG_LIGHT)
    c.hline(3, 9, 8, VG_DARK)
    # брюшная чешуя — чёткие «чешуйки»
    for x in range(2, 12, 2):
        c.px(x, 11, VG_BELLY)
    # шея и голова (поднята, покачивает)
    h = 2 + bob
    limb(c, 9, 7, 10, h + 3, VG_MID, w=3)
    c.rect(8, h, 5, 3, VG_MID)
    c.hline(8, h, 5, VG_LIGHT)
    c.rect(9, h + 2, 4, 1, VG_BELLY)
    c.px(11, h, EYE_W)
    c.px(12, h, EYE_P)          # зрачок
    c.px(12, h + 1, VG_DARK)
    # капюшон
    c.px(7, h + 1, VG_LIGHT)
    c.px(7, h + 2, VG_DARK)
    # язык
    if tongue:
        c.px(13, h + 1, TONGUE)
        c.px(13, h + 2, TONGUE)
    c.outl()
    return c


# =====================================================================
# Летучая мышь (14x8x4) — фазы взмаха
# =====================================================================

def gen_bat(frame: int) -> Canvas:
    c = Canvas(14, 8)
    # крыло-мембрана по фазам: (строка, x_от, x_до) — плотные треугольники
    wings = [
        [(1, 0, 3), (1, 10, 13), (2, 2, 4), (2, 9, 11)],                      # вверх
        [(3, 0, 4), (3, 9, 13), (2, 1, 2), (2, 11, 12)],                      # в размах
        [(5, 0, 3), (5, 10, 13), (4, 2, 4), (4, 9, 11)],                      # вниз
        [(2, 0, 3), (2, 10, 13), (3, 1, 4), (3, 9, 12)],                      # середина
    ][frame]
    for y, x0, x1 in wings:
        c.hline(x0, y, x1 - x0 + 1, BAT_MID)
        c.hline(x0, y + 1, x1 - x0 + 1, BAT_DARK)
    # тело
    c.rect(5, 3, 4, 3, BAT_MID)
    c.hline(5, 3, 4, BAT_LIGHT)
    c.hline(5, 5, 4, BAT_DARK)
    # уши
    c.px(5, 2, BAT_MID)
    c.px(8, 2, BAT_MID)
    c.px(5, 1, BAT_DARK)
    c.px(8, 1, BAT_DARK)
    # глаза и клыки
    c.px(5, 3, BAT_EYE)
    c.px(8, 3, BAT_EYE)
    c.px(6, 6, EYE_W)
    c.px(7, 6, EYE_W)
    c.outl()
    return c


# =====================================================================
# Ягуар (16x14x6) — бег 6 фаз
# =====================================================================

def gen_jaguar(frame: int) -> Canvas:
    c = Canvas(16, 14)
    # фазы: (bob, стопа передней, стопа задней)
    cycle = [
        (0, (11, 13), (3, 13)),
        (1, (10, 13), (4, 13)),
        (0, (10, 13), (6, 11)),
        (0, (9, 13), (4, 11)),
        (1, (11, 13), (5, 13)),
        (0, (12, 13), (7, 11)),
    ]
    bob, ff, fb = cycle[frame]
    # хвост (закручен вверх-назад)
    c.px(1, 5 - bob, JAG_D)
    c.px(0, 4 - bob, JAG_D)
    c.px(1, 3 - bob, JAG)
    c.px(2, 4 - bob, JAG)
    # корпус
    c.rect(3, 5 - bob, 9, 5, JAG)
    c.hline(3, 5 - bob, 9, JAG_L)
    c.hline(3, 9 - bob, 9, JAG_D)
    c.rect(3, 8 - bob, 9, 1, JAG_BELLY)
    # розетки
    for x, y in ((5, 6), (8, 7), (6, 8), (10, 6)):
        c.px(x, y - bob, JAG_SPOT)
        c.px(x + 1, y - bob, JAG_SPOT)
    # голова
    c.rect(11, 3 - bob, 5, 4, JAG)
    c.hline(11, 3 - bob, 5, JAG_L)
    c.px(11, 2 - bob, JAG_D)   # уши
    c.px(14, 2 - bob, JAG_D)
    c.rect(13, 6 - bob, 3, 1, JAG_BELLY)  # морда
    c.px(15, 5 - bob, K)       # нос
    c.px(13, 4 - bob, EYE_P)   # глаз
    c.px(12, 5 - bob, JAG_D)
    # ноги — поверх корпуса, чтобы читались (задняя пара темнее)
    limb(c, 5, 9 - bob, fb[0], fb[1], JAG_D)
    limb(c, 10, 9 - bob, ff[0], ff[1], JAG)
    c.rect(fb[0] - 1, fb[1], 3, 1, K)
    c.rect(ff[0] - 1, ff[1], 3, 1, K)
    c.outl()
    return c


# =====================================================================
# Воин (16x15x4) — метатель копья: покачивание и замах
# =====================================================================

def gen_warrior(frame: int) -> Canvas:
    c = Canvas(16, 15)
    lean = 1 if frame >= 2 else 0     # наклон вперёд при замахе
    bob = 1 if frame % 2 == 1 else 0
    # копьё (в правой руке, при замахе — отведено)
    sx = 12 + lean
    c.vline(sx, 2 + bob, 11, W_SPEAR)
    c.vline(sx + 1, 2 + bob, 11, W_SPEAR_D)
    c.rect(sx - 1, 0 + bob, 3, 2, W_METAL)
    c.px(sx - 1, 2 + bob, (120, 124, 138, 255))
    # ноги и юбка
    c.rect(5, 10 + bob, 5, 3, W_SKIRT)
    c.hline(5, 10 + bob, 5, W_SKIRT_D)
    c.rect(5, 13 + bob, 2, 1, W_SKIN)
    c.rect(8, 13 + bob, 2, 1, W_SKIN_D)
    # корпус
    c.rect(5, 6 + bob, 5, 4, W_SKIN)
    c.vline(9, 6 + bob, 4, W_SKIN_D)
    c.px(6, 7 + bob, PAINT)   # боевая раскраска
    c.px(8, 8 + bob, PAINT)
    # голова
    c.rect(6, 3 + bob, 4, 3, W_SKIN)
    c.vline(9, 3 + bob, 3, W_SKIN_D)
    c.px(8, 4 + bob, EYE_P)
    # повязка и перья
    c.hline(5, 2 + bob, 6, W_FEATHER)
    c.px(6, 1 + bob, W_FEATHER)
    c.px(7, 0 + bob, W_FEATHER2)
    c.px(8, 1 + bob, W_FEATHER)
    # руки: передняя тянется к копью (при замахе — вперёд)
    limb(c, 9, 7 + bob, sx, 6 + bob + lean, W_SKIN)
    limb(c, 5, 7 + bob, 3, 9 + bob, W_SKIN_D)
    c.outl()
    return c


# =====================================================================
# Предметы
# =====================================================================

IDOL_ROWS = [
    "..hhhh..",
    ".hhhhhh.",
    "gggggggg",
    "geggggeg",
    "gggggggg",
    ".gggggg.",
    "..gggg..",
    "...gg...",
]


def gen_idol(frame: int) -> Canvas:
    c = Canvas(8, 8)
    pal = {"h": L_RING, "g": L_GOLD, "e": K}
    for y, row in enumerate(IDOL_ROWS):
        for x, ch in enumerate(row):
            if ch in pal:
                c.px(x, y, pal[ch])
    # бегущий блик по фазам
    spark = [(2, 2), (4, 3), (5, 5), (3, 4)][frame]
    c.px(spark[0], spark[1], L_HI)
    c.px(1, 6, L_DARK)
    c.px(6, 6, L_DARK)
    return c


def gen_spear() -> Canvas:
    c = Canvas(12, 4)
    c.rect(0, 1, 9, 2, WOOD)
    c.hline(0, 1, 9, (160, 118, 66, 255))
    c.hline(0, 2, 9, WOOD_D)
    c.rect(8, 0, 1, 4, WOOD_D)   # перекрестие
    c.rect(9, 1, 3, 2, W_METAL)
    c.px(9, 1, (232, 237, 245, 255))
    c.px(11, 1, K)
    c.px(11, 2, K)
    return c


# =====================================================================
# Сборка
# =====================================================================

def strip(frames: list[Canvas]) -> Image:
    w = sum(f.w for f in frames)
    h = frames[0].h
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = 0
    for f in frames:
        out.paste(f.img, (x, 0))
        x += f.w
    return out


def main() -> None:
    player = gen_player()
    sheets = {
        "player_run": player[0:8],
        "player_jump": [player[8]],
        "player_slide": [player[9]],
        "player_hurt": [player[10]],
        "player_dead": [player[11]],
        "player_stand_jungle": [gen_stand("jungle")],
        "player_stand_village": [gen_stand("village")],
        "player_stand_temple": [gen_stand("temple")],
        "snake": [gen_snake(i) for i in range(4)],
        "bat": [gen_bat(i) for i in range(4)],
        "jaguar": [gen_jaguar(i) for i in range(6)],
        "warrior": [gen_warrior(i) for i in range(4)],
        "idol": [gen_idol(i) for i in range(4)],
        "spear": [gen_spear()],
    }
    made = {}
    OUT.mkdir(parents=True, exist_ok=True)
    for name, frames in sheets.items():
        im = strip(frames)
        im.save(OUT / f"{name}.png")
        made[name] = im
        print(f"  {name}.png: {im.width}x{im.height}")
    p = preview(made, PREVIEW / "preview_characters.png", scale=4)
    print(f"preview -> {p}")


if __name__ == "__main__":
    main()
