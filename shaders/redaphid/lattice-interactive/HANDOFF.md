# lattice-interactive HANDOFF — the flow-state recipe

Written 2026-09-06, mid-set, after the night that turned `3.frag` from a uniform pastel wash into
neon-on-black. Modeled on `shaders/redaphid/wip/lattice-vj/HANDOFF.md` (read that too — its channel
hierarchy is law here). **Read this file before touching anything.** Most of what follows is not in
the journals yet; it was learned tonight, live, on a room mic.

Detail lives in: `shaders/redaphid/wip/lattice-interactive/lattice-interactive.md` (the 1→2→3 design
arc) · `journals/lattice-vj-{1,2,6,7}-cool-moments.md` (the vetoes and the measurement discipline) ·
commit `b88d572` (tonight's diff, with the measured before/after in its message).

---

## 0. READ THIS FIRST — the three bugs that ate the evening

All three looked like *aesthetic* problems and were actually *arithmetic* problems. Two rounds of
palette tuning, two rounds of coefficient tuning, and five separate attempts to reach black
accomplished nothing before each was found. If the shader looks wrong tonight, check these three
things **before** you touch a single colour ramp. They share one shape: **a term that is not masked
where you assume it is masked.**

### 0.1 The lumAcc bug — an un-normalized accumulator masquerading as a palette problem

`fractal()` accumulates three channels with the same front-to-back weight `w = (1-alpha)*f`, then
divides by `ia = 1/max(alpha,1e-3)` at the end. Except it didn't divide **one** of them:

```glsl
    lumAcc   += w * lit;
    fieldAcc += w * field;
    waveAcc  += w * wave;
    alpha    += w;
}
float ia = 1.0 / max(alpha, 1e-3);
return vec4(lumAcc * ia, fieldAcc * ia, waveAcc * ia, alpha);   // FIX: lum was un-normalized
```

`lumAcc` was returned raw — a weighted **sum**, not a weighted **mean** — while `fieldAcc` and
`waveAcc` both got `* ia`. So `lit` arrived at `lush()` around **2–4** instead of 0–1, and

```glsl
float L = clamp(0.06 + 0.70 * pow(clamp(lit, 0.0, 1.0), 1.35), 0.0, 0.95);   // the ramp at the time
```

the `clamp(lit,0,1)` pinned **every lit pixel to L = 0.76**. The entire frame sat at one lightness.
That is what "washed-out pastel" actually was, and it is why **no palette edit could fix it**: the
L ramp was saturated everywhere, so changing the ramp changed nothing. Chroma edits did nothing for
the same reason — at a fixed high L, OKLCH chroma is visually crushed.

> **THE HEADLINE LESSON: if the frame is uniformly bright and palette edits have no visible effect,
> suspect an un-normalized accumulator before you touch the palette.** A saturated clamp is
> indistinguishable from a bad palette by eye, and only distinguishable by arithmetic. Check that
> every channel coming out of an accumulation loop is divided by the same weight the loop built up.

### 0.2 The dead quietGate — measure the gate before you retune the coefficients

The shipped `quietGate` (from `wavelet-ease`) measured, on a live room mic **while music was
playing**:

| what | value |
|---|---|
| `quietGate` avg | **0.002** |
| `quietGate` max | **0.016** |
| `bassNormalized` | swinging **0.23 – 0.75** (healthy) |
| `wavelet_bassHit` | spiking to **3.16** (healthy) |

The audio was **fine**. The gate was strangling it. **Why:** `wavelet-ease.js:159` computes
`quietGate = (energy - 0.015) / 0.05` from **RAW** `energy`, not from any normalized feature. It
opens around raw energy ≈ 0.065. Every healthy gate reading in the journals was on **tab audio**
(raw energy mean 0.098, peak 0.183); on a room mic, raw energy has only ever been observed *below*
the threshold. So normalized features swing 0→0.9 and look perfectly reactive while the gate stays
shut and everything it multiplies stays dead. `quietGate` multiplies nearly every reactive
term in this shader — `bandForDepth()`, `gPop`, `gHexR`, `gBorder`, `gFill`, `gSpin`'s melody term,
the hue drift — so a gate at 0.002 multiplies the entire music response to approximately zero. The
shader looked "not musically reactive" while receiving a perfectly good signal.

The fix is a locally-derived gate with a **hard floor**, so motion always survives:

```glsl
float liveGate = clamp(max(energyNormalized * 1.6, bassNormalized * 1.3) - 0.10, 0.0, 1.0);
liveGate = clamp(0.45 + liveGate * 0.85, 0.0, 1.3);
#define quietGate liveGate
```

Note the two properties that matter: the **floor of 0.45** (silence still renders a living picture,
never a dead one) and the **`max(energy, bass)`** (a bass-driven move can never be gated out by a
quiet broadband passage). The `#define` shadows the uniform, so nothing downstream had to change.

> **LESSON: measure the gate before retuning what it multiplies.** A multiplier near zero looks
> exactly like every coefficient beneath it being too small. Print the gate first. This cost a full
> round of "turn the reactivity up" edits that were mathematically incapable of doing anything.

Two nuances the journals add: the gate's *purpose* — silence muting as anti-flash — is legitimate,
so a shut gate in a genuinely quiet room is correct behaviour, not a bug; the failure is only that
it was shut *with music playing*. And the better pattern is for the gate to **crossfade between two
behaviours** (idle vs. reactive) rather than between reactive and frozen — `(1 - quietGate)` is the
idle-behaviour weight, e.g. a slow cell breath that fades *in* as the music drops out.

### 0.3 The tendril floor — the "no true black" floor, found after five wrong guesses

`leadTendril()` initialised its accumulator at **one**, not zero:

```glsl
float glow = 1.0;                                   // <-- the bug
for (int k = 0; k < 3; k++){ ... glow += line * (0.30 + 0.70 * flow); }
float within = smoothstep(-0.004, 0.02, u) * smoothstep(L + 0.004, L - 0.05, u);
return glow * within;
```

`within` bounds **`u` only** — position *along* the tendril. There is **no perpendicular falloff on
that baseline**; only the three braided filaments have one (`abs(sdf - off)`). Each tendril is
**1.3 world units** long, and the screen spans **~0.07 units** (`uv *= 0.07 / navz`), so every screen
pixel projects inside *some* tendril's `u`-range → `tnd >= 1.0` **everywhere** → this line

```glsl
col += mix(lush(hue, 0.85), vec3(1.0), 0.25) * tnd * 0.22;
```

added a uniform **~0.12–0.17 luminance floor to the whole frame**. And it runs **after**
`col = mix(bg, col, alpha)`, where nothing masks it. The "black" ground could never be black because
a pale wisp colour was being added to every pixel unconditionally.

Fix: **`float glow = 0.0;`** The three filaments carry their own falloff and are the intended wisp.

Measured, from that one line: **lumMin 0.119 → 0.006, dark 0% → 83%, trueBlack 0 → 0.8%.**

The five prior attempts, each of which moved lumMin by **< 0.02**: L-ramp floor to 0 · chroma
rolloff `C *= smoothstep(0, 0.22, L)` · bg to `*0.03` · thinning rims 3× · removing `body`. All five
were palette or geometry edits to layers that were *already masked* — they could not touch a floor
that lived in an unmasked layer downstream of them.

> **THE RULE (companion to §3's grep-every-`col *=`): when lumMin refuses to move under palette
> edits, grep every `col +=` that runs AFTER `mix(bg, col, alpha)`. An unmasked additive term
> anywhere in the frame beats any amount of palette tuning.** A `+=` is only safe if the thing it
> multiplies goes to zero somewhere on screen — check the *coverage* of the mask, not just its
> presence. `within` was a mask; it just covered the entire screen.

---

## 1. The channel hierarchy (inherited law — every violation has cost a live complaint)

1. **GEOMETRY only EVOLVES.** Monotonic accumulators, perpetual self-similar zoom, one-way eased
   plateau steps, or *the user's own navigation*. **No sines. No audio on fold params, however
   smoothed** — fold-ratio error compounds as `scale^i` and reads as "kaleidoscope sections
   breathing". Four separate live complaints about "shaking back and forth" were all cured by
   deleting oscillators from geometry.
2. **LIGHT/SHADING takes ALL the audio.** Rim, halo, per-depth bands, filaments, texture. Never the
   global multiplier — that is the strobe channel, and it is vetoed (§4).
3. **COLOUR follows the slowest music only.** Region hue, `paletteShift`, the set clock. In-track
   hue drift ≈ 0 (the meter's `hueDriftPerMin` should stay ≤ ~0.03 turns/min).

**rate-not-angle.** When audio drives motion, it drives the *rate*, never the *angle*. Feed audio
into a monotonic accumulator (`flowPhase`, `morphPhase`, `evoPhase`) and use that accumulator in the
motion term. An accumulated angle can only ever go forward; a directly-driven angle snaps backward
the moment the feature dips, which reads as the whole world jerking. Corollary: **never `quietGate`
an accumulated angle** — gating the angle itself makes it snap when the gate moves; gate the *rate*
going in.

**The accumulator time bomb.** Anything of the form `bTime - accumulator * k` is a bomb, because the
coefficient `k` is only valid at the signal level where it was measured — **and rooms get louder**.
In `lattice-vj`, `evoRate` drifted 0.0070 → 0.0093/s over one evening as the room filled, and
`evoPhase*25` went from a 25% slowdown to eating 0.233 of bTime's 0.333/s — the perpetual dive was
down to 30% speed and would have **run backward** above evoRate 0.0133. Fixed structurally, not by
re-tuning:

```glsl
bTime - min(evoPhase * 25.0, bTime * 0.6)
```

Clamp against a quantity that grows the same way, so the guarantee is structural and the learned
behaviour below the cap is unchanged. **And when you leave a caveat in a comment, come back and
MEASURE it** — that one was 70% of the way to a live failure within 25 minutes of being written.

---

## 2. The look: rim-dominant neon on black

Tonight's conversion. Light lives on a **narrow band at the cell edge**, plus a tight halo just off
it; interiors stay near-black. This is what makes the lattice read as a glowing wireframe rather
than a coloured fog, and it is *also* what makes audio safe to wire in (§3): a rim is spatially
sparse, so brightening it cannot lift the whole frame.

```glsl
float rim  = smoothstep(gBorder + alias, gBorder, m);                 // hard edge
float halo = smoothstep(gBorder + 0.045, gBorder + 0.004, m);         // tight glow off the edge
float body = smoothstep(gBorder + 0.12,  gBorder + 0.02, m);          // faint interior
float f = rim * 0.46 + halo * 0.16 + body * 0.04;
```

Note the weights: **0.46 / 0.16 / 0.04**. The interior is deliberately almost nothing. (Those are the
weights from earlier tonight; see "the rim weight is the rim's opacity" below for where they went and
why — read the file for the live values.) The lighting term follows the same shape, and this is the
one place audio is allowed to multiply:

```glsl
float lit = (rim * 0.72 + halo * 0.18 + smoothstep(gFill + alias, gFill, m) * 0.04)
          * (0.30 + (energySpring * 0.30 + band * 0.5 + waveletBassSpring * quietGate * 0.45) * gReact);
lit += wave * (0.16 + gPop * 0.20 + gKick * 0.30 + spectralCrestSmooth * 0.12);
```

The rest of the palette contract, all journal-proven, all currently in the file:

- **OKLCH ramp** — currently `L = pow(clamp(lit,0,1), 1.55)`, `C = (0.235 + seed2*0.05) + 0.06*sin(...)`.
  The exponent is what keeps the mid-tones down; a linear ramp washes out. This ramp is being pushed
  darker live tonight (it was `0.06 + 0.70*pow(lit,1.35)` earlier in the evening); the **zero floor**
  is the point — with a `0.06` additive floor, unlit pixels can never reach true black, which puts a
  hard ceiling on the `dark` metric no matter what else you tune. Read the file for the live value.
- **Hued black ground**, never grey: `vec3 bg = lush(s + 0.4, 0.04) * 0.03;` (also being darkened live)
- **Fast feedback decay** so black stays black: `col = mix(prev.rgb * 0.62, col, 0.93);`
- **Deep vignette to black edges**: `mix(col, vec3(0.0), clamp(dot(sp,sp) * 0.30, 0.0, 0.85))`
- **The palette is deliberately never white.** No white tint, anywhere, for any reason (§4). Iter20: the tendril filaments' `mix(lush(hue,0.85), vec3(1.0), 0.25)` was the last white mix and it BYPASSED the L cap — after any cap/ramp edit, grep `vec3(1.0)` too.
- **If "too neon" ever comes up, chroma is the knob, not L.** Low L at the same C sits on the sRGB
  gamut edge and reads as neon; the journals' muted look came from `C ≈ 0.075` (sat 0.86–0.87),
  tonight's neon from `C ≈ 0.235`. Don't fix a saturation complaint by lifting L — that is §0.1 again.
- **On a projector / fabric, cap line LIGHTNESS and push chroma** (user, 21:06: *"still too white to project on to the tent"*). A line at OKLCH L ≥ ~0.8 reads WHITE on a tent regardless of hue; "white" complaints are an L-cap problem, not a hue problem. Live: `L` capped at `mix(0.50, 0.96, gArc)`, chroma base 0.30 — neon is deep colour, not bright lines. Meter it with `whiteish` (lum>0.35 AND sat<0.25).
- **After a palette lock, audit every audio term on the hue coordinate for RATE** (iter21): a hard
  selector (`smoothstep(0.44,0.56)`) turns a fast hue shimmer (flux z-score ×0.10) into an
  orange↔purple strobe on every transient. Only slow drivers (springs, arc, depth) may feed a thresholded hue.
- **When the user names a palette, lock it in `lush()`** (user, 21:21: *"ORANGE AND DEEP PURPLE"*): anchor hues selected by the existing hue coordinate — `k = smoothstep(0.30,0.70,fract(s)); h = mix(radians(62), radians(-52), k)` — so every hue driver keeps its wiring and just chooses between the named colours. Never rewire the drivers for a palette request. Meter with `hueMix` (orange / purple / other share of lit saturated pixels).
- **A cap is not a drive** (iter20): lines stalled at L~0.28 under a 0.73 cap because the standing gain + 1.55 exponent crushed `lit` first. Live: gain `mix(0.62,0.90,gArc)`, exponent 1.20, ceiling 0.90. Check lumMax against the cap whenever the arc moves.
- **High-chroma orange/yellow clips to RED in sRGB** (iter20b): OKLCH 68° @ C 0.36 rendered red (hueMix red 0.41 / orange 0.00). Keep orange-side chroma ≤ ~0.22 at L 0.6–0.75 (live: anchor 82°, chroma × `mix(0.60,1.0,k)`); purple survives the clamp, orange does not. Ship a hue-bucket meter with every palette lock.
- **`lush()` is OKLCH, not HSL, on purpose.** At fixed HSL lightness 0.35, measured luma at high
  saturation went yellow **0.634** vs blue **0.066** — a hue spin in HSL *is* a brightness pump.
  OKLCH's perceptual L is what makes the hue channel safe to move independently of brightness.

### The rim weight is the rim's opacity — thin the line, never lower the weight

Second finding from the §0.3 edit, and it rewrites what "neon rims" meant all evening. The bright
edges measured earlier — **lumMax 0.9, bright fraction 20–49%** — were **not lattice rims**. They were
the **tendril filaments**: glow baseline 1 + three lines ≈ 4, × 0.22 ≈ **0.88**. Once the tendril
floor was zeroed, real rim lighting measured **lumMax 0.176**. The rims had been dim the whole time,
hidden under a brighter unrelated layer.

Why they were dim: in `fractal()`, **`f` is both the accumulation weight and the alpha.** So
`f = rim * 0.42` did not make the rim 42% as bright — it capped the rim's **opacity at 42%** via
`mix(bg, col, alpha)`, letting the black ground show through every edge. The weight was lowered in
the first place to fix *coverage* (rims flooding cell interiors), but coverage was the **fat-rim**
problem — `gBorder` 0.10 → **0.034** — not the weight problem. With thin rims the weight goes back to
near-opaque, `rim * 0.90 + halo * 0.18`, with a standing gain of 0.64.

> **RULE: thin the line to fix coverage; never lower the rim weight — it is the rim's opacity.** In
> any front-to-back accumulator where the same scalar feeds both the weight and the alpha, "make it
> subtler" and "make it transparent" are the same edit. Reach for the SDF width instead.

---

## 3. "No global brightness change" — the explicit instruction, and how to keep it

The user's words tonight. **Audio may only ride spatially-sparse, alpha-masked layers.** Two things
were removed to honour it, and both are marked in the file so they do not come back:

```glsl
// (removed: global `col *= 1+audio` exposure pump — user: "no global brightness change")
...
col *= 1.0;   // neutral: no global exposure lift (user: "no global brightness change")
```

The trailing `col *= 1.10` is now a literal `1.0`, left in place as a tombstone rather than deleted,
so the next person who reaches for a global lift sees the note instead of the opportunity.

Where audio **is** allowed to go, all of which are masked by `alpha` or by a thin SDF:

- the **rim/halo lighting** inside `fractal()` (§2) — masked by the edge band;
- the **filament overlay**, masked by `wave`:
  `col += lush(s + 0.18, 1.0) * wave * (0.55 + gKick * 0.35 + gPop * 0.20);` — commented in-file
  *"audio rides the FILAMENTS, not exposure"*;
- **structure and hue** — `gHexR`, `gBorder`, `gCross`, `gFill`, and the `s` hue sum.

> **THE GREP RULE (from the journals, re-earned tonight): there is at most one `col *=` per stage,
> and you must grep EVERY one of them before declaring the pump gone.** Removing the obvious pump
> and leaving a trailing `col *= 1.10` at the tonemap is the exact failure this rule exists to
> prevent — the frame still pumps, just from a different line. Current inventory in `3.frag`:
> `col *= 1.0` (line ~290, neutral) and `pow(clamp(col,0,1), vec3(1.02))` (line ~289, floor-keeping).
> Everything else is `col +=` or `col = mix(...)` — safe **only if actually masked**. §0.3 is the
> proof that a `+=` with a mask covering the whole screen is a global floor wearing a disguise. The
> two greps are a pair: `col *=` for pumps, `col +=` after the alpha mix for floors.

**"Global brightness shift" has two distinct causes**, and the second one is not a multiplier at all:
a gain term, *or* a **fast hue rotation** — hues differ in luminance, so a `paletteShift` climbing
7.7 turns/min read as brightness pumping even with every `col *=` clean. If the grep comes up empty,
measure `hueDriftPerMin` next.

---

## 4. VETOED — rejected on sight during live sets. Do not re-add. Ever.

Each of these cost a live interruption. The user's own words where they exist:

- **White sin-grid dot sparkle.** *"I need whatever that white grid of stars is gone."* A screen-space
  sin×sin dot grid with white tint. It is still present in `3.frag` as
  `float spark = 0.0;   // VETOED` — **pinned to zero deliberately**, not dead code. Never re-add dot
  grids or white glints. The palette is deliberately never-white.
- **Washed-out pastel.** The whole subject of §0.1. Target is neon on black, not fog.
- **Global brightness pump.** §3. Reads as a cheap strobe; rejected every single time it has been
  tried.
- **Screen-space uv warps.** *"i didn't like the warping. stick to fractal permutations."* No
  screen-space uv displacement of any kind. Moves must permute the FRACTAL — fold ratio, fold angles,
  which levels draw, hex/cross shapes. (`lensBulge` is legal precisely because it warps the fractal's
  **input coords**, not the screen or the backbuffer.)
- **Overlaid discs / orbs / circles.** *"I need that circle orbiting to stop"*, then *"that circle
  needs to go now."* A focal point, if wanted, must be built FROM the fractal — a distinguished centre
  cell or core level — never drawn on top.
- **Path ribbons and landmark towers.** Removed 08-20 by request.
- **The `beat` uniform.** Unusable. It reported 1.90 s / 32 BPM while every spectral feature
  independently autocorrelated at 0.5 s / **120 BPM**. Trust feature periodicity, never the beat flag.
- **Raw un-smoothed z-scores on geometry.** *"it's shivery."* Spring them or accumulate them first,
  and give them a dead-zone (`smoothstep(0.30, 1.0, z)`). Transients may touch shading or twist,
  **never global scale or translation** — a 5% whole-lattice kick-zoom was the "still a little
  shivery" complaint.

The oscillation veto has one refinement worth knowing: *"oscillation can be ok — just not large
moving pieces that disrupt the sense of space. The fractal structures can breathe and morph."*
**FROZEN** is the spatial frame — fold ratio and every angle term. **FREE TO BREATHE** is anything
inside a cell: `gHexR`, `gCross`, `gBorder`, `gFill`. That is why `3.frag`'s audio on those four is
legal and audio on `theta` is not.
- **Auto-scroll / flight.** The user navigates; the shader does not fly itself.

---

## 5. Audio features: what is DEAD on a live room mic

This is the single most expensive thing to relearn at showtime. On a **live room mic** (as opposed
to `audio=tab`), these are effectively dead and wiring them produces a shader that does nothing:

- **all `*Slope` and `*RSquared`** — history aggregates; they drift smoothly, so they spuriously
  correlate with any sweep and are poor wiring targets regardless. Excluded outright from
  correlation analysis for exactly this reason.
- **`pitchClassNormalized`** — needs clean tonal content; a room mic does not have it.
- **`beat`** — see §4. 32 BPM against a real 120.
- **the shipped `quietGate`** — §0.2. 0.002 avg with music playing.

Reliable on the same mic, measured:

- `energyZScore`, `bassZScore`, `spectralFluxZScore` (fires on **any** transient — tame it)
- `spectralCentroidNormalized`, `spectralEntropyNormalized`, `spectralRoughnessNormalized`
- `spectralCrestZScore`
- with `?wavelet=true`: `waveletBassZScore` and `wavelet_bassHit` (spiking to 3.16 tonight — a real
  onset channel, and the reason `wavelet=true` is in the resume URL)

Pick features from **different domains** (frequency band / spectral shape / spectral quality /
temporal / tonal) or they covary and you get one channel wearing four hats.

**Springs lag ~300 ms.** At 140 BPM wobble (430 ms/hit) that lands the reaction almost on the *next*
hit. Design rule: **kick attacks must come from raw onsets; springs are for sustained level only.**

---

## 6. Measure it. "Looks fine to me" is not a check.

`scripts/vj/aesthetic-meter.js` — paste into the display tab (or `await import`), then
`window.__vjMeter.summary(60)`. It samples the WebGL canvas at 10 Hz into a small 2D canvas
(`drawImage` → `getImageData`) and computes, per frame, over the downsample:

- **lum** — mean Rec.709 luminance (`0.2126r + 0.7152g + 0.0722b`)
- **dark** — fraction of pixels with L < 0.08 (a real dark floor)
- **clip** — fraction with L > 0.92 **or** any channel > 0.98
- **sat** — mean HSV saturation
- **lumMin / lumMax** — min/max of the per-sample means over the window
- plus motion, flicker, `motionVsEnergy`/`motionVsBass`, `hueDriftPerMin`, `hueConc`

The script ships at a 64×36 downsample; **160×90 is the better sampling size** for judging clip and
the dark floor on this shader, because the rim-dominant look puts all its energy in thin features
that a 64×36 box filter averages away. Same arithmetic, more boxes.

### Tonight's measured before → after (commit `b88d572`)

| metric | before | after | direction |
|---|---|---|---|
| **lumAvg** | 0.634 | **0.306** | ↓ good — was a wash, now has a floor |
| **lumMin** | 0.254 | **0.08** | ↓ good — real black finally exists |
| **clip** | 27.7 % | **4.9 %** | ↓ good — a quarter of the frame was blown out |
| **sat** | 0.471 | **0.556** | ↑ good — chroma reads once L is off the ceiling |

Note `lumAvg` and `clip` moving together: that is the signature of §0.1 being fixed. A frame that is
27.7% clipped is not a stylistic choice, it is a bug, and it was invisible by eye against a bright
projector.

### Healthy targets to hold

| metric | target |
|---|---|
| **clip** | **0** |
| **lum** | 0.15 – 0.20 |
| **dark** | 0.20 – 0.29 |
| **lumMin** | **≥ 0.08** |
| **sat** | 0.87 – 0.94 |

The table above is the state after §0.1/§0.2 only. **§0.3 then moved the floor**: lumMin 0.119 →
**0.006**, dark 0% → **83%**, trueBlack 0 → 0.8% from one line — the dark floor is now *over* the
0.20–0.29 target band, not under it, so the remaining tune is about bringing rims up (§2, "the rim
weight is the rim's opacity"), not pushing the ground down. Re-measure lum / clip / sat after the rim
weight lands before trusting any number in this section.

**Luma meters under-read red/purple palettes ~2×.** `lum`/`lumMax` are Rec.601-weighted (0.299/0.587/0.114): a saturated purple line AT the OKLCH L cap (~0.75) reads lumMax ~0.28. Once the palette is red/purple, judge brightness by the L-cap value and `whiteish`, never by lumMax — chasing lumMax with drive leads straight back to white lines (iter20b).

**A ratchet needs a counter-ratchet.** Anything that monotonically adds structure also monotonically
shifts the luminance budget. Pair the growth term with its compensation in the *same edit*, not after
the meter complains.

**`motionVsEnergy` cannot tell musicality from brightness pumping.** A frame that strobes with the
kick scores a beautiful r — *"the 0.67 I celebrated WAS the user's complaint."* When the user says
"washes out", check `lumVsEnergy` directly and use the residual correlation, not the raw one.

**Three meter caveats:** discard the first window after any audio interruption (resume transients
gave hueDrift −0.73/min); a hidden tab lies (`document.hidden` ⇒ 0 fps, throttled intervals, a meter
reporting a *paused* frame as a black one — check `visibilityState` first), and **gesture-caused
flicker is not a defect** — check whether the knob vector is moving before acting on a flicker alert;
clip stays 0 through hand-driven flicker.

---

## 7. Knob map

`3.frag` reads exactly **five** knobs. `knob_1` is consumed by the controller, `knob_2..5` are the
four dials of `lattice-controls`:

| knob | role | in-shader |
|---|---|---|
| **knob_1** | **PAN SPEED** — read by `lattice-nav`, not by the shader | (controller) |
| **knob_2** | **COLOUR / hue** — global hue rotation | `s += knob_2 * 2.5` |
| **knob_3** | **STRUCTURE / cell size** | `gHexR += knob_3 * 0.30`, plus warp amplitude |
| **knob_4** | **TWIST** — per-level kaleido twist | `gTwist = knob_4 * 1.5` |
| **knob_5** | **MUSIC-REACTIVITY** | `gReact = 1.5 + knob_5 * 2.5` |

Each dial does **both** a local and a global thing: locally its sphere bulges the lattice under it
(`lensBulge` on the fractal's input coords) and recolours its interior by flavour (0 vivid hue-spin ·
1 invert · 2 hard posterise · 3 false-colour); globally it drives the row above. Turn a dial by
circling a finger on the node — clockwise is up.

Two tonight-specific notes:

- **`gReact`'s floor was raised to 1.5.** `knob_5` rode at 0 all night, which pinned the old
  expression to 1.0 and meant the music-reactivity dial's *entire useful range* was above where the
  user's hand ever went. A dial that is never turned should still leave the shader in a good state.
- **K6–K16 are NOT wired into `3.frag`.** They exist only in the scratch fork
  `shaders/redaphid/wip/lattice-interactive/` — and even there, `1.frag` reads only `knob_1` and
  `2.frag` reads `knob_1..5`. If you find yourself sending `knob_9` and seeing nothing, this is why.
  Don't wire more knobs mid-set.

---

## 8. Resume here

```
http://localhost:6969/jam.html?shader=redaphid/lattice-interactive/3&wavelet=true&remote=display&controller=lattice-nav&controller=lattice-controls&knob_1=0.21
```

`wavelet=true` is **required**, not optional — without it `wavelet_bassHit` and `waveletBassZScore`
are inert, and those are the only trustworthy onset channels on a room mic (§5). The two controllers
must both be present, and `lattice-controls` chains **after** `lattice-nav`.

### Mid-set rules

- **NEVER edit `index.js` mid-set.** Editing it triggers a full page reload, which **drops fullscreen
  and resets all state** — nav position, dial values, `paletteShift`, `warpGrow`, every accumulator.
  Shader `.frag` edits hot-reload; `index.js` edits do not. If an `index.js` fix is needed, it waits
  for a break.
- **The page CAN full-reload mid-set for reasons not yet identified** (iter20c, 21:24: arc → 0, navZoom
  → 1.0, fullscreen held). Cause UNKNOWN — the first theory (a team agent creating new `.frag` files under
  the root → Vite watcher) was retracted; no such file was written. Precautions anyway: never create a
  NEW `.frag` anywhere under the project root during a set (write candidates as `.frag.txt` outside the
  root); modifying `.claude/vj-pending.frag` in place has never reloaded. Recovery: re-navigate with
  `&navZoom=<value>` (lattice-nav honours it) and re-anchor any set-arc `T0`. Post-show: read the Vite log.
- **The flow needs TIME, not just the URL.** Accumulators start at 0 on every page load. A fresh boot
  is the *tuned* look, not the *flow* look. To start deep, raise `paletteShift`/`warpGrow` in the URL.
- **One move at a time**, and take no metric-driven move while the knobs are sweeping. The hands are
  never fought.
- **Read the music before you pick the move** (user, 21:00: *"pay close attention to the music and adjust as necessary"*). Take a ~16-sample feature window first, name the dominant domain (treble grit / kick / tonal / static), and choose the lane from that — `spectralRoughnessSmooth * gGate` on halo width/weight is the proven texture lane for noise-dominant passages; camera/bass moves are for kick-heavy ones.
- **Hot-swapping a `time * k` constant JUMPS the value once** — `bTime * 0.012` on the hue sum is
  such a term. Change those before the show, not during; a live edit is a visible hue snap.
- **If `paletteShift` suddenly collapses mid-set** (e.g. 3.66 → 0.41), the pad's COLOUR bank has
  pinned it — the controller keeps accumulating underneath. **RELEASE the bank**; don't try to dial
  the earned value back by hand.

### The fullscreen fix (in `index.js`, landed tonight — context, not a to-do)

Fullscreen never fired on shaders with controls. The listeners were on the **canvas**; controllers
like `lattice-controls` register **window-capture** handlers that `stopPropagation()` on dial-node
hits, swallowing the gesture before it ever reached the canvas. Fix: bind on **`window` in CAPTURE
phase**, which runs ahead of those handlers, so any gesture anywhere triggers fullscreen exactly once:

```js
const handler = (ev) => { go(ev.type) }
for (const event of events) window.addEventListener(event, handler, true);   // window + capture
```

`go()` guards on `done || document.fullscreenElement`, removes the listeners on success, and
**re-arms on failure** (a gesture that wasn't user-activation-eligible, e.g. `resize`, must not
permanently disarm fullscreen). `keydown` moved here too — it had been bound to the canvas, which is
**not focusable**, so it was dead code that had never once fired.

### Playwright MCP — fullscreen

Full procedure, dead ends and the verify snippet live in **`docs/FULLSCREEN.md`**. Read that, not
this. The short version:

1. `~/mcp/playwright-mcp.config.json`: `args: ["--start-fullscreen"]`, `contextOptions.viewport: null`, `ignoreDefaultArgs: ["--enable-automation"]`; `~/mcp/run_playwright.sh` passes `--config` to it.
2. `/mcp` → playwright → **reconnect** (not a session restart); the browser is fresh, so `browser_navigate` to the URL above again.
3. Verify with `browser_evaluate`: `innerWidth === screen.width && innerHeight === screen.height && outerHeight - innerHeight === 0`. **Never** trust `document.fullscreenElement` — it was `HTML` while the page was letterboxed at 812/900.
4. Mid-set, no reconnect: `browser_resize` to `screen.width × screen.height`, then the operator presses ⌃⌘F on the Chromium window.
5. Never pass `--headed` — there is no such flag; the server dies (`CONNECTION_CLOSED`). Headed is the default.
6. With `--start-fullscreen` + `viewport: null` the window STAYS fullscreen across a full page reload (iter20c, verified innerH 900 = screen, chrome 0); only in-page state (arc, nav, accumulators) is lost. Belongs in `docs/FULLSCREEN.md` too.

---

## 9. Where to go next

- **Finish the luminance tune** (§6) — now from the other direction. §0.3 gave us true black; dark
  is at 83%, well past the 0.20–0.29 band. The job is bringing the rims up to lum 0.15–0.20 with
  the near-opaque rim weight and thin `gBorder`, then confirming clip 0 and sat 0.87+. Do it against
  the meter, at 160×90, not by eye.
- **Sweep for other un-normalized accumulators AND unmasked additive terms.** §0.1 and §0.3 were both
  found by accident, and both are structural — every accumulation loop in the family deserves a check
  that each returned channel is divided by the weight the loop built, and every `col +=` after the
  alpha mix deserves a check that its mask actually reaches zero somewhere on screen.
- **Write the journal.** There is no `journals/lattice-interactive-*-cool-moments.md` yet; tonight's
  run is recorded only in this file and in commit `b88d572`.
- **Consider a gate readout on the pad.** §0.2 would have been a five-second diagnosis instead of an
  hour if the live `quietGate` value were visible next to the meter.
