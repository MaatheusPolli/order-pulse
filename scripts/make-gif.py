"""Monta o GIF do README a partir dos quadros de scripts/capture-demo.mjs.

Uso: python3 scripts/make-gif.py <dir_quadros> docs/demo.gif  (requer Pillow)
"""
import sys
from pathlib import Path

from PIL import Image

frames_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/frames")
output = Path(sys.argv[2] if len(sys.argv) > 2 else "docs/demo.gif")
WIDTH = 960

frames = []
for path in sorted(frames_dir.glob("*.png")):
    image = Image.open(path).convert("RGB")
    height = round(image.height * WIDTH / image.width)
    image = image.resize((WIDTH, height), Image.LANCZOS)
    frames.append(image.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))

output.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(output, save_all=True, append_images=frames[1:], duration=450, loop=0, optimize=True)
print(f"{output}: {len(frames)} quadros, {output.stat().st_size / 1024:.0f} KB")
