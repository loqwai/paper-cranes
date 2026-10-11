# VJ handoff — 2026-10-09 ~22:25 MST (show in progress)

## Wall
- Show Chrome on the XGIMI (CDP 9333), `jam.html?shader=claude/wip/black-sun/sun-1-wip&controller=black-sun&wavelet=true&vj=1&remote=display&audio_device=USB%20Audio%20CODEC`. Dev server: `npm run dev` from `~/Projects/paper-cranes` (6969), branch `peter-show`.
- Audio: USB Audio CODEC. Recovery snapshot: `.claude/vj-state.json`.
- Panic forks (frozen, compile-checked): `sun/10`, `sun/11` (`/show panic sun/11`).

## Live in sun-1-wip.frag (uncommitted)
NO-SHIVER-2/3/4, LIMB-1b, GLOW-PULSE-1, COLLAPSE-LIFT-1b, COMPANION-LOOK-1, SCENES-2b (ORBIT/ECLIPSE, now gated off by no-space), NO-FLASH-1, SKY-RETURN-1, FRACTAL-SKY-1, FRACTAL-CALM-1b, LATTICE-MIX-1, EVO-WIRE-1, ZOOM-K4-1 (K4 flies into the fractal), SUN-CAST-1b (dwarf, red giant, pulsar, binary), PERF-CAST-1.
- Runtime ramps (sky/no-space/lattice/cast) live in page memory: a reload resets them unless baked — bake them next.
- Controller `controllers/black-sun.js`: bs_mood*, bs_evo*, bs_dropEnv/buildEnv/shiftPulse/evoJump (documented at top).

## In flight when the session ended
- LATTICE-FEAT-1: LANDED + live. 40 smoothed channels bs_f* (16 fast / 12 mid / 12 slow) wired ±12–15% per-cell into lattice glow/width/sat/hue/detail/sparkle; geometry via rates only. Jank 2–5/600 (borderline — trim if it climbs). It froze the wall ~1 min mid-edit (NaN from seconds-scale time constants in the per-frame rate() helper; fixed).
- OKLCH colour kit DONE → `docs/oklch-palettes.md` (compiles via __vjValidate; hue in turns; use `srgb2oklch` — wrapper already defines `rgb2oklch`). NOT yet applied. Recipe: gBaseH = fract(bs_moodKey*.5 + gPal*.25 + HUE_SPIN); replace `lsdBand(floor(k),…)`/`bandBlend` (the green/pink source: near-complementary pairs at C≈0.17 via floor) with palSplitComp/palAnalogous(palCycle(k/6.)); tiles → palAnalogous(hash12(id), gBaseH+.5, .10); finish sky+lattice with harmonize(col, gBaseH, .5); K11 → palMood warmth. If baseH lands in pink (~0.8–1.0) prefer palAnalogous.
- Pending offer: make the sun characters bigger with glow + visible pulsar beams.

## Must-know gotchas
- **MIDI**: the page's own listener's port closes; dials only work through the in-page bridge `node node_modules/.midi-keep.mjs` (sets `window.__midiKeep`/`__midiBridged`). After ANY reload, rerun it. Arm a watchdog Monitor that reinstalls it when `__midiKeep` is missing.
- **Kiosk guard**: MCP OAuth pages (token.sibi.fun, auth0) open in the kiosk when it's the only Chrome. Keep a Monitor closing non-localhost:6969 tabs (CDP /json/close).
- Read knobs via `flattenFeatures().knob_N`, not `manualFeatures` (URL knobs aren't there).
- Never `isolation: worktree` inside this checkout (Vite reloads the wall). Use `git worktree add ../paper-cranes-<name>`.
- After every shader edit check jank in the next pulse (over32 ≤ 2/600) — two perf regressions slipped tonight.
- `quietGate` isn't emitted by black-sun → meter `gate` is always 0; ignore it.

## Other work
- PR #161 (video capture → `getLastFrameColor`), worktree `~/Projects/paper-cranes-video`, branch `video-capture`: 4 review rounds, last clean, CI green, still draft. Bring onto the wall = merge into the served checkout (one reload) when the capture card is plugged in; use `video=<label>`.
- Uncommitted: `scripts/twister-dials.js` (live dial grid: `node scripts/twister-dials.js`), forks sun/10–11, controller edits, journal + prefs.
- Post-show fixes: `src/midi.js` should reopen its own port; `scripts/vj/show.js` goto should hold the CDP grant until audio starts; vite should ignore `.claude/**`.

## Session 2 (22:25 to ~23:00)
- Forks `sun/12` and `sun/13` are panic-safe snapshots of the live wall (`/show panic sun/13`), with controllers frozen as `sun-12.js` and `sun-13.js`.
- K10 is now PAINT (the fade is a constant 1). K1 and K17–K20 are the tendril params (curl, count, length, width, sway), now audio-driven via `#define`s in sun-1-wip; the knob lines are commented underneath.
- The Twister bank-2 CC16–19 → knob_17–20 remap was done live in localStorage (they had been bound to the dial push-switches).
- Jank is CPU-side: a flat shader still drops about 9 frames per 600. The suspects are the CDP pollers and the 40-channel controller. The MIDI watchdog was slowed to 20 s.
- painterly2 is in flight on bricks (the regular stroke grid), soft sunspots and the pink rays.
