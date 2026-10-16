# -*- coding: utf-8 -*-
"""Конвертер C-подобных комментариев /** ... */ в GDScript-стиль '# ...'."""
import pathlib

root = pathlib.Path(__file__).resolve().parents[1] / "godot"
changed = 0
for p in root.rglob("*.gd"):
    lines = p.read_text(encoding="utf-8").splitlines()
    out = []
    in_block = False
    touched = False
    for ln in lines:
        s = ln.strip()
        if not in_block and s.startswith("/**"):
            in_block = True
            touched = True
            rest = s[3:].strip()
            if rest.endswith("*/"):
                rest = rest[:-2].strip()
                in_block = False
            out.append("# " + rest if rest else "#")
            continue
        if in_block:
            if s.endswith("*/"):
                s2 = s[:-2].strip().lstrip("*").strip()
                if s2:
                    out.append("# " + s2)
                in_block = False
                continue
            s2 = s.lstrip("*").strip()
            out.append("# " + s2 if s2 else "#")
            continue
        out.append(ln)
    if touched:
        p.write_text("\n".join(out) + "\n", encoding="utf-8")
        changed += 1
        print("fixed", p.relative_to(root.parent))
print("files:", changed)
