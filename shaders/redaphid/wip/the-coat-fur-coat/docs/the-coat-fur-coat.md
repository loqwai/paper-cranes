# the-coat-fur-coat — Static Variant

Pink synthwave fur coat over the dubstep daddy character. Shape constants baked from a knob-tuning session.

## Construction

The coat is a separate SDF layer built from:
- **Torso SDF** (chest + waist + hips) inflated by `FUR_THICK` to create the coat body
- **Sleeve capsules** from shoulder to wrist (hard union with torso, leaving armpit gaps)
- **Shoulder cap circles** smin'd at the junction for smooth shoulder seams
- **V-neck** carved via smooth subtraction (smin-based smooth max) so the neckline merges organically into the coat top — no hard corners that create phantom "back of collar" rim lines
- **Hem ellipse** extends the coat straight down off-screen

Shape constants are baked from a knob-tuning session. Each constant has a commented-out `#define` that switches it to knob mode for live editing.

## Key design decisions

- **No leather** — body fill is warm plum skin, not leather. The coat is the only garment.
- **Head lowered** (0.30→0.24) and bob amplitude reduced (0.04→0.025) so the head never disconnects from the neck/collar during the nod cycle.
- **Body chest aligned** at `P.hip * 0.7` (matching neck and V-neck) instead of 0.8, so the body doesn't poke out of the coat during hip sway.
- **Narrow neck** (0.035 half-width) so it reads as a thin neck column inside the coat collar.
- **Fluffy silhouette edge** via noise-perturbed SDF (`d_coat_fluff`) — the "fur" read comes from the shaggy outline, not internal texture.
- **Chrome rim + seam** match the synthwave aesthetic of the base shader.

## Fixed bugs

1. **Back-of-collar artifact** — the V-neck was carved with `max(inflated, -v_wedge)` which created closed triangle corners. The rim light traced those corners, producing a phantom collar edge visible above the front of the coat. Fix: smooth subtraction via `-smin(-inflated, v_wedge, k)` with an unbounded-upward wedge so no top corners exist.

2. **Coat off-center from neck** — the body's chest SDF used `P.hip * 0.8` while the coat torso used `P.hip * 0.7`, causing the body to shift more than the coat during hip sway. The viewer's right shoulder would poke out. Fix: aligned both to `P.hip * 0.7`.

3. **Head disconnecting from neck** — head resting position at y=0.30 left a gap above the coat top (~0.15). During the bob cycle, `bob=0` made the gap visible. Fix: lowered head to y=0.24, reduced bob amplitude.

4. **Shoulder flare/wings** — separate shoulder circles in `sdTorso` created bumps that inflated into flared wing shapes. Fix: removed shoulder circles from torso SDF; sleeves attach directly with shoulder cap circles at the junction.

## Testing

Idle test:
```
?shader=claude/wip/the-coat-fur-coat/the-coat-fur-coat&noaudio=true&time=3.5&bassNormalized=0.3&energyNormalized=0.3
```

Drop test:
```
?shader=claude/wip/the-coat-fur-coat/the-coat-fur-coat&noaudio=true&time=3.5&bassNormalized=0.95&energyNormalized=0.95&trebleZScore=1.5&energyZScore=2.5&energySlope=0.3&energyRSquared=0.95
```

Bob peak (head disconnect check):
```
?shader=claude/wip/the-coat-fur-coat/the-coat-fur-coat&noaudio=true&time=1.428&bassNormalized=0.3&energyNormalized=0.3
```
