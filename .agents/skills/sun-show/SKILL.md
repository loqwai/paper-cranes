---
name: sun-show
description: "Run the sun show: the black-sun / sun line on the wall, a stellar life cycle from MAIN SEQUENCE to SUPERNOVA and REBIRTH with a binary companion. Use for \"sun show\", \"the sun set\", \"play the sun set\", \"black sun\", \"put the sun on\", \"sun line\", or a sun/N fork. Gives /show the shader, controller and setlist, and holds the sun's knob map, story, panic forks and its own failure fixes."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# /sun-show: the sun line

The mechanics (preflight, launch, board, `/partner`, panic, end) are `/show`'s:
[../show/SKILL.md](../show/SKILL.md) and [docs/show-playbook.md](../../../docs/show-playbook.md).
This skill holds only what is specific to the sun.

| What | Where |
|---|---|
| Boot | `claude/wip/black-sun/sun-1-safe` + `controller=black-sun` + `controller=sun-set` |
| Setlist | `/show setlist sun-set` ([SETLIST.md](../../../setlists/sun-set/SETLIST.md)): the 2026-10-09/10 night as 13 beats |
| Shader history | [black-sun.md](../../../shaders/claude/wip/black-sun/black-sun.md) (live line), [sun.md](../../../shaders/sun/sun.md) (forks) |
| Story engine | [docs/storylines.md](../../../docs/storylines.md) |
| The night | [journals/2026-10-09-sun-show-playbook.md](../../../journals/2026-10-09-sun-show-playbook.md), [setlists/sun-set/JOURNEY.md](../../../setlists/sun-set/JOURNEY.md) |

## Launch

`/show setlist sun-set` launches what `setlists/sun-set.json` says: shader
`claude/wip/black-sun/sun-1-safe`, controllers `black-sun` then `sun-set`, plus `wavelet=true`:

```
jam.html?shader=claude/wip/black-sun/sun-1-safe&controller=black-sun&controller=sun-set&wavelet=true&vj=1&remote=display
```

- **`sun-1-safe` is `sun-1` with the K10 master fade removed**, so no dial can black out the wall.
  It is beat 1 (pre-party) and the boot shader, so it is also the boot PANIC fork. Launch
  `sun-1` instead only for a jam where you want K10 FADE.
- **`controller=black-sun` is required.** Without it every `bs_*` uniform is 0 and the sun collapses.
- **`controller=sun-set`** replays the night's dials per beat. It is idle until a beat is set. Add it
  at launch: adding it later needs a reload.
- The beats hot-swap through `sun/10` to `sun/17` and end on `claude/wip/black-sun/sun-1-show`
  ([SETLIST.md](../../../setlists/sun-set/SETLIST.md#the-setlist)).
- **Input:** a line feed. The gates were tuned on one (`energyMean` 0.003 to 0.015). On a room mic,
  expect `audio_gain=<x>` (a Surface mic needed ×32).
- Edit a `-wip` copy, never the boot file while it is on the wall.

## Knobs (0 = designed look, automatic story)

Checked against the code on 2026-11-25. **The controller's knobs work the same on every beat:**

| Knob | Name | Does (`controllers/black-sun.js`) |
|---|---|---|
| K1 | TRIP | at 0.5 or above, runs the trip arc instead of the stellar story; the move either way is a morph |
| K5 | STORY | forces an act: act = floor(k × 7); 0 = automatic |
| K6 | REACH | forces the huge-ray mode amount |
| K7 | SPEED | 1× to 4× rate on the giant's turn and boil clocks (rate only). Only the giant shaders read it. It no longer calls a kiss (since 2026-10-10) |
| K15 / K16 | SUN X / SUN Y | place the sun; 0 = automatic drift |

K5 values in the middle of each act: MAIN **0.07** · RED GIANT **0.21** · DYING **0.36** ·
COLLAPSE **0.50** · SUPERNOVA **0.64** · NEBULA **0.79** · REBIRTH **0.93**. With K1 TRIP on, the
same values pick HATCHLING, UNFURL, DIVE, GARDEN, TWIN, BLOOM, LUCID. Back to **0** returns the
story to the music.

**The shader's knobs change by beat.** The boot shader and the giant shaders:

| Knob | `sun-1-safe` (beat 1) | `sun-1-show`, `sun/15` to `17` (the giant) |
|---|---|---|
| K1 | HOLE SIZE (and TRIP, above) | TRIP only |
| K2 | HUE SPIN | HUE SPIN, one full turn |
| K3 | LATTICE | FAN: cyan Julia fan brightness and reach |
| K4 | ZOOM, 0.55× to 1.5× | ZOOM: giant radius |
| K8 | CLOUD CALM | SKY SWAP: day tiles ↔ deep space |
| K9 | REACT, audio 1× to 2.5× | REACT |
| K10 | none (the fade is removed) | PAINT: brush dabs |
| K11 | WARMTH | WARMTH, giant and corona only |
| K12 | SPARKLE | SPARKLE |
| K13 | GLOW | GLOW, corona and chromosphere |
| K14 | DARK FLOOR | DARK |

`sun/10` to `sun/14` sit between the two and differ fork to fork (`sun/12` puts tendril curl on K1).
Read the fork's `#define` lines before you name a dial. `sun-1.frag`, `sun-1-safe.frag` and
`sun/10` to `14` still label K7 "KISS" in their `@knob:` lines; the label is stale.

## The story

MAIN SEQUENCE → RED GIANT → DYING → COLLAPSE → SUPERNOVA → NEBULA → REBIRTH → MAIN, moved by
the music: a sustained build arms COLLAPSE, the drop fires SUPERNOVA, calm and quiet stretches age
the star, and each act has a max dwell. DYING and COLLAPSE are dark on purpose. Act table and
thresholds: [docs/storylines.md](../../../docs/storylines.md).

**The companion** is a small dark-red star that spirals in from the upper left and dances a slow,
precessing orbit (mids speed it). A drop, a section change or a strong onset cluster makes the
two **kiss** (never a timer, never a knob): the orbit dips until the coronas overlap and a distortion front fires from the
contact point. SUPERNOVA flings it away; it re-enters in REBIRTH. Logs:
`window.__blackSunState.kissLog`, `.actLog`.

## Panic forks

| Fork | Why |
|---|---|
| `sun/7` | Healthy (flicker 0.22): peach-gold sun and rose companion. Brought the wall back from black in 2 s on 2026-10-06 |
| `sun/15` | Cold-start baked: the giant orbited sun at once, even on a fresh boot |
| `claude/wip/black-sun/sun-1-safe` | Beat 1 of the setlist, the pre-party look |

`/show panic sun/7`. The black-sun controller keeps running; the fork's `bs_*` uniforms come from
it. Full fork list with looks and caveats: [sun.md](../../../shaders/sun/sun.md#fork-library).

## Sun-specific failures

| Symptom | Fix |
|---|---|
| Picture frozen, `frameCount` rising, `bs_time` not, `recentErrors` names "non-finite bs_…" | A NaN latched in `window.__blackSunState`. `make()` in `controllers/black-sun.js` backfills finite defaults; save it to hot-swap. If the wall must move first: `node scripts/vj/show.js eval '() => { window.__blackSunState.<field> = 0 }'`, once, and journal it |
| A fork's controller loaded into the live page fights the live one | `controllers/sun.js` and `sun-2`, `3`, `5`, `7`, `8`, `9`, `12` to `17` share `window.__blackSunState` with `black-sun`. Load them only in a fresh page. `sun-4`, `6`, `10`, `11` keep their own state. Check: `grep -oE '(window\|globalThis)\.__[A-Za-z0-9]+State' controllers/sun*.js` |
| Flicker on `sun/6` | It was forked during a flicker bug (meter 1.43). Check it before using it |
| Grey veil over the night sky | Fade the tiles toward the space colour, not grey, and lower the black point |
| Rays short, the story never builds | The envelopes were tuned on another set. Sample features for ~25 s, pick 2 or 3 that move with this music, and drive reach and brightness from smoothed envelopes of those (rate and light only, never phase) |

## Lessons from the sun nights

- The black wall (2026-10-06) came from an `isnan()`/`isinf()` output guard on ANGLE/Metal. Clamp
  at the source.
- The critic undid its own palette advice over the 2026-10-17 set. Hold a palette decision once
  made.
- Still open from rehearsal: the collision supernova with K8 COLLIDE (force one with K5 = 0.64),
  the musicality score (rResid near 0), porting the flicker fix into `sun/6`.
