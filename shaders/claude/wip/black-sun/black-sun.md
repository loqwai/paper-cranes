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

### sun-1 — show-night pass (2026-10-09): knobs 1–10, slow features, sky calm

The user can't touch the dials tonight, so **knobs at 0 are the show look**, and every improvement is baked into the defaults.

**Knobs:**
- K1–K4 are as before; each now has a commented-out constant swap line.
- K5 STORY, K6 REACH and K7 KISS are read by `controllers/black-sun.js`; the shader only labels them with `@knob:`.
- New: K8 CLOUD CALM (extra calm on top of the default), K9 REACT (audio 1×–2.5× through GATE), K10 FADE (master fade to black).

**Slow, long-term features** (`SLOW_GATE` block). These follow the guidance in `wavelet-scope/legible.frag`: each verb maps to something you can hear. Each feature reads the character of the current section, never a single moment, and drives an amount (never a phase or position), so the picture evolves through a set without anyone touching it and nothing can flash. Where the raw level depends on input gain, the feature uses a gain-independent ratio:

| Feature | Visual verb | Why it can't flash |
|---|---|---|
| AIR: treble share of the band medians | lattice glints; stars brighten in deep space | a median over 8 s, and a ratio, so gain doesn't matter |
| BODY: mids share | gold cloud bands spread; galaxy arms widen in deep space | a median ratio; it moves a threshold slowly |
| TONAL: `spectralCrestMedian` | whole-frame chroma lift, 1.15 → 1.27 | a median; it only ever adds chroma, never mixes toward grey |
| GRIT: `spectralRoughnessMedian` | the sun's granulation contrast (the mean is kept) | a median; contrast only, so the overall brightness holds |
| DYN: energy std ÷ mean | deeper dark floor; wider empty gaps in deep space | window statistics; it only ever darkens |
| PUNCH: bass std ÷ mean | corona reach ×0.9–1.15 | window statistics |
| BRIGHTEN: centroid slope × R² | sky glow ±0.05 | a regression over the window, clamped |

All seven features are multiplied by a slow gate on `energyMean`, so silence brings back the resting look.

**Sky calm, baked in** (art-critic #1). The cloud bands sit about 40% calmer than before, reaching the full 40% at the sun and fading to about 22% at the edge, and the tiles near the sun dim a little, so the sun owns the centre. It's a move in hue back toward the blue brush tiles, not toward grey.

**No grey halo** (art-critic #2). The sun's corona glows used to be added on top of the blue sky, which averaged to grey. Now they occlude the sky beneath them first (lowering lightness), then add their own colour.

## sun-5.frag + controllers/black-sun-sun-5.js — fork of live sun-1 (2026-10-06, rehearsal)

Eye phase (bs_eye 0.89): a big eye fills the center — a small churning plasma-sun core (gold with magenta/violet plasma seams) inside a gold ring, wrapped in a wide dark-amber iris of curved pale-gold filament spokes with ember crypt dots, a soft gold limbus, and broad molten-gold sun rays flaring out between violet-blue tile wedges of sky; the left cloud band is starting to carry psychedelic stripe colors (lime/coral/gold tiles). Captured mid-pass on: plasma-sun center, LSD-poster cloud bands, audio reactivity. Very warm/bright overall at this moment. No knobs. Controller snapshot alongside.

Preset: `jam.html?shader=claude/wip/black-sun/sun-5&controller=black-sun-sun-5&vj=1&remote=display`

**Later in the same pass (sun-1):** `K4 ZOOM` (knob_4) scales eye/sun/rays/lens about the centre, `0.55·exp(1.0033·k)` = 0.55×..1.5× of the old size; knob 0 puts the full eye at ~28% of screen height. Ray halo and sky sun-glow pulled down and the ground deepened (`DARK-FLOOR`, `DARK-FLOOR2`). 28 s meter after: lum 0.31, dark 0.065, lumMin 0.22, clip 0, flicker 0.38, motionVsBass 0.40, rResid −0.19, p95 17.4 ms.

**Sky lock (sun-1):** the sky tiles no longer ride the full palette clock (they had rotated to maroon). Every table colour now sways at most ±20°, the sky ±15° (`SKY-LOCK`); only the LSD cloud bands and plasma veins turn with bs_pal. Clouds may sweep the whole frame and the threshold dropped so they cover roughly a third of it (`CLOUD-PRESENCE`); tile gaps darkened for the dark floor (`DARK-FLOOR3`).

**Plasma ball + critic #2 (sun-1):** the eye is now one plasma sphere (`PLASMA-BALL`) — no black, no straight spokes: the sun disc swells into it over the morph; domain-warped plasma with curling magnetic arcs (width floored by fwidth so they can't alias), spherical bulge, limb-graded gold → ember, corona boiling off the limb with flux flares. Rays graded yellow root → amber → ember → red-magenta tip, ±15° per ray (`RAY-GRADE`); bass pumps glow width with brightness; kick fronts bend ~2.5× harder (`KICK-BEND`); sparks thicken with treble at low spatial frequency; a flux onset launches one plasma blob out along one ray (`FLUX-FLARE`, controller `bs_fAge/bs_fId/bs_fAmp`); rays only add light (`CLEAN-HALO`); orbiting disk is hot magenta/red (`DISK-MAGENTA`); LSD band hues swapped lime for turquoise/sky-cyan.

**Freeze incident:** the flux-flare fields didn't exist in the `window.__blackSunState` object an older controller had created, `S.fAge + dt` latched NaN, and the fail-loud `out()` threw every frame — every `bs_*` froze (bs_time stuck at 510 s) until the page state was repaired. `make()` now backfills missing keys and repairs any non-finite numeric field from DEFAULTS.

**Haze cut (sun-1, `HAZE-CUT`):** corona falloff steepened (exp 12→5 instead of 6→2.5, rest amplitude 0.45→0.3), ray glow width at rest 0.8→0.55 with the same bass peak, ray halo 0.16→0.07. 20 s meter after: lum 0.28, dark 0.08, lumMin 0.21, clip 0, flicker 0.20, hueConc 0.31, rResid 0.27.

**Storylines + big waves (sun-1):** see `shaders/sun/sun.md` and `docs/storylines.md` — the line continues in `sun/`.

### 2026-10-09 show — sun-1-wip: shiver fixes (live, hot-swapped)
- Shiver probe read 0.92 (edge/radial retrace ~40). Two audio-driven *positions* found:
  1. `NO-SHIVER-2`: the cloud band edge `clT` rode `bs_energy`, and the tile gap `thX` rode `bs_bassSus`. Both are now fixed, and energy lights the band instead (`tile *= … + 0.45*gEnergy*GATE*cl`).
  2. `NO-SHIVER-3`: kick `gSwell` also scaled the lens radius `RE`, so every kick bent the whole background in and out. The lens now ignores swell, and the ball keeps its kick punch.
- Shiver 0.92 → 0.79 → 0.63. The windows include user knob moves and a SUPERNOVA act, so these aren't clean readings. The user said "This was very beautiful so far", so the critic's background dim and amber halo were skipped.

### sun-1-wip — NO-SHIVER-4 (2026-10-09 show warm-up)
- Cause hunted: the shiver score was driven by the zoom term (zoomAbs ~0.53 rings/sample, directionality 0.13 → pure in/out). The kick swell `gSwell` lived inside `HOLE_R`, so every kick scaled the corona pattern (log(r/RH)), the iris RI = 3.3·HOLE_R, the ray roots, the tile wavefront and the feedback fall zone by ~13%, pumping a disc ~half the screen wide in and out. The feedback sample position also thumped 3% per kick.
- Change: `HOLE_R` no longer includes `gSwell`. Only the ball radius `RB` is multiplied by it, so the ball still punches on the kick. `RE` drops its `/gSwell` cancel. The feedback kick thump was removed.
- Measured: not a clean A/B. During the 60 s verification the user had K5 STORY 0.61 (forced SUPERNOVA), K7 KISS 1 and K2 HUE 0.98, so shiver 0.97 reflects the supernova shell, not this edit. Re-measure with K5 at 0 in MAIN SEQUENCE.

- 2026-10-09 20:3x LIMB-1b (sun-1-wip, plasmaBall): limb darkening on the main ball, art critic #5. The centre is +15% with a pale-amber core lift; only the outer ring (x 0.4 to 0.95) darkens 25% and reddens. A first pass with the ramp starting at the centre (LIMB-1) reddened the whole disc and lost the gold swirls, so it was replaced. Clip 0; lum 0.31 to 0.30.

- 2026-10-09 GLOW-PULSE-1 (sun-1-wip): tendril light ×(1 + 0.5·avg(bs_bassS, bs_midsS)), applied after the SURGE-MULT cap. Light only; geometry untouched. 30 s window in forced SUPERNOVA: lum spread 0.039→0.163, flicker 0.12→0.14, rResid 0.04→0.10, clip 0. Kept (critic #6 suggestion).

- 2026-10-09 20:44 FLARE-HUE check (no edit): critic #11 asked to slow the flare petal hue. Measured: corona/flare colour = mc(14, lit) whose hue rides only bs_pal (monotonic clock, ~1 turn / 18 min, measured 0.1018→0.1062 over 5 s) + K2 HUE SPIN; audio (gFlux, FLARE=crest z) drives only reach and brightness. Already slow. Pink tint comes from K2 position, the user's hand.

- **COLLAPSE-LIFT-1b** (2026-10-09 20:52, sun-1-wip): act 3 COLLAPSE sat at lum 0.10 / lumMin 0.075 / dark 0.55 (critic #13, #14). Gated on `smoothstep(0.2,1,bs_pull)` (pull is unique to COLLAPSE and eased, so no step on act change): gas veils +25%, sky floor keeps more under `bs_dark` (0.35 → 0.35·(1−0.35·w)), companion ball/corona emission +25% with a light-only bass heartbeat (`bs_bassS`, inside the existing cIn falloff, so no disc). First pass (+35% veils, 0.6 floor) overshot to lum 0.21 / dark 0.06 and lost the tension, so it was trimmed. Result: lum 0.174, lumMin 0.149, dark 0.18, clip 0, flicker 0.70 (was 0.80 before the edit).

- 2026-10-09 FLARE-ENV-1 (corona flare light on bs_bassS/midsS envelopes, +25% peak): tried live in COLLAPSE, flicker 0.61 → 0.84 (hands still, scene darkened in the window), so reverted. The flicker is not driven by the gFlux amplitude.

- 2026-10-09 21:0x COMPANION-LOOK-1 (critic #17): the companion was a flat crimson disc with a ring-like rim (heat override 0.32 paints the whole ball one colour). Added a pale-amber hot centre (heat 0.75 term, x<0.7) and a soft glow carried past the limb. It now reads as a sphere like the main star. Act 3: lum 0.109→0.127, lumMin 0.090→0.113, clip 0, flicker 0.66→0.48. Kept.

## SCENES-1 (2026-10-09, live, sun-1-wip) — scene layer + ORBIT

User: "A feeling of galactic minisculity by being next to the giant, powerful, radiating sun from the lower right corner, feeling like we're orbiting it for a while … not to flash too much."

- **Scene clock**: `mod(bs_time, 340)`: scene 0 (the story as it was) 0–160 s, 9 s crossfade, scene 1 ORBIT 169–330 s, 9 s crossfade back. Monotonic clock, no audio in the phase.
- **ORBIT** (`gOrb`): the story star slides off-screen to `(ar+0.25, -1.25)`; a dedicated giant plasma ball (R 1.6, fixed hot gold `gHeatOv 0.92`, no kick size-punch) fills the lower-right corner; its own corona = hot limb glow + long streamers flowing outward on the clock, brightness on `bs_bassS/bs_midsS` only. World rotates about the giant ~50° over the scene (rate, not audio). Foreground dust layer rotates 1.9× faster (parallax). Companion hidden. Lens strength ×0.3 and previous-frame feedback ×0.15 in ORBIT (scaling HOLE_R instead flooded the frame with the 3.3R iris zones — SCENES-1d, abandoned).
- **Hands win**: any of K4 ZOOM / K15 SUN X / K16 SUN Y ≠ 0 switches ORBIT's geometry off (binary — zeroing them mid-ORBIT is a cut, not a fade).
- **Preview**: `window.cranes.manualFeatures.scene_force` = 1 → scene 0, 2 → ORBIT (bypasses the hands gate); delete the key for auto.
- Measured forced ORBIT: lum 0.19–0.23, clip 0, flicker 0.22–0.32. Shots `.claude/vj-shots/orbit-j.png`, `orbit-l.png`, scene 0 `scene0.png`.

**Next scenes proposed:** ECLIPSE (the companion slides across the giant's face, revealing a ring corona and diamond-ring flare — slow, on the clock); SOLAR WIND (camera inside the corona, plasma streaming past radially, music sets stream brightness); SUNRISE (a dark planetary limb across the bottom third, the sun lifting over it on a one-way ease, atmosphere glow band).

### SCENES-2 / 2b (2026-10-09, live set): ECLIPSE + smooth ORBIT gate
- Cycle is now 510 s on bs_time: story 0–160 → ORBIT 169–330 → ECLIPSE 339–500 → story, 9 s crossfades.
- ORBIT's hands gate is smooth: `1 − smoothstep(0, 0.08, max(K4, K15, K16))`, so zeroing those dials fades ORBIT in instead of cutting.
- ECLIPSE: a dark moon (1.15× the ball radius) crosses the star along a fixed line on a monotonic scene phase (`gEclPh`, never audio). Totality turns the day indigo (×0.62 + indigo, not black), reveals a pearly corona with long streamers (only its brightness takes bass/mids envelopes), shows stars, and glints Baily's beads on the limb at 2nd/3rd contact. The companion is hidden during ECLIPSE.
- Preview: `manualFeatures.scene_force = 3` (ECLIPSE), `ecl_force = 0..1` pins the phase (0 = auto).
- 2b: the first pass put totality at lum 0.038 (black); now 0.078 with K10 FADE 0.28 still on. Shots: .claude/vj-shots/eclipse-0.3.png, eclipse-0.5b.png, eclipse-0.66.png.

### 2026-10-09 ~21:58 — controller: slow EVOLUTION + dramatic-safe event outputs (controllers/black-sun.js)
User: "Bring in as many weird audio features as you can… slow moving ones at first… I NEED the scene to evolve over time based on the music." + "some more dramatic features as well. Just don't break it."
New uniforms (declare `uniform float` in the shader to use):
- Moods 0..1 (tc 10–20 s): bs_moodChaos (spectralEntropyMean), bs_moodGrit (spectralRoughnessMedian), bs_moodFocus (spectralKurtosisMean), bs_moodSpike (spectralCrestMean), bs_moodTilt (spectralSkewMean), bs_moodAir (spectralRolloffMean), bs_moodVolatile (flux+roughness std-dev), bs_moodWave (waveletCentroidNormalized), bs_moodRise (energy/centroid slope×R²; 0.5 flat), bs_moodKey (pitchClassMedian, circular, turns).
- Monotonic clocks (turns, fract): bs_evoChaos/Grit/Focus/Spike/Air/Volatile/Wave/Rise — rate 0.003+0.03×mood turns/s, slowed in silence. Geometry: use integer multiples / sin(2π·evo).
- Events (envelopes, never flashes): bs_dropEnv (confirmed drop, 150 ms attack / ~3 s release / 8 s refractory), bs_buildEnv (confident build, 6 s attack), bs_shiftPulse (timbral shift, 2.5 s release), bs_evoJump (+1 per drop, eased ~3 s, never decreases — use fract/mod for new geometric state).
Optional inputs fall back to neutral values (never freeze the controller). Verified live 30 s: all keys present + finite, clocks monotonic, bs_time advanced 30.1 s.

### 2026-10-09 ~22:05 — SKY-RETURN-1 → FRACTAL-SKY-1(c) → LATTICE-MIX-1 → EVO-WIRE-1 → FRACTAL-CALM-1b (sun-1-wip)
User: "Let's slowly reintroduce the original sky." / "Let's riff on OG sky significantly. Let's avoid space for a while. We need to evolve in new, fractally ways." / "Let's mix in some of the lattice-3-interactive 3. Slowly, over time, into the sky." / "background fractal is way too fast and streaming down and to the right".
- SKY-RETURN-1: `sky_return` (JS 90 s eased ramp) pulls night/dark-dim/nebula off the backdrop so the day tile sky returns in every act.
- FRACTAL-SKY-1: `no_space` (JS 20 s ramp) kills night/nebula/ORBIT/ECLIPSE and swaps in fractalSky(): 3 octaves of sky() at 2× steps, sin⁴ weights, perpetual zoom. 1b/1c: bigger tiles (sin² averaged into grain).
- PERF-1: never evaluate sky() and fractalSky() together; skip octaves with w < 0.04. p95 back to 17.4 ms (it had hit 33 ms, ~30 fps).
- LATTICE-MIX-1: core of redaphid/lattice-interactive/3 ported (lmFractal, 8 levels, first 3 skipped, no controller/knob reads), coloured through OG blue + LSD bands, brightness-matched into the sky only. `lattice_mix` ramps 0→0.6 over 3 min.
- EVO-WIRE-1: bs_mood* drive the octave emphasis (moodFocus), the lattice palette walk (moodKey×8, circular) and the lattice amount (moodChaos). The bs_evo* geometry hooks were too fast at up to 0.033 turns/s, so they were mostly removed again in CALM.
- FRACTAL-CALM-1/1b: the streaming came from the small octaves magnifying sky()'s own cloud/noise drifts ~10×, plus the lattice pan, evo circles/rotations, and the lattice being anchored to the drifting SUN. Fix: zoom one octave per ~300 s, sky() time ×0.12 inside the fractal, no linear warp drift, a 0.002 rad/s rotation about the centre, a screen-anchored lattice with 0.0015 rad/s rotation. Verified with shots 3 s apart: motifs stationary. Flicker 0.1, clip 0.
Note: `sky_return` / `no_space` / `lattice_mix` live in manualFeatures only, so a page reload resets them to 0 (space returns).

- ZOOM-K4-1 (2026-10-09 ~22:00): K4 now flies into the sky — fractalSky octave phase += knob_4*4 (seamless, 4 octaves), lattice scaled by exp2(-knob_4*3) about the centre; sun ZOOM unchanged.

### SUN-CAST-1 / 1b (2026-10-09, live): "Let's bring in more sun characters"
Four cast members share the sky with the main star, using the same `plasmaBall` swirl + LIMB-1b via `castStar()`.
They're drawn before `blackSun()`, so they sit behind its glow. A baked ramp on `bs_time` brings them in at
dwarf 20–60 s, red giant 80–120 s, pulsar 140–180 s, binary 200–240 s (T0 2970; a fresh load replays from 0).
- **Blue-white dwarf**: a wide ellipse on `bs_evoAir` plus a constant clock; brightness from `bs_moodAir`.
- **Red giant**: drifts in from the left edge, then circles lazily; `bs_bassS` breathes its light only.
- **Pulsar**: two beams swept by `TAU·bs_evoSpike·2`; beam brightness from `bs_dropEnv`.
- **Binary pair**: waltzes on `TAU·bs_evoRise·3`.
1b: the dwarf's blue tint was applied over its whole 6R early-out disc, which drew a hard lavender circle;
it's now masked to the star. Clip 0, p95 frame time 17.4 ms.

- PERF-CAST-1 (2026-10-09): castStar skips plasmaBall past x>1.15 (cheap corona + halo only); binary twins early-out per star. Jank over32 22–26 → 1 per 600, p95 17.5 ms.

## LATTICE-FEAT-1 (2026-10-09, live show)
User: "I need the lattice to be affected in many, many ways subtly by audio features. We have 100+. Use them!!!"
- Controller feature bank `bs_f0..bs_f39` (table at the top of controllers/black-sun.js): 0–15 fast light
  (normalized bands, flux, crest, roughness, centroid, wavelet octaves 0–5, pitch, rolloff), 16–27 mid
  z-scores, 28–39 slow shape (trends sign×R², volatility, spread/kurtosis/skew/entropy/tilt).
- Per-cell listening: each lattice cell hashes its id to pick channels. Line glow ±15% (fast group),
  line width ±12% (mid group), fill saturation ±12% and hue ±0.03 (slow group). Each wavelet octave drives
  the detail contrast of its fold level, vertices sparkle on treble/crest, and entropy+kurtosis set the
  inner-pattern contrast.
- Geometry rates only: `bs_latSpin` (morph, sped by entropy trend) and `bs_latRot` (turn, sped by wavelet
  tilt) are monotonic clocks seeded from bs_time × the old constants, so the swap was seamless.
- Incident: the first controller save used the per-frame `rate()` with seconds-scale constants → NaN →
  controller threw and the picture froze ~1 min. Fixed with an exp(-dt/τ) envelope.
- Measured: clip 0, flicker 0.28 (15 s), jank over32 2–5/600, p95 17.3 ms.

## sun-1-wip — painterly pass (2026-10-09, late set)
User: "much more painterly sense". Strengths are `#define PAINT_*` constants under K10 PAINT.
- PAINT-1d: accretion disk's near half fades across the ball (was a hard chord).
- PAINT-1a: broken colour, warm/cool neighbour patches on a slow drifting field, damped toward hot pink, masked off the bodies; soft OKLab-L floor (PAINT_FLOOR).
- PAINT-2/2b: tendrils are loaded-brush strokes (analytic bristles, dry-brush tips, value along the stroke). Noise bristles cost frames; sin bristles don't.
- PAINT-3: canvas tooth in screen pixels replaced the fine fbm grain (read as TV static).
- PAINT-4: warmth only on lights; ground is teal↔indigo broken colour; +20% chroma; sky stroke rows get bigger away from the sun. sat 0.41→0.70, hueConc 0.95→0.34–0.45.
- NO-STATIC-1b/2: lens core softened; lattice folds stop at the pixel footprint (the salt-and-pepper halo). LATTICE-OFF-1: K3 0 = no lattice.
- BAKE-1: old K8=1, K11=1, K10=1 are the new 0 looks. K10 is PAINT (FADE removed). NO-HOLE-1: K1 freed.
- TENDRIL-DIALS-1 → TENDRIL-AUDIO-1: curl/count/length/width/sway via #define swap (audio active, knob lines commented).
- SUN-SURFACE-1/1b: voronoi granulation with lanes, limb darkening, faculae, two slow sunspots on big stars.
- Jank (~7–14/600 over32) is CPU/page-side: a flat early-return shader still janked 9/480.

## sun-1-show (2026-10-09, live)

Fork of sun-1 for the show: no K10 fade, no sun beat pulse, Julia tendrils, warm-window WARMTH.
Census: `.claude/vj-tools/census-2322.tsv` (rerun `node .claude/vj-tools/feature-census.js`).

| Effect | Feature (controller env) | Layer |
|---|---|---|
| SUN_BREATH | bs_bassSus (bass sustain, slow AR) | sun disc brightness, corona, Julia arm body |
| RAY_SWAY | bs_midsS (mids z) | Julia circle-trap curls |
| RAY_HATS | bs_treb (waveletBand5 z) | Julia line-trap filaments + point-trap beads, star twinkle |
| CLOUD_KICK / BIG_WAVE | bs_kick / bs_wAmp | previous-frame lens fronts (distortion only, no paint) |
| LAT_FOCUS | bs_f21 (spectralKurtosis z) | lattice glints |
| LAT_DROP | bs_dropEnv (confirmedDrop) | lattice + cloud surge |
| SKY_TILT | bs_f26 (waveletTilt z) | tile sky brightness |
| MELODY | bs_f12 (waveletBand4) | companion light |
| FLARE | spectralCrestZScore | corona reach |

Changes: FADE const (K10 blackout); WARM-WINDOW (only hues within ~115° of gold lean in); gas re-hued
rust→amber with indigo split-comp filaments; swirl-zone feedback 0.42→0.12; JULIA-ARMS (c on the
0.7885 circle near -0.76+0.2i, 48 iters, point/line/circle traps, DE edge) cross-faded from the old
urchin over 75 s; GIANT-CAP soft-limits the ball radius; deeper granulation; NO-BEAT removals
(gSwell, plasmaBall kick R, sunDisc kick flare, lens thump); clT no longer rides energy; SHIVER-2
slows the sky warp clock 4×; HALO-35 shrinks the Julia body.

### 2026-10-10 — GIANT (sun-1-show): the sun we orbit
User: "make the sun more intimidating … close, large, celestial body we're orbiting … lower right … impossibly interesting celestial detail as if we are a small moon orbiting."
- `giantStar()`: body centre off-screen at `GIANT_C` (K15/K16 rebased so today's dials sit it lower right), radius `GIANT_R` = 1.05..1.40 half-heights (K4). Surface turns past us on `bs_time*0.0035` (forward only).
- Layers: boiling supergranulation + granules (cellular, domain-warped), soft ember sunspots (ragged umbra, warm penumbra), limb darkening, faculae, chromosphere rim, spicule forest, four prominence arches on forward life clocks, helmet + fine coronal streamers, CME plume on `bs_dropEnv`. The Julia arms now erupt from the limb point nearest the screen centre.
- Audio → layer: bass sustain → boil rate (BUD_PH), convection light, corona light, Julia fan emission (+60%); mids → prominence glow; hats → spicule glints; spectral-flux onsets → twin flare ribbons at spots; confirmed drop → CME. No size or beat pulse anywhere on the body.
- The old ball sun, its lens and its feedback swirl faded out over 60 s (FADE_T7); `blackSun()` is skipped and the sky is not drawn under the opaque body (frame-time p95 18.5 → 17.5 ms). Sky spiral + lattice now centre on the giant (`SKY_C`). Bridge fades with the old sun; kick wave fronts launch from the giant's limb.
- SHIVER-4: the sky's warp clock and scrolling flow offset glide to a stop (`EASE8`); the deep-space spiral winding is frozen (3.2); Julia arm length no longer breathes with build; Julia c circles its seahorse point on a forward phase. Shiver 0.83 → ~0.5 (still fluctuates up to 0.8; suspect the companion's swaying rays).
- COBALT grade: blues outside the body get −15% L, +40% C so the ember body pops.
- Rollback: `.claude/vj-tools/sun-1-show.pre-giant.frag`.

### 2026-10-10 ~01:05 — sun-1-show: giant surface pass (SURFACE-3D, EMBER-LIMB/ARCH, FAN-FILL, FAN-FOLLOW)
- SURFACE-3D: the giant's surface is a 3D sphere texture (no pole pinch), with a zonal flow warp, a supergranule network, soft granules on rotated lattices, two spot groups (umbra → filamented penumbra → moat, ember never black), flux-lit ribbons, dark filaments, ~40% limb darkening, and faculae just inside the limb. Boil rides bass sustain (BUD_PH).
- EMBER-LIMB/ARCH: the chromosphere is ember + a thin gold line, spicules are orange, prominences are filled plasma tubes (wispy edge, gold hot core). In giantStar the heat floor is 0.85, so cool acts no longer push the limb toward pink/crimson.
- FAN-FILL: the Julia set's interior glows dim teal, so there are no black burn holes in the fan.
- FAN-FOLLOW: c's small forward circle runs on galPh + fluxPh (C_FLUX0 baked), about 3-4x faster on busy passages. Reach is unchanged (no breathing).
- Perf: p95 18.3-18.4 ms (target 18.0). Trimming the spot loop didn't move it.

### 2026-10-10 ~01:40 — sun-1-show: MOTION, GAS-BLUE, WARM-SCOPE, SMEAR-LOCAL, ROUND-STARS
User: "I need more audio reactivity. It looks static."
- MOTION: new controller clock `bs_flowPh` (FLOW-CLOCK), rate = 0.1 + 3.2·flowB^1.5 + 0.5·energy, where flowB is bassNormalized with ~150 ms attack and ~600 ms release. Forward only. `FLOW_D` = flowPh since the swap (FLOW0 baked ahead, so nothing jumped). It drives the whole deep-space sky (gas, arms, stars) and the nebula veils turning round the giant (orbit), the arms streaming outward, the veils streaming, tile rings turning and clouds sweeping (day acts), plus the Julia fan's turn, c travel and trap point. Rates only, no size, reach or position on audio.
- GAS-BLUE: `gasHue` is indigo ↔ cobalt (h 250–293, C 0.12), was rust → amber. It's used by deep space, the nebula and the supernova light. The sky stays blue.
- WARM-SCOPE: K11 WARMTH acts only within ~1.3–1.65 giant radii (giant, corona, arches).
- SMEAR-LOCAL: the CME plume and the refracted wave front are confined to ≤ 1.3 R and capped at 35%. The plume eases out over ~4 s (pow(env, 0.4)).
- ROUND-STARS: star jitter is halved and each star is windowed inside its cell, so SPARKLE adds count and brightness (≤ 2.5×), never radius.
- K8 SKY SWAP flips the backdrop in every act; K14 DARK sinks below L 0.62.
- Rollback: `.claude/vj-tools/sun-1-show.pre-motion.frag`, `.claude/vj-tools/black-sun.pre-motion.js`.

### 2026-10-10 ~01:55 — RELOAD-REBAKE
Dev server died ~01:44, page reloaded on reconnect at 01:50, bs_time reset to 0 so every FADE_T layer sat at 0 (pre-giant look with the hole). Re-baked all anchors to the new clocks. Post-show TODO: persist controller clocks across reloads (or bake fades relative to a persisted epoch) so a reload can't regress the look.
- All `FADE_T*` except FADE_T2 → 248.183 (bs_time + 3). BUD0/1/2 → 207.992, FLX2/C_FLUX0/FLUX0 → 60.917 (their clocks + 3 s of lead), so those offsets start from 0.
- Kept FADE_T2, GAL_T2 and FLOW0 so nothing jumped: FADE_T2 and GAL_T2 enter the sky's tW/sw offsets directly, and FLOW_D was already live. GAL_T8 = GAL_T2. The tW branch now uses `max(FADE_T8 - FADE_T2, 0.0)`, which matches the before-switch branch, so the sky warp stays continuous.
- Verified at +80 s: the giant body is back in the lower right with the Julia fan and the indigo sky. Clip 0, flicker 0.07. Rollback: `.claude/vj-tools/sun-1-show.pre-rebake.frag`.

### 2026-10-10 ~02:08 — sun-1-show: FAN-ROOT (critic #63, 4th sighting of the root blot)
- Cause: near the root the Julia dendrites were dim teal (`body` alpha ~0.85, colour ~0.4) composited premultiplied-OVER the bright limb glow, so they darkened it into a black starburst. The old emission core was a tight gaussian (σ ≈ 0.35·RBr), far smaller than the blot.
- Fix: inside `juliaArms`, the fan's own light near the root is floored to hot emission (gold at the limb → cyan by ~0.9·S, L 0.86→0.80), ×(0.8 + 0.35·bass sustain); the whole fan gets +30% on bass sustain (gated by presence). In the composite, a soft wide halo (σ ≈ max(RBr, 0.245)) joins the tight core, outside the limb only. Fades in over 60 s (`FADE_T22`).
- Meter (30 s): before lum 0.22 / lumMax 0.26 / dark 0.47 / clip 0 / flicker 0.09 / sat 0.93; after lum 0.27 / lumMax 0.31 / dark 0.37 / clip 0 / flicker 0.10 / sat 0.92. Root reads luminous cyan with gold at the limb; no black starburst.
- Rollback: `.claude/vj-tools/sun-1-show.pre-fanroot.frag`.

### 2026-10-10 ~02:25 — sun-1-show: AUDIO-WEB (16 subtle audio wirings + the starfield back)
User, 02:17: "I need more, subtle features affected by the audio uniforms. many different ones." Each feature drives one small verb on its own element. All are light or amplitude terms, presence-gated through `AW_G` (= clamp(GATE, 0, 1.2) × 0.4), fade in over 75 s (`FADE_T23`), and have their own `#define` with a `// #define AW_X 0.0` swap line. Most read the controller's existing smoothed feature bank (`bs_f*`), so the controller wasn't edited. The amount is the peak change to that element's term after the ×0.4.

| Define | Feature (uniform) | Verb | Peak |
|---|---|---|---|
| AW_LANE | waveletBand0Norm (`bs_f8`) | giant granule lanes deepen | ±14% |
| AW_FAC | spectralSkewZ (`bs_f20`) | faculae near the limb brighten | ±24% |
| AW_UMB | flux volatility (`bs_f32`, slow) | sunspot umbrae deepen | ±0.02 L |
| AW_PFIL | roughness volatility (`bs_f33`, slow) | penumbra filaments sharpen | ±24% |
| AW_CORF | waveletBand2Norm (`bs_f10`) | fine coronal rays brighten | ±17% |
| AW_HELM | sign(bassSlope) × bassRSquared | helmet streamers lift on a steady build | ±11% |
| AW_CHROM | spectralCentroidZ (`bs_f22`) | gold chromosphere line | ±14% |
| AW_SPIC | waveletBand3Norm (`bs_f11`) | spicule forest glints | ±17% |
| AW_PROM | waveletBand1Norm (`bs_f9`) | prominence tubes glow | ±10% |
| AW_BEAD | spectralFluxNorm (`bs_f4`) | Julia orbit-trap beads glint | ±22% |
| AW_CURL | spectralSpreadZ (`bs_f19`) | Julia curls glow | ±17% |
| AW_FIL | spectralRolloffNorm (`bs_f15`) | Julia filaments shimmer | ±14% |
| AW_GAS | spectralEntropyZ (`bs_f18`) | deep-space gas veils thicken | ±10% |
| AW_STAR | spectralKurtosisNorm (`bs_f36`, slow) | starfield brightens | ±10% |
| AW_HATS | trebleZ (`bs_f17`) | the brighter stars twinkle on the hats | 0–96% depth |
| AW_TILT (colour) | skew mean (`bs_moodTilt`, ~15 s) | gas filaments cobalt ↔ violet | ±8° |
| AW_AIRH (colour) | rolloff mean (`bs_moodAir`, ~15 s) | giant gold warmer or paler | ±3° |

- **STARS (critic #69):** `deepSpace()` gated its stars on `bs_night` and isn't drawn on day backdrops, so the stars disappeared at the 02:16 act change. `starLayer()` now draws them over every backdrop: small round stars with a fixed radius, with deepSpace's own stars crossfaded out.
- **Scaling:** the first pass, without the ×0.4, peaked at ±36–54% per element in a 10 s check. That was too loud for "subtle", so `AUDIO-WEB-2` scales it to ×0.4.
- **Meter (30 s):**

| | lum | lumMax | dark | clip | flicker | motion | p95 |
|---|---|---|---|---|---|---|---|
| Before | 0.25 | 0.28 | 0.41 | 0 | ~0.1 | 0.039 | 17.4 ms |
| After | 0.25 | 0.29 | 0.41 | 0 | 0.07 | 0.047 | 17.4 ms |

  One 467 ms hitch was the program recompile on the swap.
- **Rollback:** `.claude/vj-tools/sun-1-show.pre-audioweb.frag`. The controller is untouched (backup `.claude/vj-tools/black-sun.pre-audioweb.js`).

### 2026-10-10 ~02:40 — sun-1-show: ROOT-HUE (fan root + companion colour), then OG-SKY
**ROOT-HUE** (critics #59/#65/#68–#71):
- The fan root's flat peach slab came from two opaque single-colour fills. The main-scope `mix(f, emC, aE)` halo and the fan's FAN-ROOT floor both painted the Julia interior flat at L≈0.86. The root is now light ADDED over the fan and limb: gold-white at the contact, cyan by ~0.3 giant radii, broken by granulation noise. The interior takes the floor only through that granulation.
- ROOT-HUE3: the interior's alpha now matches its light. A dim cover over the limb glow had made a brown blot, the same mechanism as the original black starburst.
- The companion's raspberry core was the heat-0.32 crimson floor in `sunLchK` (h 22°). Its lilac halo was crimson rays summed with the cyan ray-cross. In the final grade, around the companion, hues ≈331°..30° now rotate up through red to ember/gold (h 30–60, C 0.14–0.19). Violet hues (≈271°..331°) rotate DOWN to the sky indigo, h 264° (ROOT-HUE2; a first try desaturated them and left a grey haze). Cyan and the dark sky are untouched.
- Meter: clip 0, flicker 0.08–0.10, lum 0.27, p95 17.4 ms. `FADE_T24` is a 25 s fade.
- Rollback: `.claude/vj-tools/sun-1-show.pre-roothue.frag`, and `.pre-roothue3.frag` for the alpha fix only.

**OG-SKY** (user ~02:3x: "let's slowly go to the og sky"):
- `OG_SKY` = smootherstep((bs_time − FADE_T25)/240). It pulls the backdrop weight `wSp` from story-night-driven (it was ~0.8 deep space) to `SPACE_MIX`, so every act settles on the Van Gogh tile sky and K8 SKY SWAP still flips it to deep space.
- Stars fade where the backdrop is bright (opaque tiles) and stay in the dark gaps.
- The SKY-HALO radial falloff eases from 0.80→0.42 to 0.95→0.66, back toward the bright patchwork.
- The tile sky's own audio verbs are unchanged: rings turn on FLOW_D, clouds sweep, treble shimmers, bass lights the tiles.
- At +120 s the blue tile rings were arriving round the giant and the sky stayed blue. At +250 s the input was silent (energy 0) and the story had gone to dark act 2 (night 0.79, dark 0.69), so the frame read lum 0.07 and the final look couldn't be judged yet. p95 18.3–18.4 ms.
- Rollback: `.claude/vj-tools/sun-1-show.pre-ogsky.frag`. That backup predates ROOT-HUE3; to undo only OG-SKY, revert its 4 `OG_SKY` lines.

### 2026-10-10 ~19:45 — SOLAR-FLARE replaces the camera shutter (all set shaders)
User, before going live: "I don't want the camera shutter effect … Replace it with a better, more thematic effect."
- The section-change shutter (8 spiral aperture blades over the ball sun) is gone. In its place, a **solar flare surge** on the same `bs_shutter` / `bs_shutterAng` envelope: soft radial coronal streamers stretch out to ~2.5 radii and turn forward on `bs_shutterAng`, the limb flares hot gold, and a heat ripple travels outward. The ripple displaces the streamer field and is never drawn as a ring. It peaks mid-envelope, where `bs_irisScale` resizes the sun, so the resize stays hidden.
- Lighten-only blend toward fixed OKLCH sun hues (ember h38 → amber h60 → hot gold h82, L ≤ 0.84), so it can't clip, darken or turn magenta whatever HUE SPIN is doing.
- Applied by codemod (`.claude/vj-tools/pre-solarflare/codemod.mjs`) to sun-1-safe, sun-1-show, sun/10–17 and `.claude/vj-tools/sun-1-show.pre-giant.frag`. All 11 blocks were byte-identical, and all 11 compile under `__vjValidate`. The controller is unchanged.
- Rollback: `.claude/vj-tools/pre-solarflare/` (one copy per file).
