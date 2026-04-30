# the-coat-24

## Origin
- **Forked from:** `the-coat-23` on 2026-04-30
- **Track at fork:** *Greedy* — bradeazy, Mike Renza
- **Why:** Captures the post-knob-mapping state after iter 2-4 of the `/vibej` run on -23. Iter 2 wired knob_4 (fluff), knob_7 (coat rim), knob_16 (godrays). Iter 3 widened knob_4 range (gamma 1.4, 0.05..3.5x). Iter 4 wired knob_17 (eye blaze). User has a 17+ knob MIDI device and is exploring each knob's full range.

## Baked knob preset

| Knob | Value | Maps to |
|---|---|---|
| knob_1 | 0.134 | Zoom (BASE_ZOOM) — slightly pulled out |
| knob_2 | 0.661 | Nebula fog density — thick |
| knob_3 | 0.11 | Palette hue — warm/red side |
| knob_4 | 0.189 | Fur fluff amplitude — tight (new range: 0.05..3.5x, gamma 1.4) |
| knob_5 | 0.457 | Drop-zoom punch multiplier |
| knob_6 | 0 | Camera tilt + groove breath — off |
| knob_7 | 0.142 | Coat rim chrome amplitude — ghosted |
| knob_8 | 0 | Doom-red BG + warm hearth — off |
| knob_9 | 0 | Feedback/trails — fully crisp (no smear) |
| knob_10 | 0.063 | Ground quake — barely on |
| knob_11 | 0.063 | Step ripple — barely on |
| knob_12 | 0.866 | Inky BG dim outside silhouette — heavy |
| knob_13 | 0.087 | Beat strobe — barely on |
| knob_14 | 0.543 | Pinwheel/sigil swirl — user-set (rule: don't set in code) |
| knob_15 | 0.386 | Drip + ripple pool |
| knob_16 | 0.394 | Godray intensity feeling |
| knob_17 | 0 | Eye blaze — embered/off |

## Controller
`the-coat` — provides `drop_glow` (sustained drop with decay) and `pitch_change` (transient pulse).

## Preset URL
```
/jam.html?shader=redaphid/wip/the-coat-fur-coat/the-coat-24&controller=the-coat&knob_1=0.134&knob_2=0.661&knob_3=0.11&knob_4=0.189&knob_5=0.457&knob_6=0&knob_7=0.142&knob_8=0&knob_9=0&knob_10=0.063&knob_11=0.063&knob_12=0.866&knob_13=0.087&knob_14=0.543&knob_15=0.386&knob_16=0.394&knob_17=0
```

## Notes
- Heavy inky BG + crisp (no feedback) = high-contrast figure-on-near-black look. Pinwheel at 0.54 is unusual (user explicitly cranked it themselves; standing rule is default 0).
- All 17 knobs now wired to "obvious cool" levers per user's iter-2 ask.
- Pitchwheel rule still holds: never bake knob_14 > 0 into a NEW iteration template by default — but here the user set it themselves so it stays.
