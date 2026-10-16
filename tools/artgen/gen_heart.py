# Генерация godot/assets/sprites/heart.png (8x8) — та же карта и цвета,
# что у web-спрайта heart в SpriteStore (паритет версий 1:1).
# Запуск: python tools/artgen/gen_heart.py
from PIL import Image
import os

ROWS = [
    ".EE..EE.",
    "EEEEEEEE",
    "WEEEEEEE",
    "WEEEEEEE",
    ".EEEEEE.",
    "..EEEE..",
    "...EE...",
    "........",
]
PAL = {
    "E": (0xB0, 0x30, 0x27, 255),  # тело сердца
    "W": (0xEF, 0xE3, 0xC8, 255),  # блик
}

dst = os.path.join(os.path.dirname(__file__), "..", "..", "godot", "assets", "sprites", "heart.png")
dst = os.path.normpath(dst)

img = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
px = img.load()
for y, row in enumerate(ROWS):
    for x, ch in enumerate(row):
        if ch in PAL:
            px[x, y] = PAL[ch]
img.save(dst)
print("OK:", dst)
