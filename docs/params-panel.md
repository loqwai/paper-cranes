# The params panel

Edit the URL on the visualizer without touching the address bar.

`edit.html` and `jam.html` have always had their own knob drawers. The visualizer
itself — the page you actually run a set from — had nothing: `index.js` read
`URLSearchParams` once at load and never looked again. Changing a texture, adding
a controller, or nudging a knob meant typing into a phone address bar in a dark
room. This is that missing surface.

## Opening it

- **Long-press the top-left corner** (600ms, 64px target)
- **`p`** on desktop
- **Escape** or tapping outside closes it

A short tap does *nothing*, deliberately. `index.html` already claims document
`click`/`touchend` for the 9-tap PWA install, and the canvas feeds
`touchstart`/`touchmove` straight into shader uniforms as `touch`/`touched`.
Neither taps nor drags were free, so the gesture had to be one that collides with
nothing. A faint dot marks the corner for the first few seconds after load, then
fades — nothing stays on screen during a set.

The panel does not mount at all on `jam.html`, `edit.html`, `vjpad.html`, or under
`?embed=true`.

## The three tabs

**Knobs** — only the knobs the current shader actually uses. They're found with
the same `/uniform\s+float\s+knob_(\d+)/g` scan `shader-wrapper.js` runs to decide
which uniforms to inject, plus bare `knob_N` references (the wrapper declares
`knob_1`–`knob_200`, so a shader can use one without declaring it). `plasma-knobs`
shows 28 rows, not 200. A knob the URL actually pins has a teal label; the rest are
sitting at their defaults.

**Settings** — the params the visualizer knows about, each with a control that
fits it: pickers for shader and texture, ordered chips for the controller chain,
toggles, selects, sliders. A control showing a greyed value is at the app's
default rather than something the URL pins.

**Other** — everything else, as editable key/value rows you can add, rename, and
delete. Numeric values become `uniform float` in the shader
(`shader-wrapper.js`). This is the escape hatch that replaces address-bar editing.

## Live vs. reload

`window.cranes.manualFeatures` is merged into the uniforms every frame, so knobs,
`smoothing`, `history_size`, and any custom numeric param apply **instantly** —
no navigation.

Anything that rebuilds the shader program or the audio graph can't: `shader`,
`image`, `controller`, `fft_size`, and the audio-source params. Those rows are
marked in amber and collected, so changing a texture doesn't reload the page on
every keystroke. One **Apply** does the whole batch as a single navigation, and
**Discard** drops it.

Which is which lives in `src/params/paramSchema.js`, as `LIVE` or `RELOAD` per
param. `fft_size` is `RELOAD` because `AudioProcessor` takes it in its
constructor; `smoothing` and `history_size` are `LIVE` because it re-reads them
from `manualFeatures` every frame.

## The controller chain

Repeated `?controller=` is a **left-fold pipeline**, not a set — order decides
which stage wins on a key clash, so it can't collapse to one value. The chain row
keeps it positional: chips with `‹`/`›` to reorder and `×` to remove. Reordering
is a reload-class edit.

## Actions

| Button | What it does |
|---|---|
| Copy link | The full URL, rebuilt from current state (not one debounce behind) |
| Copy clean | Same, with every `knob*` param stripped — the shader's own defaults |
| Reset knobs | Drops every `knob_N` and its `.min`/`.max` |
| Edit / Jam | The same params, on `edit.html` / `jam.html` |

## What this doesn't do

It makes long URLs *manageable*, not *shorter*. Every knob still costs three
params (`knob_71`, `knob_71.min`, `knob_71.max`), the longest preset URL in the
repo is still 2120 characters, and that still won't fit on an NTAG213 bead
bracelet (~137 bytes). Declaring knob names and ranges in the `.frag` — so the URL
carries only what differs from the default — is the fix for that, and is not part
of this change.

## Files

| File | Role |
|---|---|
| `src/params/paramSchema.js` | Which control each param gets, and live vs. reload |
| `src/params/ParamsPanel.js` | The component and its mount guard |
| `src/params/paramsPanel.css` | Styles — bottom sheet, ≥44px targets, dark |
| `src/params/paramSchema.test.js` | Unit tests for the knob-detection logic |

## One change outside the panel

`index.js` now owns a `ParamsManager` and its per-frame merge reads
`paramsManager.getAll()` instead of a `URLSearchParams` snapshot taken at load.
Without that, deleting a param in the panel removed it from the URL but the
snapshot kept feeding the old value to the shader forever. Values parse
identically to the old `parseUrlParams`, so this is a no-op for every existing
URL.

The raw `params` object is still there for `getAll('controller')` — which is
positional — and for the startup checks that only read once.
