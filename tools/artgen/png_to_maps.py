#!/usr/bin/env python3
"""
png_to_maps.py — конвертирует пиксель-арт PNG (godot/assets/sprites)
в JS-карту спрайтов web/js/gfx/GeneratedMaps.js.

Зачем: web-версия использует те ЖЕ улучшенные спрайты, что и Godot-ремейк
(общий пиксель-арт из tools/artgen), чтобы графика была 1:1.

Формат выхода (консистентен со старым SpriteStore.MAPS):
    const GENERATED_MAPS = {
      "player_run_0": {"pal": ["#141220", ...], "rows": ["....", ...]},
      ...
    };
* строки карты — символы, индексирующие палитру в base36 (0-9a-z);
* '.' — прозрачный пиксель;
* одноимённые карты из PNG ПЕРЕКРЫВАЮТ старые рисованные (Object.assign).

Контракт ячеек синхронизирован с Art.gd (CELLS) — при смене листов
обновите оба места.

Запуск:  python tools/artgen/png_to_maps.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "godot" / "assets" / "sprites"
DST = ROOT / "web" / "js" / "gfx" / "GeneratedMaps.js"

# имя листа -> (ширина, высота ячейки в арт-пикселях, кадров)
# Синхронно с godot/scripts/gfx/Art.gd CELLS (только спрайты, которые
# использует web: без декора и стоек — у web процедурный фон).
CELLS = {
    "player_run": (16, 18, 8),
    "player_jump": (16, 18, 1),
    "player_slide": (16, 18, 1),
    "player_hurt": (16, 18, 1),
    "player_dead": (16, 18, 1),
    "snake": (14, 14, 4),
    "bat": (14, 8, 4),
    "jaguar": (16, 14, 6),
    "warrior": (16, 15, 4),
    "idol": (8, 8, 4),
    "heart": (8, 8, 1),
    "spear": (12, 4, 1),
    "log1": (48, 18, 1),
    "log2": (48, 18, 1),
    "vine1": (48, 18, 1),
    "ropetrap": (56, 24, 1),
    "statue": (24, 60, 1),
    "spikes": (16, 14, 1),
    "stonebeam": (48, 16, 1),
}


def b36(idx: int) -> str:
    """Индекс палитры -> символ base36 (0-9a-z)."""
    if idx < 10:
        return str(idx)
    if idx < 36:
        return chr(ord("a") + idx - 10)
    raise SystemExit(f"Палитра больше 36 цветов (индекс {idx}) — увеличьте base36.")


def frame_name(sheet: str, i: int, frames: int) -> str:
    """Одиночный кадр -> имя листа; полоса -> имя_индекс."""
    return sheet if frames == 1 else f"{sheet}_{i}"


def convert_frame(img: Image.Image, x0: int, cw: int, ch: int) -> dict:
    """Кроп кадра -> {pal, rows} с палитрой, собранной из пикселей."""
    rgba = img.convert("RGBA")
    palette: list[str] = []
    index: dict[str, int] = {}
    rows: list[str] = []
    for y in range(ch):
        row = []
        for x in range(cw):
            r, g, b, a = rgba.getpixel((x0 + x, y))
            if a < 128:
                row.append(".")
                continue
            hexcol = f"#{r:02x}{g:02x}{b:02x}"
            if hexcol not in index:
                index[hexcol] = len(palette)
                palette.append(hexcol)
            row.append(b36(index[hexcol]))
        rows.append("".join(row))
    if not palette:
        raise SystemExit("Пустой кадр — проверьте PNG.")
    return {"pal": palette, "rows": rows}


def main() -> None:
    out: dict[str, dict] = {}
    for sheet, (cw, ch, frames) in CELLS.items():
        path = SRC / f"{sheet}.png"
        if not path.exists():
            raise SystemExit(f"Нет листа: {path}")
        img = Image.open(path)
        if img.size != (cw * frames, ch):
            raise SystemExit(
                f"{sheet}: ожидался лист {cw * frames}x{ch}, получен {img.width}x{img.height}"
            )
        for i in range(frames):
            name = frame_name(sheet, i, frames)
            out[name] = convert_frame(img, i * cw, cw, ch)

    lines = [
        "/**",
        " * GENERATED FILE — не редактировать вручную!",
        " * Карты спрайтов из PNG godot/assets/sprites (общий арт с Godot-ремейком).",
        " * Перегенерация:  python tools/artgen/png_to_maps.py",
        " *",
        " * Формат: { pal: [hex...], rows: [\"строки\"] } — символ строки это",
        " * индекс палитры (base36: 0-9a-z), '.' — прозрачно.",
        " */",
        "const GENERATED_MAPS = {",
    ]
    for name in sorted(out):
        entry = json.dumps(out[name], ensure_ascii=True, separators=(",", ":"))
        lines.append(f"  {json.dumps(name)}: {entry},")
    lines.append("};")
    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text("\n".join(lines) + "\n", encoding="utf-8")

    kb = DST.stat().st_size / 1024
    print(f"OK: {len(out)} карт из {len(CELLS)} листов -> {DST} ({kb:.0f} КБ)")


if __name__ == "__main__":
    main()
