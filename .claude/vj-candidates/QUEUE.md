# VJ candidate queue — lattice-interactive/3.frag

Verified against 3.frag md5 `1046c970594749eda8b633bed9c02a37` (post palette LOCK: `lush()` is now a
near-binary ORANGE/PURPLE selector `k = smoothstep(0.44,0.56,fract(s))`).

**Order (21:27):** C4 tunnel rush grit → C6 kick envelope attack → C7 line weight ← energy → C2 wash veil
(anchor-selector; parked while entropy 0.53 / crest 0.28 reads the gate ~0) → C5 shimmer halo (arc-gated)
→ C9 colour-gate floor → C8 flux-twinkle LOCAL fallback.
Already landed by you, dropped here: C3 grit fuzz (iter 17 `haze`), C1b arc hue-span (iter 19), whole-frame
flux twinkle (iter 19), C1 treble two-tone, C10 de-white wisps. Section numbers below are stable IDs, not rank.

**Palette lock changes what "hue" means for every colour-lane candidate.** `s` no longer picks a hue on a
wheel; `fract(s)` < 0.5 → orange, > 0.5 → purple, with a 0.12-wide blend. So any `+ k` on `s` now FLIPS
the fraction k of the line set from one anchor to the other (a 0.14 offset re-assigns 14 % of lines),
and terms on `s` that are constant across the frame just shift which lines are which colour. L is still
governed only by `lit` and the gArc cap, so the colour lane remains light-neutral. Read C2 / C9 / C8 below
as ORANGE↔PURPLE SELECTORS, not hue drifts.

Output safety: `verify.py <key>` writes the patched shader to the scratchpad as `<key>.frag.txt` — never a
`.frag` under the project root (Vite watches `.frag` and full-reloads the jam page).
Machine-readable copy of every patch: `patches.json`. Check anchors any time with
`python3 .claude/vj-candidates/verify.py` (add a key, e.g. `C4_tunnel_rush_grit`, to also write the
patched file to the scratchpad as `<key>.frag.txt` for the in-page GL compile — 3.frag is never touched).

Ranking assumptions (21:07): user 21:06 "too white… outlines for now, build to hypercolor over an hour"
→ **colour lane first, nothing that adds light outside the arc**. Music at 20:59: treble 0.85 / entropy
0.81 / roughness 0.71 / crest 0.07 / bass spring 0.31 with sparse kicks — the Iris **wash + trebleShimmer
corners**, not monsterBass (centroid 0.79 kills it: `smoothstep(0.55,0.1,centroid)` = 0).

Dropped: **C3 grit fuzz** — you landed it yourself in iter 17 as `haze`. ZOOM_DEEP compounding — not a
candidate: `gPix = 0.07/navz` already shrinks `alias` as navz grows, so the lunge admits finer levels
structurally; nothing to add.

---

## 1–2. (C10 de-white wisps, C1 treble two-tone — LANDED by the parent; removed)

## 3. C2 WASH VEIL  (Iris third-corner gate → palette drift)
**Rationale.** The 20:59 track was the wash corner: entropy 0.81 (term 0.87), crest 0.07 (inverted term
1.0); at 21:11 (entropy 0.53, crest 0.28) the gate reads ~0 — apply when grit returns. Iris iter 6:
"describe a passage by what it LACKS (no peaks)". UNDER THE LOCK: on a noisy wash, `+ washGate*0.14`
re-assigns ~14 % of the lines from orange to purple (or back) — the picture goes PURPLER on grit, snaps
back to the orange/purple mix on clean sections. A section-level colour cue, still zero light. Uses
`spectralEntropySmooth` (controller EMA, ~7-frame TC, saturating smoothstep → no jitter) — needs its
uniform declared (edit a). Spread term omitted to keep the compile surface small.
**Lane.** Colour only, gate ∈ [0,1], additive on the hue coordinate. No L term anywhere.
Three ordered edits (each anchor unique):
```
a old: |uniform float spectralRoughnessSmooth;
  new: |uniform float spectralRoughnessSmooth;
       |uniform float spectralEntropySmooth;
b old: |    vec4 fr = fractal(uv);
  new: |    float washGate = smoothstep(0.55, 0.85, spectralEntropySmooth) * smoothstep(0.35, 0.08, spectralCrestSmooth) * clamp(gGate, 0.0, 1.0);   // IRIS third corner: loud broadband with NO peaks (inverted crest) = noise/cymbal wash
       |    vec4 fr = fractal(uv);
c old: |            + waveletCentroidSpring * 0.30 * gGate     // palette leans cyan when bright, magenta when dark
  new: |            + waveletCentroidSpring * 0.30 * gGate     // palette leans cyan when bright, magenta when dark
       |            + washGate * 0.14                              // IRIS wash veil: broadband grit drifts the palette to a zone kicks never reach
```
**Meters.** lum/dark/clip flat. Honest note: on the current track the gate is ~open, so this lands as a
0.14-turn hue offset now and *earns its keep at the next section change* (crest returns → veil lifts).
Watch `hueDriftPerMin` at transitions; the EMA is fast enough that a sudden clean drop could read as a
hue jump — if so, wrap `washGate` in `smoothstep(0.2, 0.8, …)` or halve 0.14.
**Revert.** Delete line c's new line (a and b are inert without it).

## 4. C4 TUNNEL RUSH GRIT  (Iris rush: kick + flux + roughness into the feedback push)
**Rationale.** "Moving forward constantly" + "zoom with it". Iris `rush` adds flux and roughness to the
tunnel velocity ("timbral motion deepens the tunnel") and it is the dominant apparent SPEED at 60 fps.
Here the real-kick tier (`kickExcess`, binary on this mic) and transients push the trails harder; grit
raises the baseline rush on this track.
**Lane.** Feedback sample offset only. The prev-frame *weight* is untouched (0.56–0.80, < 1), so it
cannot add brightness; per-frame terms only move where the faint trail is sampled from → no geometry
shiver (this is the same lane iter 14 was accepted on).
```
old: |    tuv      *= 1.0 - (0.006 + 0.022 * bassPulse);      // IRIS tunnel push: trails streak radially, harder on the kick
new: |    tuv      *= 1.0 - (0.006 + 0.022 * bassPulse + 0.012 * kickExcess + 0.008 * clamp(spectralFluxZScore, 0.0, 1.0) + 0.006 * spectralRoughnessSmooth);   // IRIS tunnel rush: real kicks + transients + grit shove the trails forward (feedback lane, brightness-neutral)
```
**Meters.** `motion` up, lum/dark/clip flat, lumSpread flat. Watch: radial smear at the vignette edge
on kicks — it should read as streaks, not blur; if blurry, drop 0.012 → 0.006.
**Revert.** Restore `(0.006 + 0.022 * bassPulse)`.

## 5. C8 FLUX TWINKLE → LOCAL  (FALLBACK only — you landed the whole-frame form in iter 19)
**When.** Only if the iter-19 `+ gArc*0.10*flux` on the whole-frame hue reads as a flash once gArc climbs
(HANDOFF §3: a fast whole-frame hue rotation is a brightness pump wearing a disguise; at gArc 1 it is a
0.10-turn snap on every transient, and `spectralFluxZScore` fires on ANY transient). This patch moves the
same twinkle onto the `wave`-masked filament band only, un-arc-gated (it costs no light, so it can run in
the outlines phase). UNDER THE LOCK the whole-frame form is a bigger risk than before: `0.10*flux` moves
`s` for every pixel at once, so a transient flips ~10 % of ALL lines orange↔purple in one frame — that is
a visible strobe of colour, not a twinkle. The local form flips only the pulse-band filaments' colour.
**Lane.** Colour, masked by `wave`. `lush(…, 1.0)` L is fixed; only the selector argument moves.
Two ordered edits:
```
a old: |            + gArc * 0.10 * clamp(spectralFluxZScore, 0.0, 1.0)   // IRIS flux twinkle (hue only), fades in with the arc
  new: (delete the line)
b old: |    col += lush(s + 0.18, 1.0) * wave * (0.14 + gKick * 0.16 + gPop * 0.08);   // audio rides the FILAMENTS, not exposure
  new: |    col += lush(s + 0.18 + 0.12 * clamp(spectralFluxZScore, 0.0, 1.0), 1.0) * wave * (0.14 + gKick * 0.16 + gPop * 0.08);   // IRIS fluxPulse twinkle: transients re-tint the FILAMENTS (hue only, wave-masked)
```
**Meters.** lumSpread should DROP vs the whole-frame form; lum/dark/clip flat.
**Revert.** Re-add line a, restore `lush(s + 0.18, 1.0)`.

## 6. C6 KICK ENVELOPE ATTACK  (Iris beat-zoom envelope, conservative form)
**Rationale.** Iris iter 8: attack = `pow(bassZ, 0.6)` (fast rise), snap = bassHit excess, body = spring.
Your `bassPulse` already has body (spring) + a thresholded z; this gives the z term the Iris attack shape
and an earlier onset (0.45σ vs 0.6σ) so the lunge/rings/trails/tunnel all lead the kick instead of
trailing it (springs lag ~300 ms — HANDOFF §5). Dead-zone kept (smoothstep floor), so z noise < 0.45σ
still does nothing — that is what keeps it off the "shivery" list.
**Lane.** Camera/geometry via `bassPulse` — the one lane the user explicitly asked to move ("zoom with
it"). NOT added: `kickExcess` into bassPulse — it is binary per-frame on this mic and would release the
zoom instantly (= the vetoed 5 % kick-zoom shiver). If you want the snap tier, put it in C4 instead.
```
old: |                    + 0.35 * smoothstep(0.6, 1.2, waveletBassZScore);   // IRIS kick path: clear kicks snap everything downstream
new: |                    + 0.35 * pow(smoothstep(0.45, 1.2, waveletBassZScore), 0.6);   // IRIS kick ENVELOPE: earlier onset + pow(.,0.6) fast attack; spring = body/decay
```
**Meters.** lumSpread up a little on kick windows (intended), lum/dark flat between kicks, clip 0.
Watch `motionVsBass` up; if the lattice visibly twitches on hi-hats (false z spikes), raise 0.45 → 0.55.
**Revert.** Restore `smoothstep(0.6, 1.2, waveletBassZScore)`.

## 7. C7 LINE WEIGHT ← ENERGY  (Iris LINE_THICK: loudness = line weight)
**Rationale.** Iris `LINE_THICK = width * (5 + energy_env*5)`. Calibrated so the width at energySpring
0.63 / treble 0.85 is what you have NOW (≈0.049) — it only gets *thinner* in quieter passages, never
fatter than the current frame, so it obeys "outlines for now / don't brighten".
**Lane.** Inside-the-cell geometry (`gBorder` is on HANDOFF's FREE-TO-BREATHE list); energySpring is
the slowest spring in the set. Line AREA follows loudness → lum follows music (accepted since iter 13).
```
old: |    gBorder = 0.034 + waveletBand5Spring * 0.020 * gGate;   // thin neon tube, not a fat band
new: |    gBorder = 0.028 + energySpring * 0.014 + waveletBand5Spring * 0.014 * gGate;   // IRIS LINE_THICK: loudness = line weight (same width as before at energySpring 0.63; quiet -> thinner)
```
**Meters.** lum ↓ and dark ↑ in quiet passages; flat on the current track. Watch dark not exceeding
~0.85 in a breakdown (lines vanishing) — if so raise the 0.028 floor to 0.031.
**Revert.** Restore `0.034 + waveletBand5Spring * 0.020 * gGate`.

## 8. C5 SHIMMER HALO  (Iris trebleShimmer corner → halo bloom, ARC-GATED)
**Rationale.** trebleShimmer = treble × bass-light × chaotic; on this track ≈ 0.4–0.6 between kicks and
→ 0 on each bass spike (`smoothstep(0.5,0.05,waveletBassSpring)`), so the halo BLOOMS on the hi-hat wash
and TIGHTENS on the kick — a counter-rhythm to the lunge. Multiplied by `gArc` so it is ~0 during
"outlines" and only becomes part of hypercolor later — hence rank 8 despite being the most "Iris" move.
**Lane.** Light, SDF-masked halo weight (alpha). Springs + EMA only. Cannot lift interiors: the halo band
is `bw*1.1 … bw*(1.6+2.4*haze)` off the edge.
Four ordered edits (a is shared with C2 — skip it if C2 is already in):
```
a old: |uniform float spectralRoughnessSmooth;
  new: |uniform float spectralRoughnessSmooth;
       |uniform float spectralEntropySmooth;
b old: |float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gReact, gTwist, gPix, gGate, gArc;
  new: |float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gReact, gTwist, gPix, gGate, gArc, gShimmer;
c old: |    gGate = liveGate;   // GLOBAL gate: bandForDepth()/fractal() are defined above mainImage and must see it too
  new: |    gGate = liveGate;   // GLOBAL gate: bandForDepth()/fractal() are defined above mainImage and must see it too
       |    gShimmer = clamp(waveletBand5Spring * 1.3, 0.0, 1.0) * smoothstep(0.5, 0.05, waveletBassSpring) * smoothstep(0.3, 0.7, spectralEntropySmooth) * gGate;   // IRIS trebleShimmer corner: bright + chaotic + bass-light (closes on the kick)
d old: |        float f = rim * 0.90 + halo * (0.07 + 0.10 * haze) * mix(0.35, 1.0, gArc);   // halo fog grows over the hour
  new: |        float f = rim * 0.90 + halo * (0.07 + 0.10 * haze + 0.12 * gShimmer * gArc) * mix(0.35, 1.0, gArc);   // halo fog grows over the hour; IRIS trebleShimmer blooms it (arc-gated, SDF-masked)
```
**Meters.** Now: nothing (gArc ≈ 0). At gArc 0.5+: dark −0.02..−0.04 on hi-hat sections, lum +0.01, clip
0. Watch that the halo doesn't fog cell interiors at coarse levels (coarse `bw` is 0.2×gBorder, so it
shouldn't). Compile risk: gShimmer is a forward-declared global, same pattern as gGate/gArc (iter 10 lesson
— it IS in the globals line, edit b).
**Revert.** Edit d back to `(0.07 + 0.10 * haze)`; b/c are inert.

## 9. C9 COLOR_GATE FLOOR  (Iris: gate colour softly)
**Rationale.** Iris iter 5: palette terms get `0.35 + 0.65*gate` so colour never freezes in the quiet.
UNDER THE LOCK this matters MORE than before: `melodyFlow*0.32*gGate` (melodyFlow 0.80 static-high now)
and the centroid term move `s` by up to 0.26 + 0.30 turns as gGate swings 0.45→1.3 — i.e. loudness alone
re-assigns a large fraction of lines between orange and purple, a whole-frame colour flip on every energy
swell (the binary selector amplifies what used to be a gentle hue lean). The floor narrows the gate swing
to 0.64–1.19, so fewer lines flip per dB. Two edits; at gGate = 1.0 both factors equal 1.0, so no colour
snap on a loud apply.
```
a old: |            + melodyFlow * 0.32 * gGate
  new: |            + melodyFlow * 0.32 * (0.35 + 0.65 * gGate)   // IRIS COLOR_GATE: colour gated softly with a floor
b old: |            + waveletCentroidSpring * 0.30 * gGate     // palette leans cyan when bright, magenta when dark
  new: |            + waveletCentroidSpring * 0.30 * (0.35 + 0.65 * gGate)     // palette leans cyan when bright, magenta when dark (COLOR_GATE floor)
```
NOTE: edit b's anchor is the same line C2-c appends after — apply C2 first, then C9-b's `old` still hits
(C2 only adds a line after it). **Meters.** flat. **Revert.** restore `* gGate` on both.

---

## Not queued, considered and rejected
- **monsterBass corner** — dead on this track (centroid 0.79 ⇒ `smoothstep(0.55,0.1,centroid)` = 0). Re-ask if a sub-heavy dark track arrives.
- **Whole-frame hue ← treble** (`s += band5 * k`) — a 2 Hz spring on a hi-hat track spins the whole frame's hue = brightness shift by another name (HANDOFF §3). Two-tone (C1) moves hue *differences*, not the frame.
- **Ring radius / hex radius ← treble** — third geometry mover this track (ring swell + lunge already live); iter 5/7 showed lumSpread climbs when movers stack.
- **kickExcess into bassPulse (zoom)** — binary per-frame on this mic → instant release = the vetoed kick-zoom shiver. Lives in C4 (feedback) instead.
- **Treble-paced spin/pulse RATE** — needs an accumulator the shader can't build; only `flowPhase`/`morphPhase` exist as uniforms. Post-show: ask wavelet-ease for a `treblePhase`.
