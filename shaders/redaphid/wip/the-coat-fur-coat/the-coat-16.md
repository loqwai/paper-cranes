# the-coat-16

## Origin

Forked from `the-coat-15` on **2026-04-27** mid-`/vj` run (iter 66) during *Comments (feat. KE) – Claude VonStroke, ZDS, KE*. Captures the "inky-dramatic chaos drop" knob config the user dialed in for chaos-bright moments — distinct from -15's "painterly groove."

## Knob defaults (baked from live state)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.00 | zoom (wide — full scene) |
| knob_2 | 0.51 | nebula fog density |
| knob_3 | 0.54 | palette hue rotation (mid-rotation, mixed teal/purple) |
| knob_4 | 0.39 | eye wash override (on, moderate) |
| knob_5 | 0.33 | drop-zoom punch (mild) |
| knob_6 | 0.59 | camera tilt swagger (mid) |
| knob_7 | 0.87 | fur thickness (very thick) |
| knob_8 | 0.49 | DOOM RED BG tint (moderate crimson) |
| knob_9 | 0.76 | feedback / smear (mid-heavy) |
| knob_10 | **1.00** | GROUND QUAKE gain **MAX** (peak floor rumble) |
| knob_11 | 0.38 | STEP RIPPLE (mid-low) |
| knob_12 | **1.00** | INKY BG **MAX** (BG dim+desat outside silhouette) |
| knob_13 | 0.00 | BEAT STROBE (off) |
| knob_14 | 0.33 | SIGIL SWIRL (mild) |
| knob_15 | 0.39 | DRIP (mild) |

## Preset URL

```
http://localhost:56619/jam.html?shader=redaphid/wip/the-coat-fur-coat/the-coat-16&controller=the-coat&knob_1=0&knob_2=0.512&knob_3=0.535&knob_4=0.386&knob_5=0.331&knob_6=0.591&knob_7=0.866&knob_8=0.488&knob_9=0.764&knob_10=1&knob_11=0.378&knob_12=1&knob_13=0&knob_14=0.331&knob_15=0.394
```

## Controller

`controllers/the-coat.js` — emits `drop_glow` (sustained drop momentum) and `pitch_change` (chord-arrival transient).

## What -16 captures (vs -15)

The-coat-15 was a "painterly-groove" preset: heavy feedback + camera swagger + full palette rotation. **-16 is the chaotic-drop counterpart**: max ground-quake + max INKY BG + moderate everything else, palette in mid-zone (so DOOM RED has a clearer crimson character without competing with full-rotated cyan).

Includes the iter-65 Z-TRAIN extreme-bass amplifier and the iter-66 chaotic-bright eye coefficient bump (`0.6 → 0.9`).

## Notes

This fork is well-suited for tracks that swing between bass-only intros and chaotic drops. The combination of `knob_10=1` ground-quake + `knob_12=1` INKY BG means drops feel like a dark chamber shaking. With moderate DOOM RED (0.49) the crimson is present but not overwhelming.
