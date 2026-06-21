# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "resvg-py",
#   "Pillow",
# ]
# ///
"""
Render robot.svg as a 1024x1024 stencil mask in the taco-stencil format:
- Outside the figure: transparent (alpha=0)
- Interior of the figure: white (RGB=255, alpha=255)
- Outline of the figure: black stroke (RGB=0, alpha=255)

The output mirrors public/images/taco-stencil.png so the taco shaders work
unchanged when swapped to image=images/robot-stencil.png.
"""
import io
import sys
from pathlib import Path

import resvg_py
from PIL import Image

SRC = Path(r"D:\Projects\nfc-bead\beads\robot\robot.svg")
DST = Path(r"D:\Projects\paper-cranes\public\images\robot-stencil.png")
SIZE = 1024
MARGIN_FRAC = 0.06   # ~6% padding on the long axis so chrome rim has room
STROKE_VBOX = 8.0    # outline width in viewBox units (matches taco rim thickness)

src_svg = SRC.read_text()

# Robot SVG: viewBox 0 0 1086 1280 (portrait), single filled path in a transformed group.
# Convert to: same viewBox, white fill + black stroke, then embed centered + scaled inside
# a fresh 1024-square SVG canvas with padding.

robot_w, robot_h = 1086.0, 1280.0
long_side = max(robot_w, robot_h)
usable = 1024.0 * (1.0 - 2.0 * MARGIN_FRAC)
scale = usable / long_side
draw_w = robot_w * scale
draw_h = robot_h * scale
offset_x = (1024.0 - draw_w) / 2.0
offset_y = (1024.0 - draw_h) / 2.0

# Strip the XML/DOCTYPE so we can inline the <svg> root inside a wrapper <svg>.
import re
inner = src_svg
inner = re.sub(r"<\?xml[^>]*\?>", "", inner)
inner = re.sub(r"<!DOCTYPE[^>]*>", "", inner, flags=re.DOTALL)
# Force the path's appearance: white fill, black stroke, round joins.
# The path inherits from <g fill="#000000" stroke="none">; rewrite the <g> attrs.
inner = re.sub(
    r'<g\s+transform="([^"]+)"\s+fill="[^"]*"\s+stroke="[^"]*">',
    r'<g transform="\1" fill="#ffffff" stroke="#000000" '
    r'stroke-width="80" stroke-linejoin="round" stroke-linecap="round">',
    inner,
)
# Note: the group has scale(0.1) so stroke-width=80 in path-space = 8 viewBox units.

wrapper = f'''<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <g transform="translate({offset_x:.4f},{offset_y:.4f}) scale({scale:.6f})">
    {inner}
  </g>
</svg>
'''

png_bytes = bytes(resvg_py.svg_to_bytes(svg_string=wrapper, width=SIZE, height=SIZE))

# Ensure RGBA mode + clean up: anywhere alpha is zero we want pure 0,0,0,0.
img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
DST.parent.mkdir(parents=True, exist_ok=True)
img.save(DST, "PNG")
print(f"wrote {DST} ({img.size[0]}x{img.size[1]})")
