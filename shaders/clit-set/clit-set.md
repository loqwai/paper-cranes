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

- **k1, k2, k3 at 0 = autopilot.** Turning one up blends manual control in over the first 8% of the
  dial (the sun-1-show K15/K16 pattern). Past 8%, X and Y are bipolar: the dial centre (0.54) is no
  offset, and the ends are ±0.6 in the fractal plane, on top of wherever the voyage is. k3 past 8%
  scrubs the voyage loop by hand (0.08 = home, 1.0 = the end of the loop).
- k4 to k8 add on top of the voyage, so they also work while the autopilot runs.
- Ranges: ZOOM adds up to 1.1 log units (3x, capped). TURN is one full turn. POWER adds up to +1.4
  to A. BODY subtracts up to 0.4 from B. CURL adds up to 0.45 rad of rotation per iteration.

### `voyage0`: where the journey starts

`?voyage0=<u>` sets the autopilot's start position on the first frame. Units are waypoints:
`0` = home, `1` = ribbon cathedral, `2` = vortex eye, and so on. Values wrap modulo 6 (the
number of waypoints), so any number works. One unit is 100 s of journey, and a full loop is 600 s.
Fractions land between places: in each unit, 0 to 0.4 dwells at the waypoint, and 0.4 to 1 glides
to the next one. Missing means 0, the original behaviour. NFC variants can use `n * 0.618 mod 6`.

### Waypoints (`WAYPOINTS` in `controllers/clit-set.js`)

| # | Name | What it is |
|---|------|------------|
| 0 | home | clit/2 as committed: the silhouette, pale star, red focal ember |
| 1 | ribbon cathedral | curl 0.3: the wings twist into ribbons (the 2026-05-02 "ribbons curling" request) |
| 2 | vortex eye | panned into the right wing with curl, 2.1x. An approximation of the iter-41 composition; its exact knob code did not survive |
| 3 | jellyfish tendrils | near the pale star, long ribbons over open dark, focal at the edge (iter 29) |
| 4 | fern galaxy | A 1.99, B 0.43, curl 0.22: dense fern lace with teal pockets |
| 5 | rose carpet | A 2.45, B 0.3: a full-field rose and teal carpet, the farthest region from home |

Each leg dwells about 40 s, then glides about 60 s. Mid-glide, the camera pulls back a little, so
each leg reads as rising, flying and settling.

### Audio mapping

All audio arrives through controller envelopes, which are gated by presence so that silence relaxes
to the resting look.

| Feature | Envelope | Drives |
|---------|----------|--------|
| energyNormalized | `cs_breath` (1.5 s) | lace threshold: loud passages thicken the filigree, quiet ones thin it to a hairline |
| midsZScore | `cs_mids` | lace brightness |
| trebleZScore | `cs_treb` | rim light and star twinkle |
| bassZScore | `cs_bass` | whole-body pulse (5%) |
| bass onset (wavelet `bassHit`, else bass-z rising edge) | `cs_kick` | focal ember flare |
| energy and bass z, or wavelet `confirmedDrop` | `cs_drop` | drop spotlight: the body dims and the focal blazes |
| energySlope × R² | `cs_build` | rim warms; the autopilot speeds up by as much as 30% |
| spectral flux and entropy change | `cs_shift` | lace bloom |
| pitchClassMedian (20 s circular mean) | `cs_hue` | slow palette turn |
| drops | `cs_jump` | palette step per drop |
| spectralCrestNormalized | none | pearl sparkle at lace crossings |
| spectralKurtosisZScore | none | focal radius |
| spectralSpreadNormalized | none | vignette opening |

### Controller outputs used by 2.frag

`cs_on, cs_flow, cs_presence, cs_kick, cs_bass, cs_mids, cs_treb, cs_build, cs_drop, cs_jump,
cs_shift, cs_hue, cs_breath`, plus navigation: `cs_cx, cs_cy, cs_lz, cs_rot, cs_navA, cs_navB, cs_curl`,
plus eased knobs `cs_k9..cs_k16`. The behaviour test is `controllers/clit-set.test.js`.

## Iterations

- **1.frag**: clit/2's anatomy moved onto the controller: per-device seeds, eased knobs and envelopes.
  Its audio still bends A and B (eased), as clit/2 did.
- **2.frag**: the voyage. Navigation moved into the controller (eased camera, log-depth zoom capped at
  3x, rotation, power, body, curl). Autopilot through six waypoints, with manual blend-in on k1 to k3.
  Audio was removed from every coordinate and moved into lace breath, rim, stars and light. Added the
  galactic background (dust and parallax stars). Lace thresholds and the focal ember scale with
  log(zoom), plus a coherence gate at depth (the lesson from the clit-vj/2 deep-zoom run). An OKLab
  chroma lift fixes the grey look of the raw orbit rainbow.
