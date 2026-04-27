# the-coat-15

Forked from `the-coat-14.frag` at iter 15 of the 2026-04-26 VJ run, mid *Who The Killer Now – Glass Petals*. Captures the **indomitable-monster aesthetic** the user dialed in over a sequence of corrections (vignette tame, zoom tame, twinkle tame, knob_9 inversion fix, big soft heart pulse, slow chrome rim).

Companion: `journals/the-coat-15-cool-moments.md` (and -14 journal for the lineage prior to this fork).

## Aesthetic anchor

Dr. Fresch corner: **slow + large + weighted**. Bass blocks brood and thump rather than zap. Continuous breathing modulations are at sub-1Hz. Background sparkle is calmed (no shivering). Rim chrome cycles slowly so the icon broods rather than dazzles.

## Baked knob state at fork time

| Knob | Value | Role |
|---|---|---|
| knob_1 | 0.142 | zoom (loose) |
| knob_2 | 0.803 | nebula fog density (high) |
| knob_3 | 0.181 | palette nudge (slight) |
| knob_4 | 1.000 | **eye-wash MAX** |
| knob_5 | 0.575 | drop-zoom punch scale |
| knob_6 | 0.606 | camera tilt / particle storm |
| knob_7 | 0.622 | fur thickness / trails |
| knob_8 | 0.551 | **VJ DARKNESS (~half)** |
| knob_9 | 0.724 | **feedback / heavy smear** (post-inversion-fix; high = heavy as labeled) |
| knob_10 | 0.614 | (unused) |
| knob_11 | 0.386 | (unused) |
| knob_12 | 0.622 | inky bg (substantial) |
| knob_13 | 0.378 | beat strobe |
| knob_14 | 1.000 | **sigil swirl MAX** |
| knob_15 | 0.315 | drip + drip pool |
| knob_16 | 0.575 | **THEME_SHIFT (~0.29 hue rotation, sat boost)** |

## Preset URL

`?shader=redaphid/wip/the-coat-fur-coat/the-coat-15&controller=the-coat&knob_1=0.142&knob_2=0.803&knob_3=0.181&knob_4=1&knob_5=0.575&knob_6=0.606&knob_7=0.622&knob_8=0.551&knob_9=0.724&knob_10=0.614&knob_11=0.386&knob_12=0.622&knob_13=0.378&knob_14=1&knob_15=0.315&knob_16=0.575`

## Music context at fork

*Who The Killer Now – Glass Petals*. Session started warm-bass dubstep (Ganja White Night), moved through trap (Waka Flocka), build/breakdown (ATLiens), G-house, then settled here. The user explicitly called out the dr-fresch aesthetic mid-session ("his bass is like a big unstoppable calm monster") and the shader was tuned toward it.

## Key changes inherited from -14 (this run)

- VJ HEART PULSE: large soft glow, monster-breath modulation (`sin(time * 0.7) * 0.15`), bass weight boosted
- VJ DREAD VIGNETTE: build-up corner-darkening, gentle gates
- VJ DARKNESS: knob_8 multiplicative dimming
- THEME_SHIFT: knob_16 wired as palette-rotation dial
- Chrome rim cycle slowed (~½ speed)
- knob_9 inversion fixed (high = heavy smear, matches comment)
- STARFIELD twinkle frequencies halved
- INTENSITY_ZOOM amplitude halved (no jumpy camera)
- Coat fur hues drift gently with centroid
