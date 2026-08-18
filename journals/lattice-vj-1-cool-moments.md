# lattice-vj-1 — Session Journal

## Status
Iter 1/10 on a `/vibej 10` rehearsal run (job 7ba68067), 2026-08-18. Tab audio verified and the
quiet gate is genuinely open. Rig verified 2026-08-18. The loop is proven end to end against the
**display page** (`index.html?remote=display`), not the jam page — this rig drives a laptop
display from a phone, so there is no jam page in the topology. Waiting on music before the
first real tick: every reactive move this shader makes is audio-gated, and with a silent room
each tick would be inventing a musical intent that is not there.

## Rig notes (read this before the next run)

- **Target**: `redaphid/wip/lattice-vj/1` — a byte-copy of `chromadepth-lattice/6`, which is a
  `@favorite`. Point /vibej here and never at the committed 6.frag. Standing instruction from
  the user.
- **Page**: the display page, not jam. It exposes `window.cranes.flattenFeatures()` and can
  reach `/__save-shader`, so the skill's tick works unchanged — but the skill's `list_pages`
  /`jam.html?shader=` matching does not apply, and the tools here are `mcp__claude-in-chrome__*`
  (`javascript_tool`), not chrome-devtools `evaluate_script`.
- **`javascript_tool` will not serialize an async IIFE** — it returns `{}` even on success. Do
  the work, then confirm with a SEPARATE synchronous read (check the file on disk, or read
  `window.cranes.shader`). A `{}` here is not a failure; assuming it is will send you chasing
  a bug that is not there.
- **Hot-swap is real now.** `index.js` used to `location.reload()` on any `shaders-changed`,
  which during a set meant a black frame, an audio-context restart and the loss of the whole
  500-frame feature history — once a minute, usually for a file that was not even on screen.
  It now compares the changed path to the `shader` URL param and reassigns
  `window.cranes.shader`. Verified: page state survived a save (`__vjValidate` still installed).
- **`document.hidden` throttles rendering to a stop.** A backgrounded tab freezes `frameCount`
  via requestAnimationFrame throttling. Do not read a frozen counter as a stalled renderer —
  check `document.hidden` first.
- **The validator gate works**: current source → `ok:true`; source + `this is not glsl` →
  `ok:false` with a real GLSL error. Trust it, and never save without it.

## Cool moments

### Iter 1 — `wubDepth` deepens the cell breathing
- **Audio fingerprint** — `wubDepth` avg 0.69 (live peaks 0.84) + `spectralEntropy` 0.67 +
  `spectralCrest` 0.60, mids-forward (0.56 vs treble 0.49, bass 0.43), `energyZScore` peaking
  2.74, `sectionMode` moving 2→4. Read as wobble-heavy bass music with real drops.
- **What worked** — `wubDepth` was computed by wavelet-ease every frame and **referenced nowhere
  in the shader**. The single most characteristic feature of this genre had no visual answer.
  `gHexR` (cell radius) was breathing on `waveletBand2Spring` alone. Now:
  `gHexR = 0.60 + waveletBand2Spring * 0.12 * quietGate * (1.0 + wubDepth * 0.8)`.
- **Why multiply, not add** — adding `wubDepth` would raise the BASELINE cell size, so a wubby
  track would just have permanently bigger cells. Multiplying scales the DEPTH of the existing
  breath: a non-wub track is bit-for-bit unchanged, a wubby one breathes up to 1.8× harder.
  This is the general rule for an "amplitude" feature — it belongs on the modulation, never on
  the base.
- **Design hypothesis** — audit every feature the controller exports against what the shader
  actually reads. An unreferenced uniform is a whole musical dimension the visual is deaf to,
  and it is invisible because nothing looks broken.

### Iter 2 — sparkle follows spectral brightness (and dodges the phone)
- **Audio fingerprint** — a hard section flip from iter 1: `treble` 0.83, `centroid` 0.91,
  `entropy` 0.92, `roughness` 0.87, but `bass` 0.09 / `energy` 0.028 / `wubDepth` 0.26, and
  `sectionMode` 2→**7** with `sectionMix` 1.0. Bright, hissy, chaotic, no low end.
- **What was missed** — the sparkle block is the natural answer to a hissy passage, but two of
  its three drivers (`waveletBand5Spring`, `spectralCrestSmooth`) are **faders on the phone**,
  and TAKE OVER was engaged (53 keys in `messageParams`). So the one effect that should have
  been reacting hardest was being held still by hand. Only `spectralRoughnessSmooth` — the
  smallest term at 0.12 — was still listening to the music.
- **What worked** — scaled the whole sparkle by `(0.55 + waveletCentroidSpring * 0.9)`. Roughly
  2× between a dark passage and a bright one, and `waveletCentroidSpring` is smoothed AND is not
  one of the phone's six music faders, so it cannot be pinned away.
- **Design hypothesis** — **an effect whose every driver is a VJ fader goes deaf the moment the
  VJ takes over.** Each effect wants at least one driver outside the controller's fader set.
  The phone's music faders are `energySpring`, `waveletBass/Band2/Band5Spring`, `melodyFlow`,
  `spectralCrestSmooth`; safe-by-construction drivers include `waveletCentroidSpring`,
  `spectralRoughnessSmooth`, `wubDepth`, `sectionMode/Mix`, `evoPhase`.

## Signals the controller exports but this shader ignores
Checked at iter 1 — candidates for future ticks:
- `wubDepth` — **now wired** (iter 1)
- `bassNoteFlow` — bassline PITCH contour; nothing maps bass melody to anything
- `evoPhase` / `energyLong` — minutes-scale set evolution; only `evoWarp`/`evoPlasma` are read
- `sectionMix` — the breakdown→drop crossfade; only `sectionMode` semantics appear used

## Todo
- `[ ] confirm the microphone path under real volume` — every healthy reading so far
  (raw energy mean 0.098, peak 0.183, comfortably over the 0.065 gate) was captured with
  `&audio=tab`. On the mic, raw energy has only ever been observed below the gate, in a quiet
  room. `quietGate` is computed from RAW `energy` in `wavelet-ease.js:159`
  (`(energy - 0.015) / 0.05`), NOT from a normalized feature — so normalized features can swing
  0→0.9 and look reactive while the gate stays shut and 16 uses of it in the shader stay dead.
  Ten seconds of soundcheck on the mic settles it.
- `[ ] decide mic vs tab audio for the show` — tab audio measured strong; the mic is unproven
  under volume.

## History of changes
- 2026-08-18: rig-check comment appended and reverted; file is byte-identical to the committed
  copy. No visual change has ever been made to this shader by /vibej.

## Forks
- `lattice-vj/1 ← redaphid/chromadepth-lattice/6` — scratch copy so the favourite survives a set.

## Design hypotheses for v(next)
- A gate derived from RAW loudness is correct (it is what stops quiet-room noise from driving
  the visual) but it is invisible when it fails: everything downstream still moves, so the
  failure reads as "a bit dull" rather than "broken". Worth surfacing `quietGate` somewhere a
  VJ can see it during soundcheck.
