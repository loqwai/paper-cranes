# lattice-bead HANDOFF — the lattice, re-tiled by the bead outlines

Written 2026-09-03. Branch `worktree-lattice-bead-outlines`, a worktree off `origin/main` @ `42fde5a`.
**Nothing is built yet.** This is the brief: the goal, both source truths, the exact line to cut, the
verified mechanics of the image buffer, and the gotchas that would otherwise cost a day.

**This document is written to be handed to a coordinator.** §13 is the fan-out plan: how to split
this into parallel hypotheses, one teammate each, and how to keep them from colliding.

**Two decisions are already made, so don't re-open them:**
- **Mon (and the other motifs) as lattice cells is the direction** — confirmed by the user
  2026-09-03. §2 explains why it has no precedent; that is not a reason to hesitate, it just means
  nobody has measured it yet. Measuring it is the work.
- **The bead track runs in PARALLEL and is not a dependency.** The user has significant progress
  and physical beads in hand, currently debugging. Assume the print pipeline works. Nothing in this
  document should wait on it.

> **Read `shaders/redaphid/wip/lattice-vj/HANDOFF.md` before editing any shader.** Its channel
> hierarchy (§7 below) was paid for with live failures and applies directly to this work.

---

## 1. The goal

Make variants of the lattice visual where **the bead silhouettes replace the hexagon as the
lattice's repeating unit**, fed in as PNGs through the image buffer, so the lattice is transformed
by the bead outlines *in obvious ways* — you should be able to look at the wall and name the bead.

The payoff: the bead on someone's wrist and the lattice on the wall are the same motif.

## 2. This has a proven precedent — and it has never been pointed at a mon

The bead-silhouette→shader-mask pipeline already exists. You asked for it on **2026-05-21**, in
almost the same shape as this request:

> *"I want variants of the 'taco' visuals using the robot mask here:
> `D:\Projects\nfc-bead\beads\robot\robot.svg`. Generate a 1024x1024 mask, put it in the right
> place in the project, then make the robot variants"*

That produced `public/images/taco-stencil.png` (still there) and the same flow was used for
`handstand.png` and the rezz masks. **So the mechanism is proven; what is new is aiming it at the
mon.** No mon stencil exists, and no shader has ever sampled a crest.

Worth knowing, because it shapes §9: **the mon were not chosen for visual reasons.** They arrived
on 2026-09-02 as the answer to a manufacturing question — after you rejected the first shape set
(*"Those are pretty bad. I want the bead SHAPE to change - not just disks"*) and asked:

> *"There must be an existing design language with the constraints I'm describing we can draw from.
> From history or something"*

Japanese mon won because they are circular, strictly symmetric, abstract-geometric, and legible in
one colour at small size — i.e. ideal for a glowing single-filament bead in the dark.

Nobody had argued *why a crest should make a good lattice* — **the user has now made that call
(2026-09-03): the mon and the other motifs should make good lattices.** So the question is no longer
*whether* to try it but *which motifs survive folding and shrinking*, which is an empirical question
and the reason §13 fans it out. Note the properties that won them the bead job — radial symmetry,
closed single boundary, large negative space, legibility at small scale — are, plausibly, the same
properties a folded lattice cell needs. That is the hypothesis. It has never been tested.

## 3. Source truth A — the shader

`shaders/redaphid/wip/lattice-vj/9.frag` is the current keeper (`8.frag` is the structure snapshot;
`9` is the learned fork, where mappings started coming from measurement).

### The one line that matters

`fractal()` mirror-folds the plane 10 times and draws a hex ring at each level. The cell **shape** is
decided entirely by `hexDist` (`9.frag:206`):

```glsl
float hexDist(vec2 p){
    #define MULT1 (1.0 / tan(PI / 3.0))
    #define MULT2 (1.0 / sin(PI / 3.0))
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * MULT1, max(dx, dy * MULT2));
}
```

used once, inside the level loop:

```glsl
float delt1 = abs((hexDist(uv) - hexR_i) - gRingGap);                  // the cell ring
float delt2 = min(length(uv) - gCross, min(uv.x, uv.y)) + gCrossBias;  // the cross
float m     = min(delt1, delt2);
```

`m` is a **distance**, and everything downstream is a `smoothstep` on it — `gBorder` → line coverage
`f`, `gFill` → interior lighting `lit`.

**So: swap `hexDist` for a bead distance function and the entire existing machine keeps working
unchanged** — line weight, hollowness, relief, palette, and the learned CHURN/WUB mappings all
survive. That is the whole trick. **Do not rewrite `fractal()`.**

Two dials are already in the right place: `gHexR` (cell radius) and `gRingGap` (hollowness). Note
`abs(d - gRingGap)` gives an **outlined** bead and `d` alone a **solid** one — both worth a shot.

## 4. Source truth B — the beads

`D:\Projects\nfc-bead`, branch **`glow-set`** (active today); there is also a **`japanese-mon`**
branch. Motif libraries live in `beads/glow-set/`:

| File | Contents |
|---|---|
| `japanese.py` | **The mon.** `MON = {mokko, kikko, kiku, ume, kikyo, suhama, matsukawa, katabami, hakkaku, ogi, tomoe}` |
| `adinkra.py` | Adinkra symbols (`SYMBOLS` dict) |
| `chinese.py` | Chinese glyph motifs |
| `shapes.py`, `talismans.py`, `glyphs.py` | Shape/talisman/glyph sets + the fit solver |
| `motif_outline.py` | Exports one motif to a JSON polygon for Blender |

These are not traced artwork — they were built from **measured polar radius profiles** off 504
public-domain Wikimedia crest SVGs, with quality gates (stroke ≥1.6mm, interior angle ≥26°, and a
symmetry gate: *symmetric or obviously asymmetric, never almost-symmetrical*).

### Why this is better news than it looks

**The mon are already signed distance fields.** `japanese.py` composes them from `sd_circle` /
`sd_capsule` / `sd_polygon` with smooth `op_union` / `op_sub` / `op_inter` — the *identical*
vocabulary GLSL uses — and only at the very end does `trace()` march squares to a contour for the
3D print:

```python
D = sdf(X, Y)                       # japanese.py:172, on a numpy meshgrid
loops = measure.find_contours(D, 0.0)
```

`D` **is** the distance field, on a grid, immediately before it gets thrown away. You do not have to
trace a bitmap or vectorise anything — baking a distance PNG is ~20 lines.

## 5. How the image buffer actually works (verified in this worktree, not assumed)

- `?image=<path>` → `index.js:357` (`initialImageUrl`, default `images/placeholder-image.png`)
  → `src/Visualizer.js` `getTexture()` → bound as the `initialFrame` sampler.
- **Sample it with `getInitialFrameColor(uv)`**, which is just `texture(initialFrame, uv)`
  (`src/shader-transformers/shader-wrapper.js:76`). **58 shaders use this**; it is the project idiom.
  `iChannel0` is bound to *the same texture* (`Visualizer.js`: both `initialFrame` and `iChannel0`
  receive `initialTexture`), so they are interchangeable — but follow the idiom.
- Files live in **`public/images/`**. `vite-plugins/shader-plugin.js:119` indexes them into
  `images.json`, which feeds the list page's image picker — **so a bead PNG dropped in
  `public/images/` becomes selectable live from your phone**, no shader edit needed. That is the
  fastest possible iteration loop for "which mon reads best": one shader, swap the image.

### Three mechanical facts that decide the approach

```js
// src/Visualizer.js, getTexture()
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
createTexture(gl, { src, crossOrigin: 'anonymous',
                    min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.REPEAT })
```

1. **`NEAREST` filtering ⇒ bake an SDF, never a bare silhouette.** A 1-bit outline sampled with
   `NEAREST` and magnified across a lattice cell gives hard staircase edges, and no `smoothstep` can
   repair them because the data has no gradient. An SDF degrades gracefully — quantised but still
   continuous and monotonic across the boundary — so the existing
   `smoothstep(gBorder + alias, gBorder, m)` re-smooths it into a clean line. **This is the highest-
   leverage decision in the task.**
2. **`REPEAT` wrap is a gift.** `fractal()` already works in a folded, tiled domain
   (`p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5)`), so a tiling texture lands naturally. Use
   power-of-two dimensions.
3. ~~**The image is Y-flipped on upload.** Bake accordingly or the mon reads upside down — harmless
   for the radially symmetric ones, obvious on `tomoe` and `ogi`.~~
   **CORRECTED 2026-09-03** (`lab/tomoe`, verified with an unfolded SDF probe against the source PNG).
   `UNPACK_FLIP_Y_WEBGL=true` **prevents** a flip rather than causing one — it is the conventional
   correction that makes texture `v` agree with the image's own up. **No bake needs Y compensation**,
   and a teammate "fixing" this will break a bake that is already correct. Confirmed on `tomoe`:
   notch upper-left shoulder, tail tip lower-left, crescent opening upper-right — matching
   `mon-tomoe.png` exactly.

   Two further sampling mechanics found in the same run, both worth knowing before reasoning about
   what a motif will do:
   - `fractal()` computes `vec2 uv = abs(p)` **before** the cell distance — a 4-fold mirror on the
     sampling coordinate. **Every motif is symmetrised before it is drawn**, so chirality is not
     observable in the lattice and any hypothesis resting on asymmetry is unanswerable as posed.
   - The mon is sampled as a **tiled** field, not one quadrant: with `gHexR≈0.6` and `|uv|` reaching
     ~1.4 the texture coordinate exceeds 1.0 and `REPEAT` wrap pulls neighbouring copies in. Masking
     the other three quadrants changed 83% of pixels.

   **What actually predicts a motif's effect is boundary crossings per radial direction** — how often
   a ray from the cell centre crosses the silhouette — **not symmetry** (§10 guessed symmetry).
   Measured departure from the hex baseline at `t=8`: `ume` (5 lobes + notches) **91.4%**,
   `kikko` 46.6% (confounded — kikko *is* a hexagon), `tomoe` (~1 crossing/ray) **42.3%**.

## 6. The asset pipeline

Write it in `nfc-bead` (that is where the libraries and the `.venv` with numpy/scikit-image live —
`motif_outline.py`'s docstring explains why that venv exists, since Blender 5.0 lacks skimage), and
emit straight into `paper-cranes/public/images/beads/`.

```
mon SDF (japanese.py) → evaluate on an NxN grid → encode → PNG → public/images/beads/mon-<name>.png
```

**Channel layout — extends the existing stencil convention rather than replacing it.** The taco
masks encode `vec2(tex.a, tex.a * (1.0 - tex.r))` = (silhouette, ink strength). Keep that, and add
the distance field in the free green channel:

| Channel | Contents |
|---|---|
| **A** | silhouette coverage (1 inside) — matches the existing convention |
| **R** | ink / interior detail — matches the existing convention |
| **G** | **the SDF**, `0.5 + d / (2 * BEAD_RANGE)` clamped to `[0,1]`, 0.5 = the boundary |
| **B** | spare |

One PNG then carries the whole bead and stays compatible with the taco-style shaders. **1024×1024
RGBA** matches the established precedent. Concentrate the usable gradient near the boundary — a
`BEAD_RANGE` of a few mm, not the whole bead — or every fillet reads at the wrong scale.

### In the shader

```glsl
#define BEAD_RANGE 6.0   // MUST match the bake
float beadDist(vec2 p){
    vec2 uv = p * 0.5 + 0.5;
    return (getInitialFrameColor(uv).g - 0.5) * 2.0 * BEAD_RANGE;
}
```

Then in `fractal()` replace `hexDist(uv)` with `mix(hexDist(uv), beadDist(uv), BEAD_MIX)` — see §7
before wiring `BEAD_MIX` to anything.

Note the taco shaders guard with a 2% margin (`if (imgUV.x < margin || ...) return vec2(0.0)`) so the
silhouette never bleeds to the texture edge. With `REPEAT` wrap and a tiling lattice you *want* the
bleed handled differently — bake the margin into the image instead of rejecting in the shader.

## 7. Constraints inherited from lattice-vj — do not relearn these live

From `lattice-vj/HANDOFF.md` §2, each earned by a live complaint:

1. **Geometry only EVOLVES.** Monotonic accumulators, one-way eased steps on drops, or your own
   navigation. **No sines, and no audio on fold params however smoothed** — fold error compounds as
   `scale^i` and reads as "kaleidoscope sections breathing."
   **⚠ The bead swap is a GEOMETRY change.** `BEAD_MIX` may be a hand knob or a one-way eased step
   on a drop. It must **not** take a per-frame audio value. A bead morphing back and forth with the
   kick is precisely the failure that had to be fixed four separate times (iters 138–142).
2. **Light/shading takes ALL the audio** — relief, per-depth bands, rim, specular. Never the global
   multiplier; that is the strobe channel and it has been rejected every time.
3. **Colour follows the slowest music only.** In-track hue drift ≈ 0.
4. **A ratchet needs a counter-ratchet.** A bead silhouette will not have the same lit area as a hex
   ring. If the frame gets darker, the compensation belongs in the *same* edit.

## 8. Variants worth building, in order

1. **`1.frag` — the morph.** `mix(hexDist, beadDist, BEAD_MIX)` on a knob. Ship this first: cheapest
   way to learn whether a mon reads at all at lattice scale, and the hex↔bead transition is itself
   performable.
2. **`2.frag` — bead as cell, hex as frame.** Bead on the fine levels, hexagon on the coarse ones
   (`i` is right there in the loop). Keeps the familiar coarse skeleton while beads populate it —
   likely the most legible "obvious" version, and the cheapest (see §9).
3. **`3.frag` — one motif per depth.** Different mon per recursion level. `iChannel1`/`iChannel3` are
   bound to the *previous frame*, and `iChannel2` duplicates `initialFrame`, so there is **only one
   image texture available today** — this variant needs a small `Visualizer.js` change. Verify
   before promising it.
4. **`4.frag` — the bracelet.** A sequence of motifs cycling on the set clock, so the wall walks
   through the beads actually on the bracelet.

## 9. Perf — re-measure before copying `@mobile: true`

`fractal()` runs `LEVELS = 10` with `if (i < FIRST) continue;` at `FIRST = 4` → **6 drawn levels = 6
dependent texture fetches per pixel per frame**, replacing 6 cheap ALU `hexDist` calls.
`lattice-vj` declares `@mobile: true`; that claim must be re-measured for the bead variants before it
is copied into a header. If it costs too much, sample the bead on coarse levels only — which is
variant 2 anyway.

## 10. Open questions

- **Which motifs first?** `MON` has 11. `kiku` (12-fold chrysanthemum), `tomoe` (3-fold comma) and
  `kikyo` (bellflower) look strongest — high radial symmetry and large negative space, which is what
  survives tiling and shrinking. That is a guess, not a decision: say which beads are actually being
  printed.
- **Mon only, or the whole glow-set?** `adinkra.py`, `chinese.py` and the skull/ghost/cat batch come
  through the same pipeline for free.
- **Outlined or solid?** §3 notes both fall out of the same code path — one screenshot each.

All three are **empirical and independent**, which is exactly why they fan out (§13).

## 11. Context you should know before spending time here

- **MOGEE FEST is 2026-09-06** (Mogollon Rim) — three days out. The bead track is in the user's
  hands and progressing (physical beads exist; debugging in progress). **Treat it as done for
  planning purposes and do not block on it.** These two tracks meet only at the motif list.
- Related known issues from the bead/NFC side, if these variants are meant to end up on a tag:
  `2cb.pw` shortlinks are broken (write full URLs — a shortlink needs a network round-trip and dies
  at a campsite); `wavelet=true` has been seen hanging Chrome to a black screen; offline caching is
  unverified. `lattice-vj` depends on `wavelet=true`.

## 12. State when this was written

- Worktree `.claude/worktrees/lattice-bead-outlines`, branch `worktree-lattice-bead-outlines`, based
  on `origin/main` @ `42fde5a`. No shader work started. Two files added: this HANDOFF and
  `.claude/skills/lab/SKILL.md` (§13).
- The `plasma-taco-live` branch is **untouched**, including its 272 lines of uncommitted edits. It
  is 42 commits behind main; the merge was not performed. Two stale untracked files there
  (`eclipse.md`, `lattice-vj/1.frag`, both superseded by main) were copied to the session scratchpad
  as a precaution — nothing was deleted, merged, or committed.

---

## 13. Coordinator: how to fan this out

The tool is **`/lab`** (`.claude/skills/lab/SKILL.md`, added on this branch). It is the silent
sibling of `/vibej`: Claude-in-Chrome, **no audio**, deterministic frames, screenshot judgement, one
hypothesis per teammate, verdicts appended to a shared ledger. Read that file before dispatching —
this section is only the dispatch plan.

### The isolation contract (the part that breaks fan-outs)

Each teammate gets **its own worktree, branch, `.frag`, browser tab, and PORT.**

> **⚠ `scripts/dev-port.js` is NOT branch-derived**, despite what `/vibej2`'s docs claim. It is a
> constant `6969` with a `PORT` env override, read by `vite.config.js` at config time. **Every
> teammate that forgets `PORT` lands on 6969** — and the failure mode is not a clean error, it is a
> teammate screenshotting somebody else's shader and filing a confident verdict about it.
> **Assign ports explicitly in the dispatch message.** This is the most likely way to get N
> plausible, worthless answers.

### Determinism is the whole point

`?noaudio=true&time=<T>&fullscreen=true`, fixed viewport, and a **time ladder** (t=4, 8, 16) rather
than a single frame. Two screenshots must differ only because the edit differed. Note this means
`/lab` can test **form** (shape, composition, legibility, palette) but **not reactivity** — a
hypothesis about how something responds to music belongs in `/vibej`, not here.

### Suggested first wave — six independent hypotheses

Build variant 1 (the `mix(hexDist, beadDist, BEAD_MIX)` morph, §8) **once, centrally, first.** It is
the shared substrate; every teammate below forks from it. Fanning out before it exists means six
teammates each writing the same scaffolding six different ways.

| # | Hypothesis | Owner works on |
|---|---|---|
| 1 | `kiku` (12-fold) stays legible as a cell at fold levels 4–9 | high-symmetry, high-frequency motif |
| 2 | `tomoe` (3-fold, deliberately asymmetric) survives folding better than symmetric mon | low-fold-count motif |
| 3 | Bead on fine levels + hex on coarse (variant 2) reads more clearly than bead everywhere | §8 variant 2 |
| 4 | Outlined (`abs(d - gRingGap)`) beats solid (`d`) for legibility | §3, both from one code path |
| 5 | SDF-in-green-channel bake survives `NEAREST` where a 1-bit silhouette does not | §5/§6 — **validates the core assumption** |
| 6 | Adinkra/chinese motifs behave differently from mon under folding | §4 other libraries |

**Dispatch #5 first or alongside #1.** Everything else assumes the SDF bake works; if it doesn't,
five teammates are testing on sand. It is also the cheapest to falsify — bake one motif both ways,
one contact sheet, done.

### What comes back

`journals/lab/LEDGER.jsonl`, append-only (`>>`, never rewrite — concurrent writers). Each line
carries `hypothesis`, `verdict` (`yes`/`no`/`partial`/`inconclusive`), `confidence`, `evidence` (a
contact-sheet path), `why` (the *mechanism*, not a feeling), and `spawned` (noticed but untested).
`/lab report` groups it for you.

**A `no` with a mechanism is a success.** The failure mode to police is a teammate reporting `yes`
without a contact sheet — a verdict with no evidence path is an opinion, and should be sent back.

### What is NOT parallelisable

- The variant-1 substrate (build once, centrally, first).
- The PNG bake pipeline in `nfc-bead` (§6) — one implementation, shared. Teammates consume its
  output; they should not each write their own baker.
- Any change to `Visualizer.js` (needed only for §8 variant 3, multi-texture) — that is a shared
  file and a serialisation point.

---

## 14. Measurement traps (each one produced a wrong verdict before it was caught)

Added 2026-09-03 from the first `/lab` wave. Every item below was a confident, plausible,
**wrong** measurement — not a hypothesis that failed.

1. **Never read a baked SDF through canvas2D.** `drawImage` + `getImageData` stores premultiplied
   alpha and cannot recover RGB where `alpha == 0`, so every exterior pixel reads 0 and the apparent
   max green caps at 127. This was reported as a "bake defect that blocks the fan-out". It is not:
   uploading through the real `Visualizer.js` path and reading back from the GPU gives exterior
   **199**, interior **46**, edge **140** — the correct signed field, matching a direct numpy read
   (45→199, 156 levels). **Read baked PNGs with numpy/PIL, or read back from the GPU. Never canvas2D.**
2. **Never measure luminance on a downsampled frame.** A 160×160 downsample of the same frames
   reports the bead variant *brighter* when full resolution says the opposite — thin bright lines
   average into dark ground. Measure at full resolution, and prefer **lit coverage** over mean
   luminance when the change is line-weight rather than exposure.
3. **`time=` does NOT fully determinise the frame.** `lattice-nav` carries state that advances in
   real time, so frames are only ±8% reproducible. Any numeric claim needs **n≥3 and a stated
   spread**; do not rank two motifs as different unless they separate beyond that noise.
4. **Seeds are random per browser profile.** `index.js` seeds `seed..seed4` from `Math.random()` into
   `localStorage`, and `seed3`/`seed4` drive lattice twist/swirl — so a fresh profile changes the
   picture between baseline and variant. **Pin seeds in the URL for every comparison.**
5. **In-app FPS cannot measure a lattice shader on desktop.** Vsync caps it and the app has a dynamic
   resolution scaler, so the canvas silently shrinks under load and FPS stays flat. Record
   `canvas.width/height` with every sample and report **pixels/second**, or benchmark offscreen at a
   fixed size.
6. **`mix()` evaluates both operands.** `mix(hexTerm, beadTerm, BEAD_MIX)` runs `beadDist()` and all
   its dependent texture fetches in **every** arm, including `BEAD_MIX=0`. §9's per-level saving is
   **not** realised by a per-level mix — it needs a real uniform branch. Measured: the entire bead
   cost is ~20% of frame time, so halving it buys ~10% on desktop. Mobile remains unmeasured and
   `@mobile: true` has not been copied anywhere.
7. **The Claude-in-Chrome tab group is shared between teammates and they evict each other's tabs.**
   Separate windows do not isolate it. Headed Playwright with a per-capture port assertion is the
   reliable path; reusable tools exist on `origin/lab/split` (`scripts/lab-shot.mjs`,
   `scripts/lab-bench.mjs`) and `origin/lab/kiku` (`lab-measure.mjs`, `lab-crossings.mjs`).
