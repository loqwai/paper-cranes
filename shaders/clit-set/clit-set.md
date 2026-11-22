# clit-set

A series built on clit/2: Dom Mandy's complex power fractal, read as a chromadepth body with lace
filigree, a red focal ember and a velvet-violet floor. The sun set told a solar arc. This set tells a
voyage: you drift slowly through a vast fractal place, get lost in it, and keep coming back to the
landmark (the clit/2 silhouette).

```
?shader=clit-set/2&controller=clit-set
```

Every shader renders without the controller (each `cs_*` reads 0, and the shader falls back to raw
knobs and features). With the controller, the motion glides and the autopilot voyage runs.

## clit-set/2: the voyage

### Intent

- Every dial at 0 is a good look. After a reload all Twister dials read 0. At 0, the autopilot is on:
  the camera drifts through six waypoints and returns home every 10 minutes.
- Knobs steer. The controller eases every move through a two-pole glide (about 2 s), so a dial
  twist feels like floating, not a cut.
- Audio is texture on the journey. It never touches the fractal coordinates (A, B, C, zoom, pan,
  rotation, curl). On clit/4, audio in the coordinates made the frame strobe and black out.
- Zoom is capped at 3x. Past 3x to 4x the orbit-trap lace turns into speckle. The lost feeling comes
  from pan, power, body and curl, which change the place itself.
- Galactic motif: nebula dust tinted by the orbit colour, and two parallax star layers that drift at
  a fraction of the camera's motion, so travel reads as travel. No sun, no arc.

### Knob map (MIDI Fighter Twister, 4x4)

| Row | Dial 1 | Dial 2 | Dial 3 | Dial 4 |
|-----|--------|--------|--------|--------|
| 1 navigate | **k1 X** pan sideways | **k2 Y** pan up/down | **k3 VOYAGE** scrub the loop | **k4 ZOOM** 1x to 3x |
| 2 shape | **k5 TURN** rotate the view | **k6 POWER** fractal power | **k7 BODY** body offset | **k8 CURL** ribbon curl |
| 3 colour | **k9 HUE** palette turn | **k10 NEBULA** dust and stars | **k11 TRAILS** feedback | **k12 REACT** audio size x1 to x2.5 |
| 4 light | **k13 GLASSES** strict chromadepth | **k14 EMBER** focal size | **k15 SPOT** hold drop spotlight | **k16 LACE** lace density |

- **k1, k2, k3 at 0 = autopilot.** X and Y push the camera from wherever the voyage has it: the
  offset is the dial value times `PAN_SPAN` (0.8 in the fractal plane, about two-thirds of the screen
  height). A nudge from 0 to 0.1 moves 0.08, so a small turn is a small move. The push is one way;
  TURN (k5) half a turn flips which way it reads on screen. (Before 2026-11-21, X and Y were bipolar
  around 0.54, so the first 8% of the dial swung the camera to the far edge.)
- k3 blends from the autopilot to a hand scrub over its first 8%, along the shorter way round the
  loop (5.9 to home goes forward through 6, never back through 4, 3, 2, 1). Past 8% it scrubs the
  loop by hand (0.08 = home, 1.0 = the end of the loop).
- k4 to k8 add on top of the voyage, so they also work while the autopilot runs.
- Ranges: ZOOM adds up to 1.1 log units (3x, capped). TURN is one full turn. POWER adds up to +1.4
  to A. BODY subtracts up to 0.4 from B. CURL adds up to 0.45 rad of rotation per iteration.

### `voyage0`: where the journey starts

`?voyage0=<u>` sets the autopilot's start position on the first frame. Units are waypoints:
`0` = home, `1` = ribbon cathedral, `2` = vortex eye, and so on. Values wrap modulo 6 (the
number of waypoints), so any number works. One unit is 80 s of journey, and a full loop is 480 s.
Fractions land between places: each unit is one glide to the next waypoint, never parked (the
glide speed stays above 40% of linear even at the waypoint). Missing means 0, the original behaviour. NFC variants can use `n * 0.618 mod 6`.

### Waypoints (`WAYPOINTS` in `controllers/clit-set.js`)

| # | Name | What it is |
|---|------|------------|
| 0 | home | clit/2 as committed: the silhouette, pale star, red focal ember |
| 1 | ribbon cathedral | curl 0.3: the wings twist into ribbons (the 2026-05-02 "ribbons curling" request) |
| 2 | vortex eye | panned into the right wing with curl, 2.1x. An approximation of the iter-41 composition; its exact knob code did not survive |
| 3 | jellyfish tendrils | near the pale star, long ribbons over open dark, focal at the edge (iter 29) |
| 4 | fern galaxy | A 1.99, B 0.43, curl 0.22: dense fern lace with teal pockets |
| 5 | rose carpet | A 2.45, B 0.3: a full-field rose and teal carpet, the farthest region from home |

Each leg glides for its whole 80 s. Mid-glide, the camera pulls back a little, so each leg reads as
rising, flying and settling. On top of the voyage, an always-on **spin** turns the view one way only
(0.02 rad/s in silence, 0.02 to 0.06 rad/s following the energy z-score). The music changes the spin's
rate, never its direction. Nothing on the geometry oscillates: no sine on zoom, pan or rotation.

### Colour (OKLCH, gamut-mapped)

- The lace takes its lightness from the orbit rainbow (the structure) and its hue from a fixed
  palette: red 29°, amber 66°, teal 195°, blue-violet 285° (OKLCH). The orbit angle drives a triangle
  wave over that palette, so the hue goes red → amber → teal → violet and back, and never crosses the
  magenta arc between violet and red. Hot magenta reads to Aaron as a buffer overflow.
- Threads on the x trap and the y trap sit half a leg apart, and brightness shifts the hue too, so the
  filigree is several colours, not one.
- The darkest lace (the fan petals) goes deep violet, the velvet body. Before this they were grey-brown.
- The pale star (z about 0.8) stays pale, tinted periwinkle, so the red ember pops in front of it.
- Every colour goes through `lchGamut()`, which shrinks chroma at constant L and hue until it fits.
- The final tone map works on luminance, not per channel. Per-channel Reinhard pulled every bright hue
  toward grey, which caused the dusty look.
- `chromadepth()` (GLASSES, the focal) starts at true red (29°), not the 0° pink-red.

Measured on the six waypoints (480x300, noaudio, seeds 0.5): mean OKLCH chroma 0.038 → 0.058, chroma
of lit pixels 0.055 → 0.099, and grey pixels among mid-lightness pixels 47% → 8%.

### Audio mapping

All audio arrives through controller envelopes, which are gated by presence so that silence relaxes
to the resting look. Many features drive small effects, each on its own channel. Colour follows slow
statistics only.

| Feature | Envelope | Drives |
|---------|----------|--------|
| energyNormalized | `cs_breath` (1.5 s) | lace threshold: loud passages thicken the filigree, quiet ones thin it to a hairline. Also lace gain (x0.85 to x1.15), lace and rim chroma (x0.85 to x1.15), nebula glow |
| midsZScore | `cs_mids` | lace brightness (0.75 to 1.35) |
| trebleZScore | `cs_treb` | rim light (0.3 to 1.4) and star twinkle |
| bassZScore | `cs_bass` | whole-body pulse (7%) |
| bass onset (wavelet `bassHit`, else bass-z rising edge) | `cs_kick` | focal ember flare |
| energy and bass z, or wavelet `confirmedDrop` | `cs_drop` | drop spotlight: the body dims and the focal blazes |
| energySlope × R² | `cs_build` | rim warms; the autopilot clock runs up to 30% faster (rate only: never direction or position) |
| spectral flux and entropy change | `cs_shift` | lace bloom |
| pitchClassMedian (20 s circular mean) | `cs_hue` | slow palette turn |
| drops | `cs_jump` | palette step per drop |
| spectralCrestNormalized | `cs_pearl` (0.15 s / 0.8 s) | pearl sparkle at lace crossings |
| spectralKurtosisZScore | `cs_focus` (1.2 s) | focal radius |
| spectralSpreadNormalized | `cs_spread` (2 s) | vignette opening |
| spectralRoughnessNormalized | `cs_grit` (0.3 s / 1.5 s) | nebula shimmer |
| spectralCentroidNormalized | `cs_tone` (8 s mean) | palette leans warm on bright music, cool on dark |

### Controller outputs used by 2.frag

`cs_on, cs_flow, cs_presence, cs_kick, cs_bass, cs_mids, cs_treb, cs_build, cs_drop, cs_jump,
cs_shift, cs_hue, cs_breath, cs_pearl, cs_focus, cs_spread, cs_grit, cs_tone`, plus navigation: `cs_cx, cs_cy, cs_lz, cs_rot, cs_navA, cs_navB, cs_curl`,
plus eased knobs `cs_k9..cs_k16`. The behaviour test is `controllers/clit-set.test.js`.

## Variant frags: 3, 4, 5

Three structural forks of 2.frag, made for the NFC giveaway. Each one keeps the clit motif (the same
fractal, the same voyage, the same knob map and controller outputs) and changes how it is drawn. Every
dial at 0 is a good look on all three, and all three are high-chroma by construction (the render gate
rejects any variant whose lit pixels average below 0.075 OKLab chroma).

| Frag | Name | What is different |
|------|------|-------------------|
| 3 | chromadepth | Strict ChromaDepth: HSL hue is depth (red near, violet far), saturation 0.95, lightness ≤ 0.55, no white. Lace and focal near (red to gold by orbit angle), body mid, galaxy far. k9 = depth temperature (0.25 hot, 0.75 cool, 0/0.5/1 neutral). k13 = depth contrast. |
| 4 | nebula | Emission nebula: the body glows as lit gas, the lace burns as two filament families in two hues, and the sky is layered multi-colour dust with cross-star sparkle. OKLCH on a curated wheel (no hot magenta, olive rushed through, dark layers kept cool so nothing goes brown). k13 = filament colour split. |
| 5 | mandala | 4's colour, folded into a slowly turning kaleidoscope. The fractal is mirror-symmetric, so each fold joins seamlessly; the silhouette repeats as petals around a lit hub. Petal count 5 to 8 comes from `seed4`, so each phone differs. |

Own motion: each of 3/4/5 turns, breathes and sways on the `time` uniform (periods 200, 100 and 250 s,
which divide the 1000 s wrap), so it moves with every knob at 0 even if the controller's nav is still.
Audio stays on local structure: the bass pulse lights only the lace or body, never the whole frame.

Seeds per frag: `seed` palette or depth phase, `seed2` lace density, `seed3` rim hue or dust hue,
`seed4` star scatter (and petal count on 5).

## NFC variants (clit-new/2 .. clit-new/201)

- `node scripts/nfc/clit-set-variants.mjs` writes `nfc-variants.json` and `nfc-variants.md`: 200 tags,
  frags 3/4/5 weighted 60/70/70 and interleaved, so tags written back to back alternate. Each tag has a
  mood (3 per frag) plus golden-ratio jitter on the look knobs, clamped to the safe bands, and
  `voyage0 = frac(n × 0.618) × 6`. Seeds are not baked; k1/k2/k3 stay 0 so the autopilot runs.
- `node scripts/nfc/render-gate.mjs shaders/clit-set/nfc-variants.json <dir> <port>` renders every
  variant headless (`noaudio=true&time=20`, 360×740) and rejects dark, white-out, grey, low-chroma,
  speckle, hot-magenta, flat (one colour field) and static frames (the `time` uniform moves 20 → 22 and
  the frame must change). `node scripts/nfc/gate-loop.mjs <dir> <port>` then gives each failing tag a
  retry in `nfc-nudges.json` (a retry moves its start place and thins the lace; after 4 retries the tag
  moves to the chromadepth frag), regenerates and re-gates until all pass.
- `node scripts/nfc/short-links.mjs shaders/clit-set/nfc-variants.json` puts the slugs into the 2cb.pw
  KV (never overwriting a slug that points outside clit-set) and verifies each one answers 301 to its
  `full`. `--verify-only` re-checks.
- Write tags at `https://visuals.beadfamous.com/nfc-writer.html` (clit-set is the default queue;
  `#iris`, `#taco`, `#coat` still work). Tags hold only `https://2cb.pw/clit-new/<n>`.

## Iterations

- **1.frag**: clit/2's anatomy moved onto the controller: per-device seeds, eased knobs and envelopes.
  2026-11-21: A, B and zoom no longer follow audio (A 1.5, B 0.55, plus the slow idle drift on the
  forward clock; zoom is the knob only). Crest, kurtosis and spread arrive eased through the controller.
- **2.frag**: the voyage. Navigation moved into the controller (eased camera, log-depth zoom capped at
  3x, rotation, power, body, curl). Autopilot through six waypoints, with manual blend-in on k1 to k3.
  Audio was removed from every coordinate and moved into lace breath, rim, stars and light. Added the
  galactic background (dust and parallax stars). Lace thresholds and the focal ember scale with
  log(zoom), plus a coherence gate at depth (the lesson from the clit-vj/2 deep-zoom run). An OKLab
  chroma lift fixes the grey look of the raw orbit rainbow.
- **2.frag, 2026-11-21 polish** (PR after #178): OKLCH lace colour with no grey petals and no hot
  magenta, and a luminance tone map. Wider audio texture, with every feature still a slow-release
  envelope. X/Y push from wherever the voyage is (no jump at the bottom of the dial). VOYAGE blends
  along the shorter way round the loop. PEARL, FOCAL_RADIUS and the vignette read eased envelopes.
- **2.frag, 2026-11-21 show fix**: the show wall read it as static and flashing (beat.mp3 at gain 12,
  energy ~0.1, all knobs 0). Root causes: the voyage dwelt 40 s per leg and the first leg barely moves
  (only cy 0.08 and a zoom the mid-glide pull-back cancels), so nav changed ~0.002 per 2 s; the light
  rode global envelopes (LACE_GAIN on mids x breath, PULSE on the whole frame, FEEDBACK_MIX growing
  with loudness) that release after the hit, so the frame changed most while the music fell; and the
  tone map's overshoot branch landed the hot ember on exactly 1.0. Fix: no dwell plus the drift clock;
  steady lace gain; bass/kick light only the rim, the braid and the ember; constant trails; lace breath
  0.9 → 0.3 (2026-11-22: 0); tone-map knee at 0.94. Meters (`scripts/vj/probe.js`, 30 s window): flicker 1.27 → 0.36,
  clip 0.023 → 0, motionVsEnergy -0.54 → +0.17, rResid -0.20 → +0.17, structure change per 2 s
  0.14 → 0.49. `cs_jump` was never a waypoint index (it counts drops and turns the hue); the voyage
  index is now exported as `cs_voyage` (0..6).
- **2.frag, 2026-11-22 shiver fix**: 12dd8ca9's sine sway (zoom breath, rotation and pan) read as
  shiver on the show's probe (shiverScore 0.92). Geometry now only evolves: a one-way spin replaces the
  sway, the mid-glide zoom pull-back is gone, and the spin is applied after the 1.8 s glide so its
  beat-scale quickening is not a beat late. Light that changed the radial brightness profile was also
  read as zoom jitter, so it no longer follows audio: kick and treble on rim, braid and ember, the lace
  threshold (cs_shift, breath), focal radius (cs_focus), vignette (cs_spread), the drop spotlight
  (k15 SPOT still works) and the hue turn's effect on lace lightness. Audio now drives the spin rate and
  the slow colour. Remaining shiver source: the voyage legs' shape morph (A, curl), measured alone at
  voyage 1.15 to 1.6 with no audio: shiverScore 0.96, zoomAbs 0.097.
- **2.frag, 2026-11-22 techno build** (Aaron live at a hard techno venue on a phone mic: "almost still
  except for time"). Root causes: the presence gate was line-level (`smoothstep(0.002, 0.02, energy)`,
  0.25 s both ways), so a phone mic sat half-shut and the gaps between kicks closed it every beat; and
  kicks and bands came from 500-frame z-scores, which flatten on a constant four-on-the-floor. Now:
  presence opens at 0.0008..0.006 and closes over 3 s; kicks also fire on bass against its own last
  0.45 s (`cs_thump`), so every kick lands. Each kick: `cs_punch` (30 ms up, 0.2 s down) lifts lace,
  rim, braid and ember light and chroma; `cs_lurch` jumps the view forward 0.05 rad (never back); the
  voyage steps forward. Bass (thump) thickens the lace; treble sparkles the braid and stars. Spin rate
  0.5x silent to 4x loud, voyage pace 0.5x to 2.5x, from energy z-score plus local loudness. Legs are
  paced by travel (shape + camera), loop ~24 min at 1x. A colour beat (hue step + chroma lift, scaled
  back to each pixel's luminance) and a beat-stepped colour wave along the filaments (`cs_beat`).
  `?time=<s>` now also stops the controller's time-driven clocks; the audio-driven jumps keep going.
- **3.frag**: chromadepth twin (see Variant frags).
- **4.frag**: nebula, high-chroma OKLCH on a curated hue wheel.
- **5.frag**: mandala, 4's colour folded into 5 to 8 petals by `seed4`.
