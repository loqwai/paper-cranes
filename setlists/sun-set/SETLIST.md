---
name: sun-set
description: "Replay the sun set from the 2026-10-09/10 show: thirteen beats the wall reached that night (JOURNEY.md), from the pre-party tile sky through the orbit preview, the fractal sky, the painterly sun, the giant we orbit, to the OG sky return, with the user's own dial moves eased back in by controllers/sun-set.js. Every advance is a hot-swap that rebakes the fork's clock anchors so new layers fade in. Run after /show has the wall up. Usage: `/sun-set` (list, start at beat 1), `/sun-set next`, `/sun-set <n|name>`, `/sun-set list`, `/sun-set auto`, `/sun-set give-back`."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop ScheduleWakeup
---

# sun-set: replay the 2026-10-09/10 sun set

This skill runs **after `/show`** has the wall up, the watchers armed and `/vibej2` listening. It
never launches, reloads or `goto`s the page, and it repeats none of /show's preflight. It takes the
wall through the looks the night actually reached, in order, each backed by a real fork file, and
replays the dials the user turned in each era.

**[JOURNEY.md](JOURNEY.md)** is the night's timeline (`J1`–`J20`) and the knob journey; every beat
below cites its entry. Brief every agent you start with **docs/vj-preferences.md**.

| File | Does |
|---|---|
| `JOURNEY.md` | The timeline from 20:08 to 02:45 and every knob vector there is data for |
| `beats.json` | What goes on the wall: file, URL path, cue, held anchors, page features |
| `../../../controllers/sun-set.js` | The dial journey per beat (keyframes + holds); eases the knobs, yields to hands |
| `swap.mjs` | One beat onto the wall: one `show.js eval` (rewrite, validate, swap, set the beat, URL), then one shot |
| `cue.mjs` | Waits for a build, drop or breakdown from the live controller's own states, prints one line |
| `stray-guard.mjs` | Closes any page in the show Chrome that isn't the wall, then re-activates the wall |
| `sun-set.test.mjs` | `node --test .claude/skills/sun-set/sun-set.test.mjs`: easing, hand override, K1/K5 rules |

## Setup: chain the dial controller

The dials only replay when `sun-set` runs after the story controller. If the wall was launched with
`controller=black-sun` alone, this needs **one** reload, so do it before doors open, never mid-set:

```
jam.html?shader=claude/wip/black-sun/sun-1&controller=black-sun&controller=sun-set&wavelet=true&vj=1&remote=display
```

It is idle (it touches nothing) until a beat is set. `?sunset_beat=N` in the URL starts it on beat N
at boot, and `?sunset_minutes=M` sets the set's total length (default 45; the holds and the dial
replay scale with it). Without it in the chain, `swap.mjs` still swaps and reports `dials: NOT DRIVEN`.

## Usage

- **`/sun-set`:** print `node .claude/skills/sun-set/swap.mjs list` to the user, then run beat 1.
- **`/sun-set next`:** the beat after `window.__sunSet.beat` (set by every swap).
- **`/sun-set <n|name>`:** jump to that beat, e.g. `/sun-set 8` or `/sun-set giant`.
- **`/sun-set list`:** print the list only.
- **`/sun-set give-back`:** hand the dials the user took back to the replay:
  `node scripts/vj/show.js eval '() => window.cranes.updateFeature("sunset_hands_reset", Date.now())'`.
  Which knobs are the user's: `window.__sunSetState.hands`.
- **`/sun-set auto`:** advance on the holds and cues (see Auto). `/vibej2` keeps listening. For a
  set length other than 45 min, put `sunset_minutes` on the wall URL and scale the holds `swap.mjs
  list` prints (they are at 45) by the same factor.

Flags pass through to `swap.mjs`: `--auto-story` leaves K5/K6 to the music, `--cold` shows the
finished look at once (a cut; use after an outage or as panic), `--no-knobs` stops the dial replay,
`--hold A,B` parks anchors.

## Advance: one eval, one shot

The parent is the dispatcher (CLAUDE.md, `/vibej2`). An advance is the only page touch it makes
itself, and it is short:

1. If an editing fork holds the page, let it finish or stop it first. Only one agent drives the page.
2. Run `node .claude/skills/sun-set/swap.mjs <n>`. It prints the beat, the anchors it moved, the dial
   status and the shot path. Read the shot.
3. Tell the user in one line: the beat, what arrives over the next minute, and the cue for the next.
4. On `REFUSED`, stay on the current beat and hand the compile info to a fork. Never retry blind,
   never `goto`.
5. Anything longer (an 80 s look after the fades, a meter read, a doc note) goes to a fork.

The shot shows the beat's base; fresh layers start after the 3 s lead and take their own fade
(8–240 s), and the dials ease over about a minute, so the full look arrives a minute later.

## The setlist

Holds are proportional to each beat's real span on the night (`JOURNEY.md` → "Beat lengths", 259
min in all), scaled to `sunset_minutes` (default **45**) and never under 90 s, so the 45-minute set
runs about 48 min. The era's dial keyframes play at the same scaled speed. The holds below are at
45 min; `swap.mjs list` prints them. The cue is the musical moment to advance on, read by
`cue.mjs` from the controller (`build`: buildT > 8 s, `drop`: dropEnv > 0.5, `breakdown`: low > 10 s
or calm > 15 s).

| # | Name | File | Night | Hold | Advance on | Critic |
|---|---|---|---|---|---|---|
| 1 | pre-party | `claude/wip/black-sun/sun-1-safe` | J2–J3 20:19–21:00 | 7:07 | breakdown | 6–8 (#1–#4) |
| 2 | orbit | `sun/10`, sky ramps held, `scene_force` 2 | J5 21:00–21:10 | 1:30 | build | not running |
| 3 | fractal-sky | `sun/10` | J7 21:41–21:58 | 3:18 | build | not running |
| 4 | sun-cast | `sun/11` | J8 22:00–22:20 | 3:28 | breakdown | not running |
| 5 | painterly | `sun/12` | J9 22:22–22:38 | 2:47 | build | not running |
| 6 | sun-surface | `sun/13` | J10 22:38–22:45 | 1:30 | drop | not running |
| 7 | julia-arms | `.claude/vj-tools/sun-1-show.pre-giant.frag` | J12–J13 23:29–23:50 | 3:39 | build | 4.5–7.5 (#19–#30) |
| 8 | giant | `sun/14` | J15 00:37–01:16 | 6:57 | drop | 8–8.5 (#45–#50) |
| 9 | fan-root | `sun/15` | J16–J18 01:17–02:06 | 10:15 | drop | 7.5–8 (#63–#66) |
| 10 | kiss | `sun/16` | J19 02:16 | 1:30 | drop | 7 (#68) |
| 11 | transit | `sun/17` | J19 02:21 | 1:30 | build | 7–8 (#67, #69) |
| 12 | audio-web | `claude/wip/black-sun/sun-1-show`, OG-SKY held | J19 02:25 | 1:30 | breakdown | 8.5 (#70–#72) |
| 13 | og-sky | `claude/wip/black-sun/sun-1-show` | J20 02:29–02:45 | 2:47, then hold to the end | — | never scored with music |

The dials for every beat are the user's own, from `JOURNEY.md` → "Knob journey"; the per-beat notes
say only where that matters.

### 1 · pre-party (sun-1-safe) · J2, J3

- **Sees:** a gold plasma sun with curling rays and a red companion inside a teal brush-tile vortex
  with gold, violet and coral bands (`critic-3-a.png`); the story runs MAIN SEQUENCE into RED GIANT.
- **Words:** "This was very beautiful so far." The user kept the bright opaque tiles over the
  critic's call to dim them.
- **Dials:** K3 0.17 / K4 0.14 at the quote, then the 20:23–20:44 moves (HUE SPIN swept, STORY 0.61,
  KISS 1, ZOOM 1). The night's K1 0.75 (HOLE then) is replayed as 0: K1 ≥ 0.5 is now TRIP.
- **Watch:** a flat core with a coral lens smear (#1, #3); almost no dark floor (dark 0.03, #1);
  the story then sat ~15 min in act 4 and ~15 min in a too-dark act 3 (#8–#18). `sun-1-safe` is
  `sun-1` with the K10 master fade removed.

### 2 · orbit (sun/10, ramps held, ORBIT pinned) · J5

- **Sees:** the story star slides off and a giant gold plasma limb fills the lower right over deep
  space; the world turns slowly about it (`orbit-l.png`).
- **Words:** "A feeling of galactic minisculity by being next to the giant, powerful, radiating sun
  from the lower right corner, feeling like we're orbiting it for a while… let's make sure not to
  flash"
- **How:** `sun/10` still carries SCENES-2b. The swap holds `sky_return`/`no_space`/`lattice_mix` at
  0 (the wall at 21:00, before J7) and sets `scene_force` 2, which pins ORBIT and keeps the ECLIPSE
  black moon away ("We need that hole gone"). Beat 3 clears `scene_force`.
- **Watch:** on the night this was a forced preview (21:00–21:07). Whether the auto scene cycle
  ever showed it to the room is not recorded. ORBIT cuts in at the swap: land it on the build.

### 3 · fractal-sky (sun/10, forked 21:58) · J7

- **Sees:** the space look fades over 20 s, the patchwork tile sky returns over 90 s and goes
  self-similar, turning slowly about the centre, while the `lattice-interactive/3` folds grow in over
  3 min (`fractal-calm.png`).
- **Words:** "Let's riff on OG sky significantly. Let's avoid space for a while. We need to evolve
  in new, fractally ways" · "Let's mix in some of the lattice-3-interactive 3. Slowlly, over time,
  Into the sky" · "GIVE ME ZOOM CONTROL"
- **Dials:** the `sun/10.md` vector; K5 0.67 locks SUPERNOVA (`--auto-story` frees it).
- **Watch:** the green/pink banding the user objected to at 22:17 is in beats 2–6. Before PERF-1 the
  two skies together hit p95 33 ms, so watch the frame time during the 20 s ramp.

### 4 · sun-cast (sun/11, 22:20) · J8

- **Sees:** a blue-white dwarf (20–60 s), a red giant drifting in (80–120 s), a pulsar (140–180 s)
  and a binary pair (200–240 s) arrive behind the main star over the pink-lattice sky (`cast-c.png`).
- **Words:** "Let's bring in more sun characters" · "I need the lattice to be affected in many, many
  ways subtly by audio features…"
- **Dials:** K4 1, K5 0.96 locks REBIRTH. The night's K10 0.165 was the master fade, which the swap
  patches out.
- **Watch:** the banding ("I need less of this contrasted green/pink banded colors").

### 5 · painterly (sun/12) · J9

- **Sees:** brush-stroke tendrils, broken OKLCH colour, canvas grain; the black eclipse moon from
  `paint-2c.png` is gone (NO-ECLIPSE-1).
- **Words:** "I need much more painterly sense." · "I want to communicate with you wordlessly, through
  the dials. Use intuition" · "Turn off that dimming knob, switch it, I want 100% bright all the time"
  · "We need that hole gone ."
- **Dials:** the busiest stretch of the night, 22:25–22:37: PAINT straight to 1, CALM and WARMTH
  near 1, REACH and GLOW pulled low.
- **Watch:** the regular brick-like stroke grid and pink rays (the painterly2 fixes never landed).

### 6 · sun-surface (sun/13) · J10

- **Sees:** granulation with dark lanes, limb darkening, faculae and two slow sunspots on the
  painterly suns over the brick-tile vortex (`sunsurf2.png`).
- **Words:** "The sun's surface needs a more 'sunlike' nature." · "we're in a good space to explore
  now. good job"
- **Watch:** the bricks show clearly in the shot. **Next is a cut** to a different line (sun-1-show):
  swap it on the drop.

### 7 · julia-arms (sun-1-show before GIANT) · J12, J13

- **File:** `.claude/vj-tools/sun-1-show.pre-giant.frag`, the 00:42 rollback snapshot; no `/fork`
  captured this era. It is not under `shaders/`, so the URL is left unchanged.
- **Sees:** two ember suns in deep indigo space inside a pinwheel of dark fractal Julia arms with
  cyan rim light (`critic-30-a.png`, 7.5/10); Julia and buds fade in over 75 s.
- **Words:** "Stop pulsing the sun to the bear [beat]. I need other primary effects…" · "I need the
  tendrils to be similar to the julia sets we use for the moody-octopus series" · "Fade it in. If you
  are capable of it" · "Give me complex details in the tendrils."
- **Watch:** an unearned giant size jump (#24, 4.5); a saturated cyan halo (#27); the tile ring
  turning umber (#32); "It's gray and dark" (23:25).

### 8 · giant (sun/14, 01:16) · J15

- **Sees:** the old ball sun fades out over 60 s as a colossal ember body rises in the lower right
  with the cyan Julia fan off its limb and the companion on the limb (`giant5-a.png`).
- **Words:** "Let's make the sun more intimidating, like it's this close, large, celestial body
  we're orbiting that exists in the lower right of the screen. I want impossibly interesting
  celestial detail as if we are a small moon orbiting"
- **Dials:** STORY, KISS and LATTICE go to 0, ZOOM to 0.76, WARMTH 0.92: the giant era is when the
  user let the story run.
- **Watch:** fan aliasing (#51); a grey blot at the fan root (#52, #59); a drop can flood ~70% of the
  frame with an amber smear (#54; SMEAR-LOCAL fixed it from beat 9); the sky turning umber (#42–#44).

### 9 · fan-root (sun/15, 02:06) · J16–J18

- **Sees:** the giant with a crown of cyan and azure Julia plumes from a luminous gold-to-cyan root,
  streaming forward on the bass-rated flow clock over an indigo starfield
  (`docs/shots/sun/15-fork-0206.png`).
- **Words:** "I need more audio reactivity. It looks static"
- **Dials:** the 01:17–01:20 tour of the new dial map (HUE 1, FAN 1, GLOW 1, DARK 1), then settling
  to the `sun/15.md` vector the night ended on.
- **Watch:** the companion's raspberry core and violet halo (#65); grey-lilac arm tips (#66).

### 10 · kiss (sun/16, 02:16) · J19

- **Same code as sun/15:** the swap skips the recompile and only sets the beat. Wait for the music to
  earn a kiss (`window.__blackSunState.kissLog`).
- **Sees at 02:16:** the companion upper left trailing beaded field lines, the crown spread wide
  (`docs/shots/sun/16-moment-0216.png`).
- **Words:** none; the user ran `/fork` for the third time in ten minutes.
- **Watch:** the starfield vanished at the act change (#68; fixed in beat 12).

### 11 · transit (sun/17, 02:21) · J19

- **Same code as sun/15.** Wait for the companion to cross the giant's face
  (`docs/shots/sun/17-moment-0221.png`).
- **Words:** none; `/fork` at 02:21.

### 12 · audio-web (sun-1-show, OG-SKY held) · J19

- **Sees:** sixteen small audio verbs fade in over 75 s, one per element (`audioweb-c.png`), the
  stars return over every backdrop, and ROOT-HUE puts the companion in ember/gold at the fan root
  (`roothue-a.png`).
- **Words:** "I need more, subtle features affected by the audio uniforms. many different ones"
- **Watch:** the companion's disc warped through the fan (#74); an olive dash-grid in silence
  (#76, #77); the giant's upper half near-black in silence (#78).

### 13 · og-sky (sun-1-show) · J20

- **Sees:** over 4 minutes every act settles back onto the Van Gogh blue tile sky round the giant;
  OG-SKY2 (60 s) holds the tiles through night acts as a dark cobalt and keeps a resting ember glow
  on the giant. The set ends where it began.
- **Words:** "let's slowly go to the og sky"
- **Watch:** never judged with music: the input was silent from ~02:36, and `ogsky2-a.png` (02:44)
  is that silent, dark frame. OG-SKY2 was never critic-scored.

## Transitions: hot-swap, never goto

`goto` reloads the page: black frame, audio history and story reset, MIDI bridge lost. Every
advance is a `window.cranes.shader` hot-swap inside one `show.js eval`.

**The anchor problem.** Every fork bakes `FADE_T*` and phase anchors against the `bs_*` clocks of
the moment it was saved. `sun/14` has `FADE_T7` = 5132 s: on a page at bs_time 600 it shows the
pre-giant look for 75 minutes. `sun/15`–`17` are COLD-START (every fade at −1000), so they cut in at
once. `sun/10`–`13` come from the `sun-1-wip` line, which had no `FADE_T` anchors; only their page
ramps and the cast are re-timed.

`swap.mjs` reads the wall's current source and the live clocks (sampled twice, 400 ms apart, then
predicted 3 s ahead) and rewrites:

| Anchor | Rule |
|---|---|
| `FADE_T*` except `FADE_T2` | the wall has it (already started) → keep the wall's value; else now + 3 s |
| `BUD*`, `FLX2`, `C_FLUX0`, `FLUX0`, `FLOW0` | the wall has it → keep; else that clock's value at +3 s |
| `GAL_T8` | moves with `FADE_T8`: kept with it, else max(galPh at +3 s, `GAL_T2`), so the sky offset is continuous at the switch |
| `FADE_T2`, `GAL_T2` | never moved: they enter the sky warp `tW`/`sw` directly, and moving them jumps the sky (RELOAD-REBAKE) |
| `tW` guard | adds `max(FADE_T8 - FADE_T2, 0.0)` where it is missing (`sun/14`) |
| cast `tc` (11–13) | keep the wall's cast; else `max(bs_time - (now + 3), 0.0)`, so the cast arrives again |
| `sky_return` / `no_space` / `lattice_mix` (10–13) | keep the wall's; else ramp over 90 / 20 / 180 s, as the page did that night |
| `FADE` (10–11) | `1.0 - knob_10` → `1.0` ("I want 100% bright all the time") |
| `--cold` | fades → −1000, phases → 0, `GAL_T8` = `GAL_T2`: the COLD-START recipe |
| `--hold A,B` / `holdAnchors` | parks `FADE_T*` anchors at 1e6, and the three page ramps at 0, until a later swap releases them |

**Why keep the wall's anchors** instead of rebaking everything: an anchor the wall already shows,
rebaked to now, restarts that layer's fade (it vanishes and fades back in) and zeroes its phase
offset (the fan's c, the flow) — a jump. RELOAD-REBAKE left `FLOW0` alone for the same reason.

**What still cuts:** code that no fade gates (all of beats 1–6 apart from the ramps and cast), the
6 → 7 line change, and anything the outgoing beat had that the incoming one lacks. Land those swaps
on the cue.

Dry run, no page: `node .claude/skills/sun-set/swap.mjs dry shaders/sun/14.frag --time 2100 --bud
2000 --flux 330 --flow 2000 --gal 190 [--wall prev.frag] [--out next.frag]` prints the anchor diff.
Chain `--out` into the next `--wall` to rehearse the whole set.

## The live controller stays: black-sun

Never swap controllers between beats.

- The anchors are rebaked against `black-sun`'s clocks. A new controller restarts every clock and
  the story, so every anchor would be wrong.
- `sun-12`–`17` (and 2, 3, 5, 7, 8, `sun`) keep state on `window.__blackSunState`, the live global;
  hot-swapping one in corrupts it (playbook section 6). `sun-10` and `sun-11` have their own state,
  so either would restart the story, the companion's orbit and the kiss engine from zero.
- `black-sun` emits every `bs_*` uniform each beat declares (checked statically; `bs_f*` are
  generated), so one controller drives the whole set and the story runs unbroken across it.
- Knob meanings follow it: **K1 ≥ 0.5 = TRIP**, K5 STORY locks an act, K6 REACH, **K7 SPEED** (it was
  KISS through beat 7; kisses now come only from the music), K15/K16 place the sun.

## Dials at runtime: controllers/sun-set.js

Knob precedence on the page, lowest to highest: controller outputs, boot URL, `manualFeatures`
(MIDI and `ParamsManager.set`), `messageParams` (pad and remote pins). A controller output would lose
to the boot URL and every dial, so `sun-set` writes `manualFeatures` itself.

- **Per beat:** keyframes of the user's own vectors (`JOURNEY.md`). The era's real timeline plays
  at the set's scale (`sunset_minutes`), and each knob eases toward the current keyframe (τ 20 s), so
  nothing jumps.
- **K5 STORY steps** to its keyframe: easing it would sweep through every act in between. **K1 stays
  0** (TRIP).
- **Hands win, for the rest of the set.** A `manualFeatures` value that differs from the one
  `sun-set` wrote last frame is a dial. From then on that knob is the user's, across every later
  beat, and the replay keeps driving only the dials nobody has touched. `/sun-set give-back` returns
  every touched knob to the replay, eased from where the hand left it.
- **The Twister is absolute:** the rings don't follow the replay, so the first touch of a dial jumps
  that knob to its ring, and the controller then yields to it.
- `swap.mjs` sets `sunset_beat` (and `sunset_auto_story` for `--auto-story`) through
  `updateFeature`, so the URL keeps it across a refresh, and it drops any `knob_*` pins in
  `messageParams`. Not `remote-send.js` for knobs: its pins outrank the Twister.

## Auto: `/sun-set auto`

1. Swap the beat. Then `ScheduleWakeup(hold)` (60 s minimum) and end the turn.
2. On wake, arm `Monitor({ command: "node .claude/skills/sun-set/cue.mjs <cue> --max 180", timeout_ms: 200000 })`
   with the next beat's cue (`beats.json`).
3. On `CUE …` or `CUE TIMEOUT`, swap the next beat. On `CUE ERROR`, stop auto and check the wall.
4. The user's words and dial releases come first, through `/vibej2`. "Stay", "hold" or a dial pinned
   at an extreme pauses auto (`ScheduleWakeup(stop: true)`, TaskStop the cue Monitor); `/sun-set
   next` resumes. A user instruction always outranks the setlist.
5. After beat 13, stop auto and leave `/vibej2` running.

## Pitfalls that bit that night

| Pitfall | What happens | Do |
|---|---|---|
| **Dev server dies** | The page reloads on reconnect, bs_time resets to 0, dials and runtime ramps reset, and the wall shows the boot shader's pre-everything look (01:44–01:52; critic #62, 3.5/10) | Restart `npm run dev` in the serving checkout, rerun the MIDI bridge (`node node_modules/.midi-keep.mjs`), then `swap.mjs <current beat>`: the wall is the boot shader, so the beat fades back in over 60–75 s, or use `--cold` to bring it back at once |
| **Stray pages** | The show Chrome is the only Chrome, so any opened link (an MCP OAuth page at 01:14, critic #48) lands on the wall, and `show.js` refuses to run with two pages | Arm `Monitor({ command: "node .claude/skills/sun-set/stray-guard.mjs", timeout_ms: 1800000 })` before beat 1 and re-arm it on expiry. It closes nothing unless exactly one jam page exists |
| **Screen recording** | Recording the screen costs frames on the show machine | Don't record the wall during the set |
| **Compile hitch** | Each swap recompiles, about 0.5 s (467 ms measured at AUDIO-WEB) | Swap in the cue's run-up, not on the downbeat of a drop. Beats 10–11 skip it |
| **`watch-dials.js` dies** | One failed CDP poll throws in its interval and the process exits; dial releases stop arriving | Run it as `while true; do node scripts/vj/watch-dials.js; echo 'watch-dials restarted'; sleep 1; done` |
| **Shiver detector** | It reads about 0.9–1.0 constantly (HANDOFF open item) | Keep it out of the health grep (below) |
| **HMR pushes a file over the swap** | `jam.js` reloads the boot shader when its file is written; `index.js` reloads the URL's shader from disk, without the rebake | Never write the boot `.frag` or the current beat's `.frag` mid-set. Edits go to a `-wip` copy |
| **K1 and K5** | K1 ≥ 0.5 switches to the TRIP story; K5 above 0 locks an act | The replay keeps K1 at 0; `--auto-story` frees K5/K6 |
| **Dial watcher sees the replay** | `watch-dials.js` reads the knob vector, so `sun-set` easing shows up as `RELEASE` lines that look like the user | Before reading a release as the user's words, compare it with `window.__sunSetState.out`; a hand shows up in `window.__sunSetState.hands` |

The health Monitor without `shiver`:

```bash
tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|boot)"|"type":"flicker","flicker":([2-9]|[1-9][0-9])'
```
