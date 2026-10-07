# black-sun

**Intent:** `wip/urchin` is the backbone. Its spherized field of tube-spines radiates out of a black
hole (`wip/black-hole`) whose accretion is a psychedelic sun. Behind it sits the Van Gogh tile sky
from `wip/sunflowers`, with the hex mirror-fold lattice from `redaphid/lattice-interactive/3`
spiralling into the hole on a perpetual log-polar zoom. A sunflower field runs along the bottom, and
each flower's centre is a tiny black sun. The whole scene is gravitationally lensed around the hole
and flips inside the Einstein ring.

## Channel hierarchy
- **Geometry (time only):** lens, urchin clock (`iTime/300`), lattice log-polar zoom, disk spin, field drift.
- **Light (audio):** `bassNormalized` drives corona glow; `spectralCrestZScore` drives flare reach;
  `bassZScore` punches the photon ring; `midsNormalized` lights the urchin spines and sky tiles;
  `trebleNormalized` lights the spine tips and lattice sparkle; `spectralFluxZScore` lights the
  lattice. Everything is gated by `smoothstep(.01,.06, energyMean)`.
- **Color (slow):** `pitchClassMedian`, `spectralCentroidMean`, the set clock and `seed`.

## Knobs (0 = designed look)
- K1 HOLE SIZE
- K2 HUE SPIN
- K3 LATTICE

Shader-only; no controller.

## Iterations
- 1.frag: first build. Urchin raymarch is 64 steps × 5 tubes. It is desktop-only (`@mobile: false`).

## 2.frag — fork (2026-10-06, rehearsal for Friday show)

Snapshot of the live 1.frag right after the sunflower field was removed (`PERF-NOFLOWERS`), before the remaining perf cuts and the iris-eye evolution. Urchin spines fill the whole frame on black, cyan inner spines / magenta-orange-yellow outer spines, black core with a cyan photon ring and tilted accretion streak. No knobs touched (K1/K2/K3 at 0 = designed look). Audio: BlackHole 2ch as OS default input, music similar to Friday's set. No controller.

Preset: `jam.html?shader=claude/wip/black-sun/2&vj=1&remote=display`

## 3.frag — fork (2026-10-06, rehearsal)

Snapshot of live 1.frag mid-rework: sunflowers gone, simplified flat spines radiating from the eye, eye-morph in progress (green fibrous iris, black pupil, dark limbal ring), blue stroma ring, brown tiled sky behind. Captured BEFORE the oklch / no-short-term-color / eye-flicker fixes the user asked for, so the eye may still flicker and the hue may still respond to fast features. No knobs moved; no controller.

Preset: `jam.html?shader=claude/wip/black-sun/3&vj=1&remote=display`

## 4.frag — fork (2026-10-06, rehearsal)

The live code at this /fork was byte-identical to 3.frag; what had changed was the time-evolved state — the eye-morph accumulator had finished, giving a fully formed teal-and-green fibrous iris with a black pupil and dark scalloped limbal ring, spines radiating from it over the brown tiles. A plain copy would reopen as the black hole (the accumulator resets on load), so 4.frag pins `m = 1.0`: it opens as the finished eye. Otherwise identical to 3.frag (pre-oklch, pre-flicker-fix). No knobs; no controller.

Preset: `jam.html?shader=claude/wip/black-sun/4&vj=1&remote=display`

## 1.frag — Beat 2 rework (2026-10-06 rehearsal, live hot-swaps)

### Performance
- The urchin raymarch was **100 % of frame cost** (stub-bisect: no-urchin → p95 17.4 ms; everything
  else free). 64 → 32 steps passed when the laptop was cool, then **thermal throttling** brought it back
  to p95 67 ms. Replaced with an analytic 2D tendril field. Now p95 ≈ 17.6 ms, 0/600 frames > 32 ms.
- Sunflower field removed (user: too slow; not the main cost, but gone).

### Eye
- Black-hole sun → iris eye over `EYE_SECS` (180 s), **one-way**: an accumulator stored 16-bit in
  stash pixel (0,0) (`iTime` wraps every 1000 s — `index.js:264` — so it can't carry a monotonic
  morph). The blue=77 signature makes a hot-swap or framebuffer reset read as 0, which restarts the
  morph. A framebuffer resize (dynamic-resolution step) will also restart it.
- Neon-tube iris: strands **index-aligned with the tendril fields** (26 + 41), so each fibre
  continues as a tendril. Collarette ring, crypts, soft limbal glow, and a feathered edge (no rim).
- Flicker fix: the old accretion trail was a `max()` against the previous frame rotated 0.015 rad/frame
  over the whole iris → a strobing moiré of the fibres. It's now kept off the eye, and the eye is
  temporally low-passed (70 % of the unrotated previous frame). Meter flicker is 0.05.

### In-shader controller (stash row, pixels 0..21 of row 0)
dodeca-bloom's maths, ported so no `?controller=` / reload is needed: slow EMAs (a=0.05),
fast bass pump (a=0.28), latched drop glow, monotonic flow phase (rate ← entropy + centroid).
The tendril shape stats are EMA'd again (a=0.004, about 4 s) so a median that steps at a track
change bends the field instead of snapping it.

### Audio map (16 features)
| Feature (stat) | Drives | Layer |
|---|---|---|
| spectralCentroidMedian | tendril curl amount | shape |
| spectralSkewMean | curl direction | shape |
| bassMedian | tendril sway amplitude | shape |
| spectralEntropyMedian | sway waviness | shape |
| spectralRolloffMean | tendril reach | shape |
| spectralKurtosisMedian | tendril thickness | shape |
| energySlope × energyRSquared | twist **rate** (confident builds turn the field) | motion |
| spectralSpreadMean | sway **rate** | motion |
| spectralEntropyNormalized (EMA) + spectralCentroidNormalized (EMA) | flow-phase **rate**; entropy also crypt "wink" | motion / light |
| spectralFluxZScore (EMA) | light pulses travelling out the tendrils | light |
| spectralRoughnessZScore (EMA) | grain/crackle along the tubes | light |
| bassNormalized (EMA + fast pump) | iris core glow, pupil contraction, limbal glow, radiation bands | light |
| midsNormalized (EMA) | iris arms + collarette, tendril glow | light |
| trebleNormalized (EMA) | iris tips, strand glints, shimmer, tendril tip flare | light |
| energyZScore / bassZScore | drop-glow latch; gravity-wave amplitude (EMA) | light |
| spectralCrestZScore | corona flare reach | light |
| pitchClassMedian + spectralCentroidMean + slow clock + seed | the ONE key hue | color |
| energyMean | quiet gate on everything | gate |

### Palette (ONE-PALETTE, OKLCH)
Every colour is an offset of a single slow key hue `gH0`: pupil near-black, iris = key hue at high
chroma, tendrils step up to about +45° toward the tip, sky/tiles = same family at low lightness and
chroma. The photon ring is the single accent (+162°). `psy()` is now OKLCH via the shared `oklch2rgb`.

### Gravity waves
The previous frame is resampled through an outward-travelling radial ripple (constant-rate monotonic
clock, 3 crests per turn) plus a slow inward swirl, decay ×0.96 at 42 % mix, outside the eye only.
The stash row is never sampled. Audio sets the ripple amplitude only.

### Known issue
`iTime` wraps at 1000 s, so the sky, lattice and corona `t` terms jump about every 16.7 min. The
tendrils and eye run on stash phases and are immune.

### 1.frag — palette + "go big" audio pass (supersedes ONE-PALETTE above)
The user wanted many colours, not one shade, plus much more audio reactivity.
- **Designed palette** `MIAMI[15]` (OKLCH L, C, h°). Fixed offsets; the whole table rotates on the
  `gPal` stash clock (about 25 min per turn, starting at 0 on load, so the set opens on these colours).
  - Eye (Miami jewel): coral / turquoise / sand fibres, hot-pink→violet pupil glow, orange collarette,
    aqua limbus, ocean/violet ground.
  - Tendrils: red-magenta → raspberry → magenta → red-violet → violet-pink, root to tip, three shades
    across tendrils. The back layer is red-violet.
  - Sky: the original Van Gogh blue tiles; gold star/cloud strokes.
  - Effects in gold: photon ring, glints, tip flares, the kick ring, ripple crests, lattice, sun-glow.
- **Never white**: a hue-preserving limiter (`f *= 0.93 / maxChannel`) replaces the channel clamp.
- **Envelopes** are attack-fast/release-slow (`envAR`) on z-scores. The old slow EMAs of
  `*Normalized` sat around 0.5, which is why it looked static.
- **Kick pulse**: on a bass/energy z-score onset (0.5 s refractory), a gold ring leaves the pupil,
  crosses the iris and runs out along every tendril over about 1 s (`KICK-PULSE`).

| Feature | Drives (gain vs before) |
|---|---|
| bassZScore (AR) | pupil bloom, tendril-root flood, ripple amplitude, iris core, sky sun-glow (3–5×) |
| bassZScore / energyZScore onset | the travelling kick ring, gold rim slam, ripple kick |
| midsZScore (AR) | iris fibre shimmer, collarette, tendril glow |
| trebleZScore (AR) | gold glints racing to the tendril tips, iris sparkle, tip flares |
| spectralFluxZScore (AR) | flux pulses along the tendrils, ripple bursts, gold ripple crests |
| spectralRoughnessZScore (AR) | tube crackle/grain depth |
| spectralCrestZScore (AR) | tendril glow-halo width |
| spectralEntropyNormalized (EMA) | crypts opening (aqua), flow rate |
| spectralCentroidZScore (AR) | brightness gradient along tendrils (bright roots ↔ bright tips) |
| spectralRolloffZScore (AR) | pushes light to the outer field |
| slow stats (centroid/skew/bass/entropy/rolloff/kurtosis medians/means, energy slope×R², spread) | tendril shape and motion rates, as before |

## 5.frag — fork (2026-10-06, rehearsal)

Live 1.frag after the big pass: raymarch replaced by analytic continuous tendrils (p95 66.8 → 17.6 ms), iris/7 audio→anatomy port, gravity ripples via feedback, 16 features wired (see feature map above), oklch palette. Look at fork time: turquoise/cyan iris with gold-orange collarette and dark violet-pink pupil; red-magenta→pink tendrils curling out of the iris fibers; blue Van Gogh tile sky with a gold stroke band; gold kick rings. Meter: flicker 0.12, clip 0, lumMin 0.15, rResid 0.19. No knobs moved; no controller. Audio: BlackHole 2ch (OS default).

Note: the eye morph + palette rotation + audio envelopes live in the feedback buffer's bottom row, so loading 5.frag fresh starts as the black hole and morphs to this eye over 180 s.

Preset: `jam.html?shader=claude/wip/black-sun/5&vj=1&remote=display`

## 6.frag — fork (2026-10-06, rehearsal)

Live 1.frag mid clip-fix / distortion-ring pass (markers: NEVER-WHITE, EYE-LOWPASS, KICK-WAVES2). Look at fork time: tendrils back to raspberry/magenta/red-violet, aqua limbus with dark fiber spokes, gold-orange wavy collarette, hot-pink pupil glow around a near-black pupil (thin dark outline still present), blue Van Gogh tile sky with gold stroke bands. Captured before the "slower, thinner, more intense, deliberate" ripple change and the critic's remaining eye fixes. No knobs; no controller. Loads as the black hole, morphs to the eye over 180 s.

Preset: `jam.html?shader=claude/wip/black-sun/6&vj=1&remote=display`

## 7.frag — fork (2026-10-06, rehearsal)

Live 1.frag with the deliberate kick waves (KICK-WAVES3: ~1.6 s refractory, one thin intense lensing front per kick) and a softer violet-leaning palette: violet/magenta/hot-pink tendrils with pale sparkle beads, muted teal-blue iris disc with fine violet fibers and lilac crypt dots, thin gold wavy collarette, deep violet pupil glow, blue Van Gogh tile sky with a gold stroke band. Captured before the sun-ray rendering, iris-fiber coiling, scene-keyed eye palette, and the `sun` variant. No knobs; no controller. Loads as the black hole, morphs to the eye over 180 s.

Preset: `jam.html?shader=claude/wip/black-sun/7&vj=1&remote=display`

## sun-2.frag — fork of live sun-1 (2026-10-06, rehearsal)

The sun variant as it stood at this /fork: glowing amber→coral sun rays (SUN-RAYS soft limit) curling out from the eye with a gold halo blooming onto the blue Van Gogh tile sky; eye still the older dark navy iris with fine pale fibers, thin gold wavy collarette and black pupil (the plasma-sun eye + JS controller were not in yet). Thin, deliberate kick waves (KICK-WAVES3). No knobs; no controller. Loads as the black hole, morphs over 180 s.

Preset: `jam.html?shader=claude/wip/black-sun/sun-2&vj=1&remote=display`

## sun-3.frag + controllers/black-sun-sun-3.js — fork of live sun-1 (2026-10-06, rehearsal)

First fork of the controller era. The page had just reloaded with `controller=black-sun`, so the frame was the opening state: an eclipse — black pupil/hole with a tilted ember accretion streak, a thin gold photon ring, and sharp gold-amber sun rays fanning out over the blue Van Gogh tile sky with a gold stroke band sweeping across. The controller (snapshot copied to `controllers/black-sun-sun-3.js` because the shader reads its uniforms) supplies bs_time, bs_eye (one-way morph), audio envelopes (bass/mids/treb/energy/entropy/centroid/flux/rough/crest/roll/pump/drop), kick (bs_kick/bs_kAge/bs_kAmp), ray shape (curl/dir/flex/wave/len/thick/flow/twist/flexPh) and bs_pal. Plasma-sun eye and camera-shutter iris were not in yet. No knobs.

Preset: `jam.html?shader=claude/wip/black-sun/sun-3&controller=black-sun-sun-3&vj=1&remote=display`

## sun-4.frag + controllers/black-sun-sun-4.js — fork of live sun-1 (2026-10-06, rehearsal)

Black-hole phase (bs_eye 0.17, bs_pal fixed — now a real number): small black shadow with a lensed ember-gold disk sliver beneath it, a hot gold glow core, and long curling amber sun-ray tendrils swirling out in a pinwheel over the blue Van Gogh tile sky, with the gold stroke band now spreading into big swirling cloud masses. Captured mid audio-reactivity / accretion-disk / dancing-tiles pass (the full Gargantua disk was not in yet). No knobs. Controller snapshot copied alongside because the shader reads its uniforms.

Preset: `jam.html?shader=claude/wip/black-sun/sun-4&controller=black-sun-sun-4&vj=1&remote=display`

## sun-1.frag + controllers/black-sun.js — the live sun line (2026-10-06, rehearsal)

**URL:** `jam.html?shader=claude/wip/black-sun/sun-1&controller=black-sun&vj=1&remote=display`
(the controller is required — without it every `bs_*` is 0 and HOLE_R collapses).

**Controller** (`controllers/black-sun.js`) replaced the feedback-buffer stash row. State lives on
`window.__blackSunState`, so a hot swap of the controller resumes instead of resetting; everything is
seconds-based (frame-rate independent) and survives canvas resizes and the 1000 s iTime wrap. Audio
state only advances on frames where every input feature is a finite number (the first frames after
load are NaN, and a NaN in an envelope stuck forever — that was the null `bs_pal`). Non-finite output
throws. Uniforms:

| uniform | what |
|---|---|
| bs_time | monotonic seconds, replaces iTime |
| bs_eye | one-way black-hole → eye morph over 180 s |
| bs_bass / bs_mids / bs_treb | attack-fast/release-slow envelopes on z-scores |
| bs_energy / bs_entropy / bs_pump | slow EMAs of normalized features |
| bs_centroid / bs_flux / bs_rough / bs_crest / bs_roll / bs_drop | envelopes |
| bs_kick, bs_kAge, bs_kAmp | kick envelope (0.5 s release) + one lensing wavefront per onset (1.6 s refractory, 3 s life) |
| bs_curl / bs_dir / bs_flex / bs_wave / bs_len / bs_thick | ray shape from slow stats, eased ~4 s |
| bs_flow / bs_twist / bs_flexPh / bs_pal | monotonic phase clocks in turns (fract), audio sets the rate |
| bs_diskPh | unwrapped orbit clock (radians), mids speed it |
| bs_irisScale, bs_shutter, bs_shutterAng | section-change eye resize (0.7–1.25) behind an 8-blade spiral camera shutter, 1.6 s, 12 s refractory; events = ~3 s sustained energy/flux z excursions, confident build/drop trend, or the quiet gate flipping |

**Shader changes in this pass:**
- **Eye clipping fixed** (`EYE-TONE`): the eye stack ran 3–10× over range, so the frame-wide never-white scale flattened up to 79% of the eye disk into one plateau at 0.93 (meter clip stayed 0 — its threshold is 0.98). Now an OKLab soft knee on L + chroma ease + gamut pull; collarette and limbus are laid over (mix), not summed.
- **Gamut mapping** (`gamutLch`): every palette colour shrinks chroma at constant L/hue until it fits sRGB instead of clamping RGB.
- **No painted rings** (`KICK-WAVES`): gold kick ring, ripple crests, concentric shimmer bands removed. Kicks launch one thin, slow, intense refraction front through the previous frame (distortion only); glints scattered per fibre.
- **Sun rays** (`SUN-RAYS`): emissive corona streamers — a few long dominant rays among short thin ones, wide glowing bases tapering to fading tips, additive light with a hue-preserving knee.
- **Iris fibres coil with the rays** (`FIBRE-COIL`): one shared shear field, continued inward.
- **Plasma sun** (`PLASMA-SUN`, `SUN-DISC`): the iris body is a photosphere (two plasma octaves, limb-darkened gold → ember); the centre is a luminous plasma disc with granulation, filament glints (treble), magenta/violet veins (slow palette). Nothing black.
- **Gargantua disk** (`GARGANTUA`): tilted plasma band around the disc with a lensed far-side halo and photon ring, Doppler-beamed; inner/outer rotate as rigid layers (`NO-WINDING` — a radius-dependent spin winds into tighter rings forever).
- **Audio ×3–5** (`AUDIO-5X`): GATE retuned to the line feed (0.003–0.015 energyMean — the old range held everything at ~25%); bass/kick pump rays, disk, photon ring; flux throws corona flares; treble sparkle doubled.
- **Dancing tiles** (`TILE-DANCE`): bass opens tile gaps, mids stretch tiles, treble shimmers edge tiles, energy moves the cloud edge, the kick front lights tiles it crosses.
- **LSD clouds** (`LSD-CLOUDS`): cloud tiles take 1960s poster-art contour bands by depth inside the cloud, adjacent bands near-complementary at matched lightness, sequence opening on the sun's gold; turns slowly on bs_pal.

Meter at the end of the pass: clip 0, flicker 0.30, p95 17.7 ms, lum 0.46 (bright — the sun dominates). rResid stayed near 0 on this window.

## sun-5.frag + controllers/black-sun-sun-5.js — fork of live sun-1 (2026-10-06, rehearsal)

Eye phase (bs_eye 0.89): a big eye fills the center — a small churning plasma-sun core (gold with magenta/violet plasma seams) inside a gold ring, wrapped in a wide dark-amber iris of curved pale-gold filament spokes with ember crypt dots, a soft gold limbus, and broad molten-gold sun rays flaring out between violet-blue tile wedges of sky; the left cloud band is starting to carry psychedelic stripe colors (lime/coral/gold tiles). Captured mid-pass on: plasma-sun center, LSD-poster cloud bands, audio reactivity. Very warm/bright overall at this moment. No knobs. Controller snapshot alongside.

Preset: `jam.html?shader=claude/wip/black-sun/sun-5&controller=black-sun-sun-5&vj=1&remote=display`

**Later in the same pass (sun-1):** `K4 ZOOM` (knob_4) scales eye/sun/rays/lens about the centre, `0.55·exp(1.0033·k)` = 0.55×..1.5× of the old size; knob 0 puts the full eye at ~28% of screen height. Ray halo and sky sun-glow pulled down and the ground deepened (`DARK-FLOOR`, `DARK-FLOOR2`). 28 s meter after: lum 0.31, dark 0.065, lumMin 0.22, clip 0, flicker 0.38, motionVsBass 0.40, rResid −0.19, p95 17.4 ms.

**Sky lock (sun-1):** the sky tiles no longer ride the full palette clock (they had rotated to maroon). Every table colour now sways at most ±20°, the sky ±15° (`SKY-LOCK`); only the LSD cloud bands and plasma veins turn with bs_pal. Clouds may sweep the whole frame and the threshold dropped so they cover roughly a third of it (`CLOUD-PRESENCE`); tile gaps darkened for the dark floor (`DARK-FLOOR3`).

**Plasma ball + critic #2 (sun-1):** the eye is now one plasma sphere (`PLASMA-BALL`) — no black, no straight spokes: the sun disc swells into it over the morph; domain-warped plasma with curling magnetic arcs (width floored by fwidth so they can't alias), spherical bulge, limb-graded gold → ember, corona boiling off the limb with flux flares. Rays graded yellow root → amber → ember → red-magenta tip, ±15° per ray (`RAY-GRADE`); bass pumps glow width with brightness; kick fronts bend ~2.5× harder (`KICK-BEND`); sparks thicken with treble at low spatial frequency; a flux onset launches one plasma blob out along one ray (`FLUX-FLARE`, controller `bs_fAge/bs_fId/bs_fAmp`); rays only add light (`CLEAN-HALO`); orbiting disk is hot magenta/red (`DISK-MAGENTA`); LSD band hues swapped lime for turquoise/sky-cyan.

**Freeze incident:** the flux-flare fields didn't exist in the `window.__blackSunState` object an older controller had created, `S.fAge + dt` latched NaN, and the fail-loud `out()` threw every frame — every `bs_*` froze (bs_time stuck at 510 s) until the page state was repaired. `make()` now backfills missing keys and repairs any non-finite numeric field from DEFAULTS.

**Haze cut (sun-1, `HAZE-CUT`):** corona falloff steepened (exp 12→5 instead of 6→2.5, rest amplitude 0.45→0.3), ray glow width at rest 0.8→0.55 with the same bass peak, ray halo 0.16→0.07. 20 s meter after: lum 0.28, dark 0.08, lumMin 0.21, clip 0, flicker 0.20, hueConc 0.31, rResid 0.27.

**Storylines + big waves (sun-1):** see `shaders/claude/wip/sun/sun.md` and `docs/storylines.md` — the line continues in `sun/`.
