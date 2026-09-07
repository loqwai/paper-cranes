# The VJ Pad (`/vjpad.html`)

A five-finger touch control surface for a phone. Fixed labelled rectangles; each
pad owns one finger and its X/Y drive two params, pushed to the display over the
same WebSocket the rest of the remote-control system uses. It is meant to be used
one-handed, in a dark room, mid-show — every decision below is downstream of that.

For the surface itself (why fixed zones, why banks, how multiple phones share)
read the header comment in `vjpad.js`. This document is about **where the layout
comes from**, i.e. how you point the pad at a shader that is not the one it was
built for.

## Three layers, and you never have to touch any of them

| Layer | Lives in | Good for |
|---|---|---|
| 1. checked-in layout | `vjpad-layouts.json` | the tuned presets: ranges, curves, colours, pad grouping, **non-knob** param names |
| 2. the shader itself | `// K141 TWIST STEP` comments → `shaders.json` at build time | zero config — correct numbers and usually correct names for *any* shader |
| 3. this phone | `localStorage['cranes-vjpad-layout']`, written by the EDIT screen | relabelling and re-pointing knobs without a laptop |

Layers 2 and 3 **patch**, they never replace. Relabelling an axis on a phone
cannot silently drop the range and curve underneath it.

Resolution order for the shader currently selected in the strip:

1. every bank in `vjpad-layouts.json` whose `match` matches the shader,
2. patched by this phone's overrides,
3. plus any banks this phone created,
4. plus auto-generated banks for every `knob_N` the shader reads that none of
   the above already covers.

Step 4 is the answer to "I opened the pad on a shader nobody wrote a layout
for". A pad of correctly-numbered, shader-named knobs beats a pad of somebody
else's parameters.

## `vjpad-layouts.json`

```jsonc
{
  "defaultShader": "redaphid/wip/lattice-vj/6",   // what the pad points at on a cold open
  "shaders": [{ "path": "redaphid/wip/lattice-vj/6", "label": "VJ6" }],  // the strip
  "banks": [
    {
      "name": "LATTICE",                          // shown on the bank chip
      "match": ["redaphid/wip/lattice-vj/*"],     // "*" = every shader; prefix globs allowed
      "live": "LIVE",                             // small honest line under the chip name
      "note": "knob_131–140 · SHAPE · lattice-vj/5 + /6",
      "knobBase": 131,                            // this bank's private knob mirror range
      "quietGate": true,                          // pin quietGate=1 while a pad is held
      "pads": [
        {
          "name": "FOLD",
          "hue": "#f472b6",
          "x": { "key": "knob_131", "label": "FOLD RATIO", "min": 0, "max": 1, "def": 0.162 },
          "y": { "key": "navZoom", "label": "ZOOM", "min": 0.04, "max": 8, "def": 1,
                 "curve": "exp", "suffix": "×", "decimals": 2 }
        }
      ]
    }
  ]
}
```

**Axis `key` is any param name, not just a knob.** `navX`, `waveletBassSpring`,
`quietGate`, `paletteShift` — anything `messageParams` can carry. That is why
the layout is a file and not derived purely from shader comments: a shader has
no way to declare `navZoom`, which belongs to a controller.

**`curve: "exp"`** maps the pad geometrically. Zoom needs it — `0.04 → 8` mapped
linearly puts every usable value in the first 2% of the pad.

**`knobBase`** is the bank's private `knob_N` mirror range: every axis publishes
its 0..1 pad position onto `knob_(knobBase + padIndex*2 + axis)` *in addition* to
the param it drives, which is what makes a phone behave like a bank of MIDI CCs.
It is explicit so a bank's mirrors stay put no matter where it lands in the list —
the lattice banks mirror onto the very knobs they drive, which is only true at a
fixed range. Omit it and the bank falls back to `101 + index*10`. Set
`"mirror": false` when the axes are already knobs and echoing them would write
uniforms the shader never asked for (auto-generated banks do this).

## Declaring knob names in a shader

`vite-plugins/shader-plugin.js` extracts, per shader, every `knob_N` referenced
and whatever name the source gives it, into a `knobs` field in `shaders.json`
(`"1|131:FOLD RATIO|132:DEPTH FOCUS"`). Two forms:

```glsl
gThetaStep = PI * (0.125 + EXA(knob_141, 0.20));   // K141 TWIST STEP (PI*0.025 .. PI*0.225)
// @knob: 141 TWIST STEP
```

The first is the convention the lattice shaders were already using on every knob
line, so several hundred knobs across the repo are already named — the parser
reads what is there rather than asking anyone to restate it. The name is the
leading run of ALL-CAPS words after the K-number; it stops at the first lowercase
word or punctuation, which is exactly where these comments stop naming and start
explaining. `// @knob:` is the explicit escape hatch and always wins.

Nothing about this is required. A shader that declares nothing still gets pads —
they are just labelled `K141` instead of `TWIST STEP`.

## Setting knob numbers and labels from the phone

The EDIT screen is deliberately **not** on the performance path: long-press the
**status line** in the header (~0.8s) — the one strip of the page with no control
on it, using a gesture nothing else on the page uses. While it is open the pad
grid and the RELEASE/RESET buttons are gone, so there is no half-open state to
fumble into mid-show.

One row per axis, all thumb-sized:

- **± steppers** walk the knob number (press and hold to travel fast). The label
  auto-fills from the shader's own declaration for whichever knob you land on.
- **the K-number chip** opens a sheet of every knob *this shader declares*,
  already named — one tap assigns number and label together. This is the
  keyboard-free path, and the usual one.
- **the label** opens a rename prompt. The only keyboard in the flow, and never
  needed to get a working pad.
- **+ PAD / + BANK** add pads and banks on the next free knob (161+ by default).
- **RESET** drops this phone's overrides for the current bank.

Edits are per-device and per-shader, stored under
`localStorage['cranes-vjpad-layout']`, exactly like the MIDI mapper's per-device
profiles in `cranes-midi-profiles`.

## Other local state

| Key | Holds |
|---|---|
| `vjpad-bank` | the pinned bank, **by name** (a bare integer is read as a legacy index) |
| `vjpad-shader` | the shader the pad is pointed at |
| `cranes-vjpad-knobs` | cached knob index from `shaders.json`, so a dead wifi moment does not cost you your pads |
| `cranes-vjpad-layout` | this phone's layout overrides |

`?shader=<path>` on the vjpad URL preselects the shader, overriding the
remembered one.

## Rejected alternatives

- **Everything in shader metadata.** A shader cannot honestly declare `navZoom`
  or `waveletBassSpring` — they belong to a controller — nor pad grouping,
  colours or exponential curves. It is the right home for *knob names*, which is
  exactly the slice it now owns.
- **Everything in localStorage.** Per-device is right for tweaks and wrong for
  the tuned presets: nothing is shareable, reviewable, or survives a cleared
  browser.
- **A config UI as the primary mechanism.** Any setup step before you can play
  is a regression. Zero-config had to stay genuinely zero.
