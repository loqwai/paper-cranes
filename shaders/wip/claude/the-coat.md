# Dubstep Daddy — Working Notes

Live notes for ongoing work on `the-coat.frag`. Written so a future session can pick this up cold.

## What he is
A chunky, short-statured character shader shown in the PaperCranes visualizer. Curly hair, no mouth, pinpoint glowing eyes at rest. On drops his eyes blast god rays, the scene zooms in, a hot yellow wash floods the frame, and an infinity mirror of the previous frame kicks in behind him. Inspiration track pinned at the top of the shader as a Spotify link.

## Current state (branch: `shader/the-coat`)

### Shape and pose
- Short proportions (total figure ~65% the height of a "tall daddy"). Head center at `y=0.30` in centered NDC coords.
- Body built from `sdEllipse` (head, jaw, neck, chest, hips, shoulders) and `sdCapsule` (arms: upper + lower) and `sdCircle` (fists). All stitched with `smin(…, 0.04–0.06)`.
- Curly hair: 14 overlapping circles arranged in a crown from ear to ear, each with hashed jitter and an independent bounce phase — hair wiggles on every beat.
- Pose struct `makePose(beat_phase, hip_sway, snap, groove)` centralizes head nod, head tilt, hip pop, and hand positions so every body part moves in sync.

### Body language
- Head nod on the downbeat: `bob = -abs(sin(beat_phase)) * 0.04`
- Head tilts into the popped hip: `tilt = hip_sway * 0.18 + sin(beat_phase * 0.5) * 0.05`
- Hip pop alternates sides with a sharper-than-sin curve: `sign(hip_sway) * pow(abs(hip_sway), 0.6) * 0.05`
- Hands rest in a "DJ stance" and **flick outward on the snare** (`trebleZScore`) — left hand near hip, right hand near chest

### Eyes
- Tiny pinpoint dots at idle: `exp(-dot(p-le,p-le) * 2500)` with low base intensity (`0.25`)
- Grow brighter and shoot **god rays** on drop. Ray math:
  - 6-lobe fan via `pow(abs(cos(a * 6 + time * 0.8)), 14)`
  - Long radial reach `exp(-r * 1.2)` so rays cross the whole frame
  - Biased upward/outward so they don't shoot into the chest
- **Scene-wide eye wash**: much softer radial glow `exp(-r * 0.8)` blended over the whole frame during drops — the "room is glowing because his stare is blasting" effect

### Drop system
- Drop level is **purely immediate**: `drop_hit = clamp(max(IS_DROP, energyZScore * 0.5), 0, 1)` where `IS_DROP = clamp(energySlope * energyRSquared * 8, 0, 1)`
- **No accumulator.** An earlier version read drop state from the previous frame's alpha channel as a sustained accumulator — but `getLastFrameColor().a` reads 1.0 from the initial framebuffer texture on frame 0, pinning the drop state high forever and washing out idle. Don't reintroduce the accumulator unless you solve the bootstrap problem (hint: check `frame < N` AND explicitly write 0.0 to alpha in that cold-start window, AND verify the framebuffer actually has an alpha channel).

### Intensity zoom (subtronics-eye2 style)
- `zoomAmount = 1.0 + intensity * 0.6 + drop_hit * 0.9` where `intensity = max(energyNormalized, bassNormalized)`
- Pre-warps `uv` toward the head center before any SDFs are evaluated, so everything scales together
- Pattern lifted from `shaders/subtronics-eye2.frag` — see that file for the original recursive zoom reference

### Infinity mirror
- Recursive `(uv - head) * zoomFactor + head` with `fract()` wrap, sampling `getLastFrameColor()`
- Centered on the daddy's head
- **Only blended into the background**, not the body: `mix(col, mirror, drop_hit * (1 - body) * 0.55)`
- Hyper-saturated before blending so it doesn't wash out the scene

## Fixed bugs (don't reintroduce)

1. **Washed-out idle from stale feedback alpha** — the drop_state accumulator was reading 1.0 from initial framebuffer alpha, pinning drops on forever. Fix: use only immediate raw signals for `drop_hit`. If you re-add sustain, solve the bootstrap.

2. **The Fu Manchu mustache** — `sdGrin()` was a parabola implicit equation `abs(y + x²·2.5) - 0.007·along`. The `along` term only affected the subtraction, not the parabola itself, so anywhere on the curve `y = -2.5·x²` drew grin — which is an infinite parabola extending down past the viewport. The compositor's body-inside gate was also backwards (`smoothstep(-0.05, -0.02, d_body)` is 1 *outside* the body). Fix: **removed the mouth entirely**. User preference is "no mouth at all". Do not add one back without asking.

3. **Zoom compressing eye positions** — when intensity zoom is active, `uv` is shrunk toward `head_c`, which made `exp(-dot² * N)` falloffs balloon because distances compressed. If you ever compute eye/ray math outside the pre-zoom block again, use a saved `uv_unzoomed` copy. Currently the eye math uses the already-zoomed `uv` and just accepts the bloom, which matches the intended drop look.

4. **`sdEllipse` is non-euclidean** — the classic `(length(p/r) - 1) * min(r)` under-estimates distance along the minor axis, causing rim lighting to trace phantom level sets. Replaced with a gradient-normalized variant: `k1 * (k1 - 1) / k2` where `k2 = length(p / (r*r))`. Don't revert.

5. **`time` vs `iTime`** — The URL param `?time=3.5` freezes the `time` uniform but NOT `iTime`. All time-based math in this shader uses `time`, not `iTime`, so screenshots with `&time=X` are reproducible. Keep it that way.

## Testing protocol

Dev server runs on **port 6969** (Vite default).

**Screenshots go in `.playwright-mcp/`**, which is gitignored. Never save screenshots to the repo root.

**Idle test URL:**
```
http://localhost:6969/?shader=wip/claude/the-coat&noaudio=true&time=3.5&bassNormalized=0.3&energyNormalized=0.3&trebleZScore=0.0&energyZScore=0.0&energySlope=0.0&energyRSquared=0.5&midsNormalized=0.4&bassSlope=0.0&bassRSquared=0.5
```

**Drop test URL:**
```
http://localhost:6969/?shader=wip/claude/the-coat&noaudio=true&time=3.5&bassNormalized=0.95&energyNormalized=0.95&trebleZScore=1.5&energyZScore=2.5&energySlope=0.3&energyRSquared=0.95&midsNormalized=0.9&bassSlope=0.2&bassRSquared=0.9
```

`&time=3.5` holds time constant so screenshots are comparable across runs. Change the value to spot-check different phases of the beat/nod/sway.

Validate before committing:
```bash
node scripts/validate-shader.js shaders/wip/claude/the-coat.frag
```

## Fur coat variants

Two new shaders built on top of the base dubstep daddy:

### `the-coat-fur-coat.frag` — static variant
A pink synthwave fur coat with baked shape constants. The coat is a separate SDF layer built from:
- **Torso SDF** (chest + waist + hips) inflated by `FUR_THICK` to create the coat body
- **Sleeve capsules** from shoulder to wrist (hard union with torso, leaving armpit gaps)
- **Shoulder cap circles** smin'd at the junction for smooth shoulder seams
- **V-neck** carved via smooth subtraction (smin-based smooth max) so the neckline merges organically into the coat top — no hard corners that create phantom "back of collar" rim lines
- **Hem ellipse** extends the coat straight down off-screen

Shape constants are baked from a knob-tuning session. Each constant has a commented-out `#define` that switches it to knob mode for live editing.

Key design decisions:
- **No leather** — body fill is warm plum skin, not leather. The coat is the only garment.
- **Head lowered** (0.30→0.24) and bob amplitude reduced (0.04→0.025) so the head never disconnects from the neck/collar during the nod cycle.
- **Body chest aligned** at `P.hip * 0.7` (matching neck and V-neck) instead of 0.8, so the body doesn't poke out of the coat during hip sway.
- **Narrow neck** (0.035 half-width) so it reads as a thin neck column inside the coat collar.
- **Fluffy silhouette edge** via noise-perturbed SDF (`d_coat_fluff`) — the "fur" read comes from the shaggy outline, not internal texture.
- **Chrome rim + seam** match the synthwave aesthetic of the base shader.

### `the-coat-fur-coat-reactive.frag` — audio-reactive variant
Copy of the static variant with the coat responding to music:

| Audio Feature | Coat Response |
|---------------|---------------|
| `bassZScore` | Shoulders shrug up, color brightens |
| `bassNormalized` | Chest breathes wider |
| `trebleZScore` | Sleeves flare outward |
| `energyZScore` | Fur bristles thicker, V-neck opens wider |
| `IS_DROP + energyZScore` | Color shifts pink → hot peach/yellow |
| `spectralFluxNormalized` | Chrome rim blazes brighter, shoulder gleam pulses |
| `spectralEntropyNormalized` | Fractal fur fibers appear inside the coat |
| `spectralRoughnessNormalized` | Fractal fur fibers appear (combined with entropy) |
| `spectralKurtosisZScore` | Boosts fractal trigger when spectrum is peaked |
| `spectralCentroidNormalized` | Drives fractal warp speed (pitch-aware swirl) |

The **fractal fur fibers** are the headline feature: double domain-warped fbm producing swirling chrome-tinted strands that look like individual fur fibers catching light. They're triggered by spectral quality features (entropy, roughness, kurtosis) — completely independent from the energy/bass features that drive the eyes. This means the coat and eyes react to DIFFERENT musical qualities: eyes blast on drops (energy), coat swirls on timbral complexity (entropy/roughness).

Uses 21 audio features total.

### Fixed bugs specific to the coat variants

1. **Back-of-collar artifact** — the V-neck was carved with `max(inflated, -v_wedge)` which created closed triangle corners. The rim light traced those corners, producing a phantom collar edge visible above the front of the coat. Fix: smooth subtraction via `-smin(-inflated, v_wedge, k)` with an unbounded-upward wedge so no top corners exist.

2. **Coat off-center from neck** — the body's chest SDF used `P.hip * 0.8` while the coat torso used `P.hip * 0.7`, causing the body to shift more than the coat during hip sway. The viewer's right shoulder would poke out. Fix: aligned both to `P.hip * 0.7`.

3. **Head disconnecting from neck** — head resting position at y=0.30 left a gap above the coat top (~0.15). During the bob cycle, `bob=0` made the gap visible. Fix: lowered head to y=0.24, reduced bob amplitude.

4. **Shoulder flare/wings** — separate shoulder circles in `sdTorso` created bumps that inflated into flared wing shapes. Fix: removed shoulder circles from torso SDF; sleeves attach directly with shoulder cap circles at the junction.

## Open questions / possible next work

- Drop state is currently immediate-only. Should it sustain for a beat or two after the spike decays? If so, fix the accumulator bootstrap bug described above.
- The scene-wide eye wash at full drop is pretty blown out — the silhouette is barely visible. Might want to cap the wash at ~0.6 strength or tint the wash somewhere between yellow and red instead of pure `hot`.
- The daddy doesn't react to `pitchClass` at all. Could shift the base hue with the melody.
- The curl bounce is hashed-random-phase. Could drive it with per-curl `sin(beat_phase + i * 0.5)` to get a more legible "all bouncing together" look.
- No `@tags` in metadata yet — add tags for filtering on the list page.

## Reference shaders worth re-reading

- `shaders/subtronics-eye2.frag` — the recursive zoom-into-self pattern, `last()` helper with beat-gated feedback
- `shaders/wip/claude/void-bloom.frag` — good example of `#define` swap pattern for audio vs constant values
- `shaders/melted-satin/1.frag` — frame feedback + HSL manipulation reference

## Relevant memories

- [shader-techniques.md](../../../../.claude/projects/-Users-redaphid-Projects-paper-cranes/memory/shader-techniques.md) — slope-based animation control, gemstone rendering, fractal tendril shifting
- User prefers **never rebase, always fast-forward** on git operations
- Save screenshots to `.playwright-mcp/` (gitignored), never repo root
