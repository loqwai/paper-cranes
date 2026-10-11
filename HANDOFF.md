# HANDOFF · Friday show, 2026-10-09

The rehearsal is over. Everything below is merged to `main` unless it says otherwise.

## At the venue

1. Plug in the projector, Twister and audio. **Set the projector to 1920×1080 at 60 Hz** in
   macOS Display settings. This lowers GPU load, and older USB-C to HDMI adapters are HDMI 1.4.
2. Make sure the macOS input is **BlackHole 2ch** with the music routed into it.
3. Turn on Do Not Disturb, and quit any break-reminder or screen-dimming app.
4. In Claude Code, from this worktree, run **`/show`**. It runs the preflight, launches the wall,
   checks audio, arms the watchers, and always starts `/vibej2`, which listens to your dials.
5. Ask Claude to **resend the Twister ring colours**. They reset whenever the Twister is replugged.
6. Keep the cheat sheet open: `glow -p docs/twister-cheatsheet.md`.

Escape hatch: `/show panic sun/7` hot-swaps a known-good fork without a reload.

## Backup: render on a second computer

The dev server listens on all interfaces. On the backup computer (same network, no client
isolation), open the jam page by this laptop's IP (`ipconfig getifaddr en0`; it was
`10.201.98.218` at rehearsal and will change at the venue):

```
http://<IP>:6969/jam.html?shader=claude/wip/black-sun/sun-1&controller=black-sun&wavelet=true&remote=display
```

Chrome blocks the mic and MIDI on plain `http://<ip>`, so launch it with
`--user-data-dir=/tmp/cranes-backup --unsafely-treat-insecure-origin-as-secure=http://<IP>:6969`
(or set that address in `chrome://flags/#unsafely-treat-insecure-origin-as-secure`). It then uses
its own default audio input. The Twister only drives the laptop's page; forwarding the dials needs
the laptop page on `remote=control`.

## Gotchas learned tonight

- **The dev server runs from `~/Projects/paper-cranes` (main), not this worktree.** Edits here
  only reach the wall after a PR to `main` and `git pull --ff-only` there. Signals and the critic
  log live in that checkout's `.claude/`. `/show` preflight now prints the serving checkout.
- **Dials at 0 give the show look.** STORY above 0 locks an act. SUN X/Y at 0 means automatic
  drift; manual control blends in over the first 8% of the dial.
- **The Twister is absolute.** The first touch of a dial jumps to wherever its ring sits.
- **Flicker around 1.2–1.6 now and then is fine.** The health monitor alerts only at 2 or more.
- **There is no "no white" rule.** No clipping and no washout still apply.

## What changed tonight (PRs #148–#157)

| PR | Change |
|----|--------|
| #148 | Knobs 1–10 with the `#define` swap pattern, plus /show preflight fixes |
| #149 | Slow long-term audio features, calmer sky around the sun, deeper dark floor |
| #150 | Removed the hard-edged disc around the companion star |
| #151, #153 | Auto-downscale now triggers on a stuttering display, and recovers after a backoff |
| #152, #155 | Meter: one GPU read per sample, at 2 Hz (it was the remaining stutter) |
| #154 | MIDI: ports opened explicitly. Before this, the Twister never reached the page |
| #156 | `/show` always listens to the dials (`scripts/vj/watch-dials.js`) and always runs `/vibej2` |
| #157 | K11 WARMTH, K12 SPARKLE, K13 GLOW, K14 DARK FLOOR, K15/K16 move the main sun |

#158 added this file and `docs/twister-cheatsheet.md`.

## Open items

- **K1 HOLE SIZE is too subtle.** Branch `k1-hole-size-wip` has a one-line fix (1×–2.2×). It
  hasn't been verified on the wall; check it with K1 at 0 and 1, then merge.
- **The shiver detector reads about 0.9–1.0 constantly** now that its probe runs, and the 2 Hz
  meter changed what it measures. It's muted in the health monitor; recalibrate it after the show.
- **The controller's kick detector fires on noise** (`bs_kick` spikes while `bassZScore` is
  negative). The kick swell follows it, so it can pulse off the beat.
- **The art-critic agent type can't run commands.** `/show` launches the critic as
  `general-purpose`, adopting `.claude/agents/art-critic.md`.
- **`scripts/validate-shader.js` is broken** (its `glslangValidator` binary is missing). Use the
  page's `__vjValidate` instead.
- **Twister ring colours** are a best guess at its colour wheel; adjust any that look wrong.
  Making the page resend them on connect would remove step 5.

## Recovery

`.claude/vj-state.json` holds the last show URL and audio device. If the wall dies:
`node scripts/vj/show.js stop`, then run `/show`.

The previous handoff (2026-08-18, live-show-rig) is in git history: `git show f606102:HANDOFF.md`.
