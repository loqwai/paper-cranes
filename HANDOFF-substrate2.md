# HANDOFF — lattice-bead / `hero.frag`, branch `lab/substrate2`

Written 2026-09-04, end of an autonomous overnight run. **Read this before touching `hero.frag`.**

Two other HANDOFFs exist in this tree and **neither is superseded by this one** — do not overwrite
them:

- `HANDOFF.md` (root) — the **live-show rig**, 2026-08-18: room codes, why the display must be
  `localhost`, why the phone loads from production. Operational, still current.
- `shaders/redaphid/wip/lattice-bead/HANDOFF.md` — the **original lattice-bead brief**, 2026-09-03:
  why mon, how the SDF bake works, the `fractal()` fold constraint and its lifting, the measurement
  traps from `/lab` wave 1. Pre-work document, still accurate.

This one is the *current state* of the shader work.

---

## 0. TL;DR

`hero.frag` is built and committed, and **has a confirmed defect that violates the user's most
explicit standing constraint.** It is not ready to project. The defect is measured, localised to
three lines, and the fix is written out in §3. Everything else in the family is in good shape.

**The user's last direction, verbatim, in priority order:**

1. *"focus on interesting, complex, visual reactivity that scales each bead by unique audio
   features and colors and shapes the sophisticated patterns and backgrounds"*
2. *"the bead should generally be at the center — a 'hero bead'. With others that can flex, spin,
   grow, shrink, and tint aesthetic colors"*
3. *"I don't want the overall camera animation to 'snap' back and forth with rotations"*
4. *"and NO shuddering or quick breathing of the background."*

(1) and (2) are delivered. (3) holds, measured. **(4) does not hold** — §3.

---

## 1. Where everything is

| | |
|---|---|
| Worktree | `D:/Projects/pc-lab-sub2` — **always `cd` here first** (§7.1) |
| Branch | `lab/substrate2` |
| Dev server | `http://localhost:6994` (running, `PORT=6994`) |
| HEAD | `172894a` — lattice-bead: hero.frag |
| Uncommitted | `scripts/hero-motion.mjs`, `scripts/hero-deaf.mjs`, this file |

### The family — `shaders/redaphid/wip/lattice-bead/`

| File | What it is |
|---|---|
| `1.frag`–`3.frag` | early tiling forks (`3.md` documents) |
| `4.frag` | **LEGIBLE figure/ground.** 33 presets, all on the corrected palette. Most stage-ready of the tiling set. |
| `5/6/7.frag` | the three agents' forks — rhythm ripple / timbral colour / ChromaDepth |
| `arrival.frag` `bright.frag` `negative.frag` | palette + entrance experiments |
| `detail.frag` | five quiet channels; per-bead breathing on 11 normalised drivers (incl. 3 medians); directional sweep; hairline specular |
| **`hero.frag`** | **current deliverable** — hero bead + orbiting satellites (§2) |

---

## 2. `hero.frag` — what it is, and why it is shaped this way

Everything before it was an infinite `fract()` tiling, and **a tiling has no centre**, so it can
never have a hero. `hero.frag` is therefore a different architecture, taken from the hearts shaders
(`hearts/1.frag`, `hearts/spinny.frag`): **discrete instances** placed by hand — one hero at the
origin plus 4–9 satellites on an orbit — instead of a folded domain.

### Run it

```
http://localhost:6994/jam.html?shader=redaphid/wip/lattice-bead/hero&controller=dodeca-bloom
  &image=images/beads/mon-hakkaku.png&satellites=6&wavelet=true&onset_refractory_ms=380
```

**`?controller=dodeca-bloom` is mandatory.** Every phase and envelope comes from it; without it they
all read 0 and the frame is static. `hero.frag` contains **no `iTime` reference at all** — the image
is a pure function of the controller's uniforms. That is a feature (headless renders are exactly
reproducible; the noise floor in §5 measured 0.00%) but it means the shader cannot move on its own.

### Channel discipline (from iris/2 and the coat journals)

- **`spin_angle` / `morph_phase` / `flow_phase` / `hue_phase`** — monotonic accumulators. The music
  sets their *rate*; they only ever increase. There is **not one `rot(someFeature)` in the file**,
  because that is exactly what snaps: the feature falls and the angle unwinds. This is why (3) holds.
- **`*_env`** (bass/mids/treble/energy/entropy/centroid/flux) — slow smoothed levels. Geometry and
  background read **only** these.
- **`bass_pump` / `drop_glow` / `pitch_pulse`** — FAST. *Intended* to be confined to the beads.

### Per-bead individuality

Each satellite gets its own slow driver (six rotate via `mod(i,6.0)`), its own spin rate **and
direction** (`dir = h1 < 0.5 ? -1.0 : 1.0`), its own hue offset and its own flex phase. Neighbours
move on genuinely different musical quantities rather than in unison — that is what makes them read
as individuals instead of one thing drawn six times.

Hashing is `hash11`. **Never `fract(sin(x)*43758.5453)`** — unstable in float32; it produced a
two-state flicker earlier in this work.

---

## 3. ⚠ THE DEFECT — the background flashes on the beat

**Constraint (4) is violated.** Measured 2026-09-04, `scripts/hero-deaf.mjs`:

```
                             changed   mean d    max d
  noise floor (A vs A)         0.00%     0.000      0.0
  FAST 0 -> max               53.06%    36.782    170.9
  SLOW phases nudged          24.20%     0.852     15.4

  radial % changed (centre -> corner, 10 bands)
    fast:   3  94  85  73  88  73  35  10   2   0
    slow:   0  23  33  34  49  38  14   3   0   0
```

Driving the three fast channels 0 → max repaints **53% of the frame** — *broader than the slow
phases do* — with mean luminance delta 36.8 and peaks of 170. The radial profile shows the change
filling bands 1–6 of 10. That is a near-full-screen flash on every kick.

### Why the code-level invariant did not catch it

`hero.frag`'s header claims the fast channels are *"confined here and masked"*, and a grep really
does show them only inside `drawBead`. **The grep was the wrong instrument.** The lines that matter
(`hero.frag:153-154`, `:168-170`):

```glsl
float cov = smoothstep(aa, -aa, d);             // coverage — tight, correct
float rim = smoothstep(aa * 9.0, 0.0, abs(d));  // a WIDE soft halo
...
float punch = 0.55 + 1.30*bass_pump + 1.90*drop_glow + 0.80*pitch_pulse;
vec3 col = body * cov * 0.85 + edge * rim * punch;
cover = max(cover, cov);                        // cover ignores rim
```

Two compounding mistakes:

1. **`cover` gates only the ground term, never `rim`.** "Confined to `drawBead`" does not mean
   "confined to the bead" — the halo is unmasked.
2. **`beadDist` returns distance in units ~2.4× uv**, because it returns `d * r` where `d` already
   spans ±`BEAD_RANGE` (6.0). With `aa = BEAD_RANGE*2.5/iResolution.y = 0.0268`, the rim band
   `aa*9 = 0.241` is roughly **56 px of halo around a 112 px hero**. `punch` then scales it by up to
   `0.55 + 1.30 + 1.90 + 0.80 = 4.175` — a **7.6× swing** over its resting value.

**This is iter 10's bug wearing a different hat.** Then, the full-screen flash was the *ground* term
and the fix moved the event onto the contour. The contour's glow is simply wide enough to be a
full-screen flash again. Record it as: **moving an event off the background is not the same as making
it local — measure the extent, never reason from the call site.**

### The fix (designed, NOT applied)

Three edits, all inside `drawBead`:

1. Narrow the halo: `aa * 9.0` → about `aa * 3.0`.
2. Cut the punch range; ~4.18 max is far too wide. Something near
   `0.55 + 0.45*bass_pump + 0.75*drop_glow + 0.30*pitch_pulse` keeps punch legible at ~3.6×.
3. Give `rim` a coverage-referenced falloff so the swing lives on the silhouette, not in the air
   around it.

**Then re-run `node scripts/hero-deaf.mjs`.** Target: *fast % changed* well under the slow figure,
ideally near actual bead coverage. **Do not accept the fix on a screenshot** — the entire point of
§3 is that this defect is invisible to the checks that were being run.

---

## 4. What DOES hold

- **No snapping.** `hero-motion.mjs` Test B, 24 frames of a synthetic build + drop: whole-frame step
  median 13.20, max 26.93 → **ratio 2.04×**. A snap-back would spike that hard. Motion is continuous
  because every rotation is a monotonic accumulator.
- **The beads genuinely respond.** `corr(bass_pump, centre luminance) = +0.442`; centre luminance
  67.3 → 115.8 when the fast channels open; contrast 55.8 → 46.6 (pre-drop) → **72.6 (drop)** → 47.0.
  **The §3 fix must not flatten these — re-check both numbers after editing.**
- **Recognition survives at hero size** — hakkaku's star, tomoe's comma, kiku's chrysanthemum all
  nameable in the render.

---

## 5. The scripts — and an instrument that lied

- **`scripts/hero-deaf.mjs`** — trustworthy. Counts *what fraction of the frame changes* between two
  renders, with a self-control pair for the noise floor, plus a radial profile. Needs no masking and
  the answer interprets itself. **Use this one.**
- **`scripts/hero-motion.mjs`** — Test B (continuity) is good. **Test A is INVALID — ignore its
  verdict.** It probes the four frame corners, and corner luminance is **0.93–1.56 out of 255**: the
  corners are black. It "proved" the background was deaf by measuring a region with no background
  signal in it, printing `background DEAF to fast channels (constraint met)` while the truth was 53%.
  Delete Test A or re-site it; do not let its output be quoted.

This is the **sixth** instance in this work of one failure — *the instrument lacked the axis, or the
signal, for the property being judged*. Running list: a whole-frame metric blind to an effect on 1/11
of beads; luminance blind to *direction*; downsampling blind to a 1 px hairline; self-mirroring a
*tiled* field measuring tiling phase rather than motif chirality; a *still frame* unable to measure
flash; and now a probe sited in black.

> **Standing rule: name the property, then check the instrument has both that axis and real signal
> in the region sampled.**

---

## 6. Open decisions — the user's, not the implementer's

1. **Halo width vs recognition.** Even after §3 this is a look call: the glow follows each motif's
   own outline (so it is not a foreign shape) but it softens the silhouette at satellite size.
   Tighter = more nameable, less bloom.
2. **Satellite count.** 9 is too busy — the hero stops reading as the hero. **4–6 is the useful
   range.** `?satellites=` dials it, but note `?satellites=0` does **not** mean zero (§7.2).
3. **`kikyo` vs `ume` cannot be separated in-shader.** Measured on the baked artwork: radial-profile
   distance **0.0193**, against 0.0786 (suhama/katabami) and 0.1409 (kikko/hakkaku) — 4–7× more alike
   than any other pair. `japanese.py::kikyo`'s own docstring says the tip was opened to ~67° and
   *"the difference from ume is now only the tip"*. **Artist decision in `nfc-bead`; it affects the
   printed beads.** No shader change can fix it.
4. **`theme 2` flash source** — isolating K173 (`lb`) / K174 (`ls`) needs ~40 s of cycling the live
   projection through five palette configs. The user declined doing that mid-projection; still
   pending a quiet moment.

---

## 7. Traps that cost real time here

1. **Always `cd /d/Projects/pc-lab-sub2` before running anything.** Scripts use relative output
   paths; running them as `node <abspath>` with no `cd` wrote into the user's *main* worktree
   (`D:/Projects/paper-cranes/journals/lab/shots/`). Cleaned up and the main tree restored — but the
   shell resets cwd between calls, so re-check every invocation.
2. **The house "0 means unset" convention bites.** `#define SAT_COUNT (satellites > 0.0 ? … : 6.0)`
   makes `?satellites=0` yield **6**. The same convention already caused a silent bug in `4.frag`,
   where `?legible=0` became 0.55. If a param must express zero, write
   `clamp(max(knob_N, param), 0.0, 1.0)`.
3. **URL params beat controller output *every frame*.** `?navZoom=` in a preset silently killed
   pinch/wheel zoom. Working fix: seed-only aliases (`?navZoom0=`, `?paletteShift0=`) read once at
   init — see `controllers/lattice-nav.js`. `history.replaceState` stripping does **not** work;
   `ParamsManager` re-syncs it straight back.
4. **`hero.frag:65` has a stale comment** — says `heroScale` defaults to 0.62; the code says 0.20.
   Fix alongside §3.
5. **Judge "is audio present" from ABSOLUTE feature values.** The feature stream froze once, every
   band stuck to 5 dp for 300 frames while the `*Normalized` values swung wildly — the range had
   collapsed to zero, so the normalised channels were pure noise and looked alive. A reload revived
   it.
6. **`quietGate` needs a *relative* threshold.** The original absolute one (`(energy − 0.015)/0.05`)
   was tuned on another rig; live energy mean was 0.01637, so the gate sat at 5.1e-8 and pinned every
   audio term to zero. **That was the user's "audio reactivity is almost nonexistent".**
   `controllers/wavelet-ease.js` now tracks a decaying peak; gate mean 0.906.

---

## 8. Blocked / needs the user

- **`/vibej tick` cannot run.** Every invocation this session failed with
  ``Shell command permission check failed for pattern "!`./scripts/dev-port`"``. The skill shells out
  to `./scripts/dev-port` and that pattern is not permitted on this connection. **No tick has run.**
  Needs a permission entry, or the skill changed to read `PORT` from the environment.
- **Commit hook intermittently blocking.** A personal-data guard reads its own cached scan artifact
  at `C:/Users/<user>/.claude/personal-data-guard/latest.txt` and flags ffmpeg paths recorded
  *inside that file* (lines 2539/2665). Staged diffs grep clean; retries usually succeed.
  **The user should clear or exclude that file.**
- **Two background agents were stopped by the user** — "Rhythm articulation reactivity" and
  "ChromaDepth bead variants". Their results never landed; they have not been respawned.

---

## 9. Suggested order of work

1. **Apply the §3 fix and re-measure with `hero-deaf.mjs`.** Nothing else matters until the frame
   stops flashing — it is the user's most-repeated constraint across the whole session.
2. Re-check §4's two reactivity numbers so the fix has not simply killed the punch.
3. Fix or delete `hero-motion.mjs` Test A so it stops emitting a false pass.
4. **Put `hero.frag` on the live jam rig.** It has *never been seen with the controller running* —
   only headless with pinned phases. The monotonic motion is precisely what a still frame cannot
   show, and it is the direct test of constraints (3) and (4).
5. Then the look calls in §6.

**Do not switch the user's live projection tab without asking** — they rejected a change mid-set for
exactly this reason earlier in the session.
