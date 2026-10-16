#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор тайлов земли для локаций Jungle Run (Pillow).

Каждый лист tiles_<biome>.png — 4 ячейки 16x16 (арт-пиксели, игровой масштаб x2):
  [0] верхний ряд A — «трава/плитка + грунт» (детализированный край)
  [1] заполнение A  — грунт под верхним рядом
  [2] верхний ряд B — вариант A с деталью (коряга/камешек/скол)
  [3] заполнение B  — вариант грунта

Запуск:  python tools/artgen/gen_tiles.py
Выход:   godot/assets/tiles/tiles_{jungle,village,temple}.png
         + tools/artgen/preview/preview_tiles.png
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_obstacles import Canvas, preview  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "godot" / "assets" / "tiles"
PREVIEW = ROOT / "tools" / "artgen" / "preview"

K = (20, 18, 32, 255)


def _dirt_rows(c: Canvas, top: int, base, hi, lo, rng) -> None:
    """Тело грунта: база + крапинки-комки."""
    for y in range(top, 16):
        c.hline(0, y, 16, base)
    for i in range(14):
        x = int(rng() * 16)
        y = top + int(rng() * (16 - top))
        c.px(x, y, hi if i % 2 == 0 else lo)


def gen_jungle() -> list[Canvas]:
    rng = [0]

    def nxt() -> float:  # детерминированный локальный ГПСЧ
        rng[0] = (rng[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return rng[0] / 0x7FFFFFFF

    G1 = (96, 162, 72, 255)
    G2 = (63, 122, 58, 255)
    G3 = (38, 82, 36, 255)
    D1 = (120, 84, 46, 255)
    D2 = (96, 66, 36, 255)
    D3 = (72, 48, 26, 255)
    cells = []
    # [0] верх A: трава + грунт
    c = Canvas(16, 16)
    c.hline(0, 0, 16, G1)
    c.hline(0, 1, 16, G1)
    c.hline(0, 2, 16, G2)
    c.hline(0, 3, 16, G2)
    for x in range(0, 16, 3):  # зубчики травы свисают в грунт
        c.vline(x, 4, 2, G3)
    _dirt_rows(c, 4, D1, D2, D3, nxt)
    for x in range(0, 16, 3):
        c.vline(x, 4, 2, G3)
    c.outl()
    cells.append(c)
    # [1] заполнение A: грунт
    c = Canvas(16, 16)
    _dirt_rows(c, 0, D1, D2, D3, nxt)
    cells.append(c)
    # [2] верх B: с корягой и камешком
    c = Canvas(16, 16)
    c.hline(0, 0, 16, G1)
    c.hline(0, 1, 16, G2)
    for x in range(0, 16, 4):
        c.vline(x, 2, 2, G3)
    _dirt_rows(c, 3, D1, D2, D3, nxt)
    c.rect(5, 4, 5, 2, (86, 60, 32, 255))     # коряга
    c.hline(5, 4, 5, (160, 118, 66, 255))
    c.px(11, 6, (78, 83, 93, 255))            # камешек
    c.px(12, 6, (112, 118, 129, 255))
    c.outl()
    cells.append(c)
    # [3] заполнение B
    c = Canvas(16, 16)
    _dirt_rows(c, 0, D1, D2, D3, nxt)
    c.px(3, 5, (112, 118, 129, 255))
    c.px(4, 5, (78, 83, 93, 255))
    c.px(12, 11, (160, 118, 66, 255))
    cells.append(c)
    return cells


def gen_village() -> list[Canvas]:
    rng = [7]

    def nxt() -> float:
        rng[0] = (rng[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return rng[0] / 0x7FFFFFFF

    P1 = (201, 176, 114, 255)   # сухой песок
    P2 = (168, 143, 88, 255)
    P3 = (128, 106, 62, 255)
    P4 = (96, 78, 46, 255)
    cells = []
    c = Canvas(16, 16)
    c.hline(0, 0, 16, P1)
    c.hline(0, 1, 16, P2)
    c.hline(0, 2, 16, P2)
    _dirt_rows(c, 3, P2, P3, P4, nxt)
    c.hline(0, 3, 16, P3)
    c.outl()
    cells.append(c)
    c = Canvas(16, 16)
    _dirt_rows(c, 0, P2, P3, P4, nxt)
    cells.append(c)
    c = Canvas(16, 16)
    c.hline(0, 0, 16, P1)
    c.hline(0, 1, 16, P2)
    _dirt_rows(c, 2, P2, P3, P4, nxt)
    c.rect(8, 3, 3, 2, (78, 83, 93, 255))    # мелкий камень
    c.hline(8, 3, 3, (112, 118, 129, 255))
    c.px(2, 5, (63, 122, 58, 255))           # сухая травинка
    c.px(3, 4, (96, 162, 72, 255))
    c.outl()
    cells.append(c)
    c = Canvas(16, 16)
    _dirt_rows(c, 0, P2, P3, P4, nxt)
    c.px(5, 8, (160, 118, 66, 255))
    c.px(11, 4, (78, 83, 93, 255))
    cells.append(c)
    return cells


def gen_temple() -> list[Canvas]:
    rng = [13]

    def nxt() -> float:
        rng[0] = (rng[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return rng[0] / 0x7FFFFFFF

    S1 = (150, 156, 167, 255)
    S2 = (112, 118, 129, 255)
    S3 = (78, 83, 93, 255)
    S4 = (52, 56, 64, 255)
    cells = []
    c = Canvas(16, 16)
    c.hline(0, 0, 16, S1)                    # край плитки
    c.hline(0, 1, 16, S2)
    for y in range(2, 16):
        c.hline(0, y, 16, S2 if y % 4 != 0 else S3)
    for x in range(0, 16, 8):                # швы плитки
        c.vline(x, 2, 14, S3)
    c.px(10, 5, S4)                          # скол
    c.px(11, 6, S4)
    c.outl()
    cells.append(c)
    c = Canvas(16, 16)
    for y in range(0, 16):
        c.hline(0, y, 16, S2 if y % 4 != 0 else S3)
    for x in range(0, 16, 8):
        c.vline(x, 0, 16, S3)
    for i in range(6):                       # крап
        c.px(int(nxt() * 16), int(nxt() * 16), S4)
    cells.append(c)
    c = Canvas(16, 16)
    c.hline(0, 0, 16, S1)
    c.hline(0, 1, 16, S2)
    for y in range(2, 16):
        c.hline(0, y, 16, S2 if y % 4 != 0 else S3)
    c.vline(6, 2, 14, S3)                    # трещина
    c.px(7, 6, S4)
    c.px(5, 9, S4)
    c.rect(10, 4, 3, 2, (201, 131, 46, 255))  # осколок охры
    c.outl()
    cells.append(c)
    c = Canvas(16, 16)
    for y in range(0, 16):
        c.hline(0, y, 16, S2 if y % 4 != 0 else S3)
    c.px(3, 3, S4)
    c.px(12, 10, S4)
    c.px(13, 11, S3)
    cells.append(c)
    return cells


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    made = {}
    for name, gen in (("jungle", gen_jungle), ("village", gen_village), ("temple", gen_temple)):
        cells = gen()
        im = Image.new("RGBA", (64, 16), (0, 0, 0, 0))
        for i, cc in enumerate(cells):
            im.paste(cc.img, (i * 16, 0))
        im.save(OUT / f"tiles_{name}.png")
        made[f"tiles_{name}"] = im
        print(f"  tiles_{name}.png: 64x16")
    p = preview(made, PREVIEW / "preview_tiles.png", scale=4)
    print(f"preview -> {p}")


if __name__ == "__main__":
    main()
