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
| Live line | `claude/wip/black-sun/sun-1` + `controller=black-sun` |
| Setlist | `/show setlist sun-set` ([SETLIST.md](../../../setlists/sun-set/SETLIST.md)): the 2026-10-09/10 night as 13 beats |
| Shader history | [black-sun.md](../../../shaders/claude/wip/black-sun/black-sun.md) (live line), [sun.md](../../../shaders/sun/sun.md) (forks) |
| Story engine | [docs/storylines.md](../../../docs/storylines.md) |
| The night | [journals/2026-10-09-sun-show-playbook.md](../../../journals/2026-10-09-sun-show-playbook.md), [setlists/sun-set/JOURNEY.md](../../../setlists/sun-set/JOURNEY.md) |

## Launch

Run `/show claude/wip/black-sun/sun-1` with the controller chain the setlist needs. The URL is:

```
jam.html?shader=claude/wip/black-sun/sun-1&controller=black-sun&controller=sun-set&wavelet=true&vj=1&remote=display
```

- **`controller=black-sun` is required.** Without it every `bs_*` uniform is 0 and the sun collapses.
- **`controller=sun-set`** replays the night's dials per beat. It is idle until a beat is set. Add it
  at launch: adding it later needs a reload.
- **Input:** a line feed. The gates were tuned on one (`energyMean` 0.003 to 0.015). On a room mic,
  expect `audio_gain=<x>` (a Surface mic needed ×32).
- Boot on `sun-1`, edit `sun-1-wip`, never the boot file while it is on the wall.

## Knobs (0 = designed look, automatic story)

| Knob | Name | Does |
|---|---|---|
| K1 | HOLE SIZE | sun/eye core radius |
| K2 | HUE SPIN | rotates the whole palette |
| K3 | LATTICE | strength of the spiral lattice (0 = none) |
| K4 | ZOOM | scales sun, rays and lens about the centre, 0.55× to 1.5× |
| K5 | STORY | forces an act: act = floor(k × 7); 0 = automatic |
| K6 | REACH | forces the huge-ray mode amount |
| K7 | KISS | a rising edge past 0.5 calls a companion kiss now (10 s guard) |

K5 values in the middle of each act: MAIN **0.07** · RED GIANT **0.21** · DYING **0.36** ·
COLLAPSE **0.50** · SUPERNOVA **0.64** · NEBULA **0.79** · REBIRTH **0.93**. Back to **0** returns
the story to the music. K8 and up changed during the show night; the shader's `@knob:` names and
black-sun.md are the truth for those.

## The story

MAIN SEQUENCE → RED GIANT → DYING → COLLAPSE → SUPERNOVA → NEBULA → REBIRTH → MAIN, moved by
the music: a sustained build arms COLLAPSE, the drop fires SUPERNOVA, calm and quiet stretches age
the star, and each act has a max dwell. DYING and COLLAPSE are dark on purpose. Act table and
thresholds: [docs/storylines.md](../../../docs/storylines.md).

**The companion** is a small dark-red star that spirals in from the upper left and dances a slow,
precessing orbit (mids speed it). A drop, a section change, a strong onset cluster or K7 makes the
two **kiss**: the orbit dips until the coronas overlap and a distortion front fires from the
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
| A fork loaded into the live page fights the live controller | Forks 2, 3, 5, 7, 8, 15 to 17 and `controllers/sun.js` share `window.__blackSunState`. Load their own controllers only in a fresh page. `sun/4` keeps its own `__sun4State` |
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
