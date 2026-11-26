---
name: clit-show
description: "Run the clit show: the clit-set fractal voyage (clit-set/2 with controller=clit-set) and its coaster mode, on a projector, a phone or prod. Use for \"clit show\", \"clit set\", \"clit-set\", \"clit coaster\", \"the coaster\", \"the voyage\", \"clit-now\", \"put clit on the wall\". Gives /show the shader, controller and setlist, and holds the Twister knob map, coaster controls, panic forks, input notes, the pilot and the 2026-11-22 lessons."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# /clit-show: the clit-set voyage

The mechanics (preflight, launch, board, `/partner`, panic, end) are `/show`'s:
[../show/SKILL.md](../show/SKILL.md) and [docs/show-playbook.md](../../../docs/show-playbook.md).
This skill holds only what is specific to clit-set.

**This is the default show** (Aaron, 2026-11-25): `/show` with no shader, or "start the show", runs it.

| What | Where |
|---|---|
| Shader + controller | `clit-set/2` + `controller=clit-set` (the default show) |
| Setlist | `/show setlist clit-set` ([clit-set.json](../../../setlists/clit-set.json)), a starter; rewrite its beats from `/keep process` |
| Shader reference | [shaders/clit-set/clit-set.md](../../../shaders/clit-set/clit-set.md): waypoints, colour, audio map, iterations |
| Keeping it deep for hours | [docs/vj-deep-voyage-recipe.md](../../../docs/vj-deep-voyage-recipe.md) |
| The night | [journals/2026-11-22-clit-coaster-show.md](../../../journals/2026-11-22-clit-coaster-show.md) |

## Launch

`/show` with no args launches
`jam.html?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1&remote=display`.

- **`controller=clit-set` is required.** Without it there is no voyage, no kick punch and no
  presence gate: the picture sits nearly still.
- **`wavelet=true` is required.** Kick detection (`wavelet_bassHit`) comes from it.
- **`fft_size=2048&smoothing=0.3`** is the tuning the build was measured with.
- **`&coaster=1`** turns on coaster mode (below). Off by default, so NFC links that bake knobs
  look the same.
- **Input:** a line feed runs at gain 1. A laptop mic hearing the room needs `audio_gain` around 4
  (measured on a Mac in a car trunk). Raise gain only if `cs_presence` stays low while music plays.
  `npm run audio -- mic | blackhole | toggle` swaps the show browser's input in place on a Mac
  (`scripts/show/audio-swap.js`); its device names are the show Mac's.

**With no agent:** open
`https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3`
fullscreen, tap the canvas once (starts audio and fullscreen), allow the mic. `/?…` is the plain
visual for a projector or a phone; `/jam.html?…` adds the knob drawer and snapshots. Nine quick
taps open the app-install prompt; don't.

**Remote-controllable** (his phone away from the machine): `https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true&midi=true`,
behind Cloudflare Access, served by a dev server on soul (port 6977) through the cranes tunnel
(vault note `kb/reference/paper-cranes-live-tunnel.md`). Remote inspect (`scripts/remote/cranes-remote.js`) is only on the `live-tunnel` branch and draft
[#182](https://github.com/loqwai/paper-cranes/pull/182), not main.
While his phone is on it, never edit `index.js` or `src/` in the checkout that serves it and never
restart its Vite server: either reloads his phone. Never weaken Access or bind that server to
`0.0.0.0`.

## Knobs (16 Twister dials, all at 0 = autopilot)

| Row | Dial 1 | Dial 2 | Dial 3 | Dial 4 |
|---|---|---|---|---|
| 1 navigate | k1 X (coaster: STEER X) | k2 Y (coaster: STEER Y) | k3 VOYAGE | k4 ZOOM (coaster: THROTTLE) |
| 2 shape | k5 TURN | k6 POWER | k7 BODY | k8 CURL |
| 3 colour | k9 HUE | k10 NEBULA | k11 TRAILS | k12 REACT (audio size ×1 to ×2.5) |
| 4 light | k13 GLASSES | k14 EMBER | k15 SPOT | k16 LACE |

- Every dial at 0 is the autopilot: a slow voyage through six waypoints that comes home every
  10 minutes. A reload (all dials read 0) still looks right.
- k3 blends from the autopilot to a hand scrub over its first 8%.
- Audio never moves the camera. It drives light, lace, rim, stars, the ember and the kick punch.
- Ranges and pan units: [clit-set.md](../../../shaders/clit-set/clit-set.md#knob-map-midi-fighter-twister-4x4).

### Coaster (`coaster=1`)

k1, k2 and k4 become rates: you fly the fractal instead of placing the camera.

- **k4 THROTTLE** dives forward only. Around 3.7× the coaster climbs out over 8 s and the voyage
  moves on half a waypoint, so the next dive starts on new terrain.
- **k1 / k2 STEER: centre them at 0.5 to fly straight.** An untouched 0 also flies straight, but
  anything between about 0.05 and 0.46 steers hard one way. Steering stops at the track walls and
  recentres on each climb.
- **k5 TURN** is the scratch: 0 to 1 is two full turns.
- **Drops surge** the throttle (up to 2.2×, easing out over 1.5 s); kicks add a 0.3 s boost. At
  throttle 0 audio never moves the camera.

## Panic forks

| Fork | Why |
|---|---|
| `clit-set/2` | The show look; the boot fork |
| `clit-set/1` | The other known-good fork; reads the same controller |
| `clit/2` | Last resort: the original fractal, no controller needed |

`/show panic clit-set/2`. With no agent: reload the link, tap once.

## The pilot: `npm run pilot`

`npm run pilot -- --minutes 15` drives the 16 dials from the music while the show browser is up
(`scripts/show/pilot.js`), one status line every 10 s. Geometry glides one way and changes place
only on a section change, build, drop or breakdown; light follows the subtle features. Your hand
wins: a dial you turn is left alone until it has been still for 20 s. It reads `coaster=1` each
tick. Ctrl-C stops it; the knobs stay where they are. `npm run test:pilot` checks its decisions.

## Clit-specific failures

| Symptom | Fix |
|---|---|
| Near-still while music plays | The link is missing `controller=clit-set&wavelet=true`, or the input is a quiet mic: add `audio_gain` |
| Lace turns to speckle, or the shape leaves the frame | ZOOM above about 0.55 or X/Y above 0.45. Pull them back. Zoom is capped at 3× for this reason |
| Frame rate halves | TRAILS high with ZOOM high. Drop TRAILS |
| Shiver | Something sways geometry back and forth. Geometry only evolves one way; audio changes rates and light |
| A new fork's link is black on prod | The `.frag` is only on a branch. Merge and deploy first |

## Known gap: the NFC bead links

`2cb.pw/clit-new/2` to `/201` (the NFC bead variants) point at prod `clit-set/3`, `/4` and `/5`.
Those frags come with PR [#180](https://github.com/loqwai/paper-cranes/pull/180). Until it is
merged and deployed they don't render. Checked 2026-11-25: #180 still open, and only
`clit-set/1` and `/2` exist. `clit-now` and `clit-new/1` work. Don't hand out a bead past `/1`
before then.

## Lessons from 2026-11-22

- **One short link he never has to change** (`2cb.pw/clit-now`): repoint it, he reloads.
- **Put `vj=1` in every URL**, the phone's too. That night had no meter for the whole phone window.
- **Assume he can't tap anything.** Switch shaders by hot-swap, never by asking for a reload.
- **Server changes only while his phone is off**: a Vite restart or an `index.js`/`src/` edit
  reloads every page on it.
- **Hold a merge that changes semantics for everyone** (coaster mode) until a reviewer proves the
  default path is unchanged.
- Still open: tube walls speckle with live audio; the rails corkscrew overhead.
