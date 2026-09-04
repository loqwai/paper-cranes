"""Write 4.frag's presets: the recognition recipe, one per mon, plus palette variants.

The recipe was found by sweep, not guessed:
  knob_169 = 0.60   cell pitch ~0.44 in uv. Below this the bead is too small to read; ABOVE
                    0.75 the cell grows so large the camera sits INSIDE one bead and the
                    silhouette disappears entirely. It is a window, not a "bigger is better".
  navZoom  = 0.14   the far framing - the only one that leaves dark ground around the figure.
  legible  = 1      full figure/ground separation (interior flatten + deep recede + thick rim).
  knob_168 = 1.0    seed grid at full strength.
"""
import io
import re
from urllib.parse import quote

FRAG = "shaders/redaphid/wip/lattice-bead/4.frag"
HOST = "https://visuals.beadfamous.com"

MON = [
    ("suhama", "three-mound sandbar"),
    ("ogi", "folded fan"),
    ("kikyo", "bellflower"),
    ("ume", "plum blossom"),
    ("katabami", "wood sorrel"),
    ("tomoe", "comma and tail"),
    ("mokko", "melon quatrefoil"),
    ("kikko", "tortoise-shell hexagon"),
    ("kiku", "chrysanthemum"),
    ("matsukawa", "pine-bark lozenge"),
    ("hakkaku", "eight-pointed star"),
]
# theme / paletteShift pairs that survived the overnight curation (1.7 and theme 3 excluded).
PALETTES = [("Jade", 0, 1.35), ("Deep Cyan", 1, 0.45), ("Ember", 1, 1.05), ("Violet", 1, 0.75)]


def url(mon, theme, ps, name, legible=1, k169="0.60", z="0.14"):
    return (
        f"{HOST}/?shader=redaphid/wip/lattice-bead/4"
        "&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls"
        f"&image=images/beads/mon-{mon}.png&knob_161=1&knob_168=1.0&knob_169={k169}"
        f"&legible={legible}&navZoom={z}&autofly=1&wavelet=true&onset_refractory_ms=380"
        f"&fullscreen=true&theme={theme}&paletteShift={ps}&name={quote(name)}"
    )


src = io.open(FRAG, encoding="utf-8").read()
src = re.sub(r"// ==== PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

lines = [
    "// ==== PRESETS - THE RECOGNITION RECIPE ====",
    "// Found by sweep, not guessed. knob_169=0.60 (cell pitch ~0.44 in uv), navZoom=0.14 (the only",
    "// framing that leaves dark ground AROUND the figure), legible=1, knob_168=1.0. Note that the",
    "// pitch is a WINDOW, not a maximum: past knob_169=0.75 the cell grows so large the camera sits",
    "// INSIDE one bead and the silhouette disappears. All 11 mon are individually nameable here.",
]
for mon, desc in MON:
    lines.append(f"//{url(mon, 0, 1.35, mon + ' (' + desc + ')')}")

lines.append("// -- palette variants on kikyo, from the curated set --")
for pname, th, ps in PALETTES:
    lines.append(f"//{url('kikyo', th, ps, 'Kikyo ' + pname)}")

lines.append("// -- the texture end of the dial: legible=0 reproduces 3.frag exactly --")
lines.append(f"//{url('kikyo', 0, 1.35, 'Kikyo texture (legible 0)', legible=0, k169='0.28', z='0.30')}")
lines.append("// ==== END PRESETS ====")

block = "\n".join(lines) + "\n"
marker = "// of 0.55 is a deliberate midpoint, not a tuned value.\n"
assert marker in src, "header marker not found"
src = src.replace(marker, marker + block, 1)
io.open(FRAG, "w", encoding="utf-8").write(src)
print(f"wrote {len(MON) + len(PALETTES) + 1} presets into {FRAG}")
