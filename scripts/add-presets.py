"""Write the twelve curated looks into 3.frag as preset URLs.

extractPresets() (scripts/shader-utils.js) picks up ANY comment line carrying an
http(s) URL that contains a '?', and the list page uses &name= as the label. So the
gallery and the in-app preset list stay in sync from one source: gallery-looks.json.
"""
import json
import io
import re
from urllib.parse import quote

FRAG = "shaders/redaphid/wip/lattice-bead/3.frag"
LOOKS = "journals/lab/shots/gallery-looks.json"
HOST = "https://visuals.beadfamous.com"

looks = json.load(io.open(LOOKS, encoding="utf-8"))
src = io.open(FRAG, encoding="utf-8").read()

# Idempotent: strip any preset block we wrote before, so re-running never duplicates.
src = re.sub(r"// ==== CURATED PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

lines = [
    "// ==== CURATED PRESETS (2026-09-04 overnight sweep) ====",
    "// Twelve looks from a 32-tile sweep of theme x paletteShift x navZoom. paletteShift 1.7 and",
    "// theme 3 are deliberately absent: 1.7 is the washed pink-lilac ('fuzzy terrible fuchsia') and",
    "// is also the shipped default; theme 3's ls=1.20 blows the pastel out across every hue.",
]
for L in looks:
    url = (
        f"{HOST}/?shader=redaphid/wip/lattice-bead/3"
        "&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls"
        "&image=images/beads/mon-kikyo.png&knob_161=1&knob_168=0.9&knob_169=0.28"
        "&autofly=1&wavelet=true&onset_refractory_ms=380&fullscreen=true"
        f"&theme={L['theme']}&paletteShift={L['ps']}&navZoom={L['z']}"
        f"&name={quote(L['name'])}"
    )
    lines.append(f"//{url}")
lines.append("// ==== END PRESETS ====")

block = "\n".join(lines) + "\n"

# Insert directly after the fork header block, before the inherited lattice-vj headers.
marker = "//   ?onset_refractory_ms=380 - at the default the detector free-runs at ~213 BPM chasing hats.\n"
if marker in src:
    src = src.replace(marker, marker + block, 1)
else:
    src = block + src

io.open(FRAG, "w", encoding="utf-8").write(src)
print(f"wrote {len(looks)} presets into {FRAG}")
