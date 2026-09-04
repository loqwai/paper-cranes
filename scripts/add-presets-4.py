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
PALETTES = [("Jade", 0, 1.35), ("Deep Cyan", 1, 0.45), ("Ember", 1, 1.05),
            ("Violet", 1, 0.75), ("Acid Lime", 0, 0.15)]


# PALETTE CORRECTION (measured 2026-09-04, seeds pinned, recognition framing):
#     true default (no theme/pShift)   contrast 41.1   p999 155   gamut crush  0.0%
#     theme 0 + paletteShift 1.35      contrast 44.0   p999 172   gamut crush 13.0%   <- was the default here
#     theme 1 + paletteShift 0.75      contrast 28.1   p999 113   gamut crush 10.4%
#     theme 2 + paletteShift 0.45      contrast 46.4   p999 180   gamut crush  0.0%
# theme 0 / 1.35 is the "jet colormap" the art critic called the ugliest thing in the set, and it
# also CRUSHES 13% of pixels - the worst gamut behaviour of any variant. Every one of the eleven
# recognition presets used it. They now ship on the BARE DEFAULT, which measures zero crush and
# near-identical contrast, and reads blue/violet on near-black rather than thermal-camera.
#
# NOTE ON THE NAMES: the overnight sweep's labels ("Deep Cyan", "Jade") do NOT transfer. `s`
# carries seed + regionHue(world) + field, so the same theme/paletteShift renders a different hue
# at a different seed or framing - "Deep Cyan" measures olive here. Render, do not predict.
def url(mon, theme, ps, name, legible=1, k169="0.60", z="0.14"):
    return (
        f"{HOST}/?shader=redaphid/wip/lattice-bead/4"
        "&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls"
        f"&image=images/beads/mon-{mon}.png&knob_161=1&knob_168=1.0&knob_169={k169}"
        f"&legible={legible}&navZoom0={z}&autofly=1&wavelet=true&onset_refractory_ms=380"
        f"&fullscreen=true&theme={theme}&paletteShift0={ps}&name={quote(name)}"
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
    # no theme / paletteShift: the bare default measured 0% crush against 13% for theme 0 / 1.35
    u = url(mon, 0, 1.35, mon + " (" + desc + ")")
    u = u.replace("&theme=0", "").replace("&paletteShift0=1.35", "")
    lines.append(f"//{u}")

# mon x palette. Verified at legible=1 in journals/lab/shots/legible-palette.png: all five
# palettes hold once the interior is flattened, and because each mon is now a DISTINCT
# recognisable shape this is real variety, not one wash re-tinted. Five shapes with the most
# different silhouettes get the full palette set; the rest ship in Jade above.
lines.append("// -- mon x palette: the same five silhouettes in each curated palette --")
for mon in ["hakkaku", "tomoe", "kiku", "matsukawa", "kikko"]:
    for pname, th, ps in PALETTES[1:]:
        lines.append(f"//{url(mon, th, ps, mon + ' ' + pname)}")

lines.append("// -- the texture end of the dial: legible=0 reproduces 3.frag exactly --")
_tex = url("kikyo", 0, 1.35, "Kikyo texture (legible 0)", legible=0, k169="0.28", z="0.30")
_tex = _tex.replace("&theme=0", "").replace("&paletteShift0=1.35", "")   # off the 13%-crush palette too
lines.append(f"//{_tex}")
lines.append("// ==== END PRESETS ====")

block = "\n".join(lines) + "\n"
marker = "// of 0 is off; the recognition presets below set it to 1 explicitly.\n"
assert marker in src, "header marker not found"
src = src.replace(marker, marker + block, 1)
io.open(FRAG, "w", encoding="utf-8").write(src)
print(f"wrote {len(lines) - 7} presets into {FRAG}")
