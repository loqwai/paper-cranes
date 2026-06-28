# Controllers

Controllers are JavaScript modules that run once per frame alongside the shader, with access to persistent state across frames. They receive all audio features as input and return computed values that become shader uniforms.

## When to Use a Controller

**Default to the shader.** GLSL should handle everything it can — parameter mapping, color math, animation, audio reactivity. Shaders are hot-swappable without page reload and keep all logic in one place.

Use a controller only when the shader literally cannot do what you need:

| Need | Use shader | Use controller |
|------|-----------|---------------|
| Map audio feature to visual parameter | Yes | No |
| Smooth a value over time | Yes (`mix(prev, new, 0.1)` via feedback) | No |
| Exponential decay / sustain latch | No — GLSL has no frame-to-frame scalar state | **Yes** |
| Accumulate a value across frames (counters, integrators) | No | **Yes** |
| Double-precision math (deep zoom) | No — GLSL floats are 32-bit | **Yes** |
| Complex state machines (mode switching, sequencing) | No | **Yes** |
| Read from external APIs or async sources | No | **Yes** |

**The rule:** if it needs memory of previous frames beyond what `getLastFrameColor()` provides, it belongs in a controller. Everything else belongs in the shader.

### Why Not Just Use the Alpha Channel?

You can encode a value in the alpha channel and read it back with `getLastFrameColor()`. This works for some cases but is fragile:
- Depends on framebuffer format (not all preserve alpha)
- Only gives you one float per pixel (or a few if you dedicate pixel locations)
- Interacts poorly with blend modes and post-processing
- Spatial — you're reading a pixel, not a global scalar

Controllers give you clean global scalars with real JavaScript math. Use them.

## How Controllers Work

### Precedence Chain

Controller outputs sit between raw audio features and URL params:

```
Audio features (lowest)  →  Controller features  →  URL params  →  Manual features (highest)
```

Any value returned from a controller becomes a `uniform float` in the shader, auto-injected by name. Return `{ drop_glow: 0.8 }` and the shader can use `uniform float drop_glow;`.

**Important:** Unlike audio features and knobs, controller-returned values need an explicit `uniform float` declaration in the shader because they're not part of the pre-built uniform list.

### File Structure

Controllers live in `controllers/` and are loaded via the `?controller=` URL param:

```
controllers/
├── example.js          # Documented example with make() pattern
├── simple.js           # Direct export pattern
├── the-coat.js        # Drop sustain with exponential decay
└── zoomer.js           # Deep zoom with double-precision splitting
```

### Two Patterns

**Direct export** (preferred for simple controllers):
```javascript
let state = 0

export default (features) => {
  state = Math.max(features.energyZScore, state * 0.97)
  return { my_value: state }
}
```

**Make function** (for controllers that need initialization):
```javascript
export function make(cranes) {
  const state = { counter: 0 }
  
  return (features) => {
    state.counter++
    return { frame_count: state.counter }
  }
}
```

`make()` is a **factory**: the loader calls it **once** (with `cranes`) and runs the
function it returns every frame. Put per-run state in the closure — it persists across
frames. (Prior to mid-2026 the loader returned `make` itself instead of calling it, so
`make`-pattern controllers re-initialized every frame; both `index.js` and the jam-page
hot-swap path now invoke `make()` correctly.)

### Loading

Add `?controller=<name>` to the URL (without `.js`):
```
/jam.html?shader=my-shader&audio=tab&controller=the-coat
```

The controller runs in a `requestAnimationFrame` loop managed by `index.js`. On the jam page, controllers hot-swap on file save without page reload (via the `controller-update` HMR event).

### Chaining (multiple controllers)

Repeat `?controller=` to load several controllers — they run as a **left-fold pipeline** each frame (`src/controllerChain.js`):

```
?controller=wavelet-ease&controller=lattice-nav&controller=my-fx
```

- **Order = URL order.** Each controller receives `{ ...base features, ...everything added by earlier controllers this frame }` and returns the features it adds. So a later controller can read an earlier one's output.
- **Last wins on key clash.** A cross-cutting controller (smoother, recorder, clamp…) just goes **last** so it sees and can override the full accumulated bag.
- **Each `?controller=` is its own stage** — listing the same controller more than once runs it that many times, each with its own `make()`/state, feeding into its own position in the pipeline (e.g. a transform applied twice, or a smoother before *and* after). Note: a controller that attaches global listeners/state will do so once per instance.
- This replaces the need to *wrap* one controller in another. (Existing self-wrapping controllers like `lattice-nav` still work; chaining is additive.)

### Async `make()`

`make()` may be `async` — it's awaited before the controller joins the loop, so you can dynamic-import, fetch config, or await device permissions during setup:

```js
export async function make(cranes) {
  const { thing } = await import('./heavy-thing.js')
  return (features) => ({ /* per-frame output */ })
}
```
Sync `make()` keeps working unchanged.

## Hot-Reload

On the jam page (`jam.html`), controller files hot-swap the same way shaders do:

1. You save a `.js` file in `controllers/`
2. The `editor-sync-plugin` chokidar watcher detects the change
3. It sends a `controller-update` HMR event
4. `jam.js` dynamically re-imports the module and swaps `window._hotController`
5. The existing animation loop picks up the new function on the next frame

No page reload, no audio interruption, no state loss in other systems. The controller's module-level state does reset on hot-reload (since it's a fresh import).

**Note:** Vite's built-in watcher is configured to ignore `controllers/` to prevent it from triggering a full page reload. Only our custom HMR path handles controller changes.

## Writing a Good Controller

### Keep It Minimal

The controller should do the one thing the shader can't — hold state across frames. All the creative mapping, scaling, and visual logic should still be in the shader. The controller just provides the raw sustained/accumulated value.

**Good:**
```javascript
// Controller: just the latch + decay
let glow = 0
export default (features) => {
  glow = features.energyZScore > 0.15
    ? Math.max(glow, Math.min(features.energyZScore, 1.0))
    : glow * 0.97
  return { drop_glow: glow }
}

// Shader: all the creative mapping
// uniform float drop_glow;
// float drop_hit = max(drop_now, drop_glow);
// ... use drop_hit for eyes, rays, wash, zoom
```

**Bad:**
```javascript
// Don't put visual logic in the controller
export default (features) => {
  const eyeBrightness = features.energyZScore * 1.8 + features.trebleZScore * 0.6
  const rayIntensity = Math.max(0, features.trebleZScore) * 2.0
  const washStrength = features.energyNormalized * 0.5
  return { eyeBrightness, rayIntensity, washStrength }
}
```

### Let Knobs Control Controller Behavior

Controllers can read knob values from the features object. This lets the user tune controller behavior from the knob drawer without editing JavaScript:

```javascript
let glow = 0
export default (features) => {
  // knob_13 controls decay rate from the drawer
  const decay = 0.94 + (features.knob_13 ?? 0.5) * 0.055
  // ...
}
```

### Declare Your Uniforms

The shader must explicitly declare any custom uniform the controller provides:

```glsl
uniform float drop_glow; // from controller
uniform float zoom_level; // from controller
```

Standard audio features and `knob_*` uniforms are auto-declared. Controller outputs are not.

## Examples

### Sustain / Decay Latch (the-coat.js)

The canonical use case. GLSL can't hold a scalar across frames, so a spike in `energyZScore` would only last one frame. The controller latches the peak value and decays it exponentially.

### Deep Zoom (zoomer.js)

GLSL floats are 32-bit, which limits zoom depth. The controller tracks camera position in JavaScript doubles and splits them into high/low float pairs for the shader to reconstruct.

### State Machine

A controller could track musical structure (verse → chorus → drop) and output a `section` float that the shader uses to crossfade between visual modes. This requires temporal memory that GLSL doesn't have.

### Smooth, animation-ready audio features (wavelet-ease.js)

`controllers/wavelet-ease.js` takes the fast [wavelet features](wavelet-analysis.md) and
makes them pleasant to animate with, without adding any easing code to your shader. Load it
with `?controller=wavelet-ease` (alongside `?wavelet=true`), then read the smoothed uniforms.

**Why a controller for this:** raw audio features are sawtooth-y — a kick snaps them up then
they decay, which makes visuals lurch. Smoothing needs frame-to-frame state, which GLSL
can't hold. The controller eases them once, centrally.

**Easing method — critically-damped spring.** We compared spring vs EMA vs slew-rate-limiting
vs attack/release (offline over 22 synthetic signals, then live). The **spring won for general
animation**: it eases in *and* out with gentle accel/decel (silky curves, no kinks), reacts
fast on big jumps, and never overshoots. A few practical findings worth keeping:
- **EMA** (a simple low-pass — what the FFT pipeline already applies) is fine for killing
  jitter but leaves sharp corners; it scored mid-pack. Don't expect it to look *flowing*.
- **Slew-rate limiting** (cap the per-frame change) is lowest-latency, but a loose cap reads
  as *angular* (constant-rate segments look like kinks). A tight cap is competitive with spring.
- **Use the right variant for the intent:** raw/`Normalized` shows "where the value *is*" (good
  for level/pitch — flows, shows glides); `ZScore` shows "is this *unusual* now" (spiky — use
  for triggers, hides steady trends); `Slope` shows "is it trending."

**It also derives signals the raw features can't express** (these need temporal state, so they
belong in a controller): `melodyFlow` (the synth melody/key as a flowing contour — pitch is
categorical and circular, so it's eased along the shorter arc and gated by tonal confidence),
`bassNoteFlow` (the bassline notes via a low-band energy centroid), `tonalStrength` (how
melodic vs noisy), and **wub detection** for dubstep — `wubDepth` ("how hard is it wobbling",
the animatable one) and `wubPulse` (the raw wob throb). See the file header for the full uniform
list and per-feature usage notes.
