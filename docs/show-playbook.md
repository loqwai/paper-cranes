# Show playbook: Friday 2026-10-09

The operating runbook for the user and Claude, written from the 2026-10-06 rehearsal. It lists
the commands to run, the roles during the set, the knob and story maps, the fork library and
fixes for every failure seen in rehearsal. For taste and rules, see
[vj-preferences.md](vj-preferences.md). For how the story engine works, see
[storylines.md](storylines.md).

## 1. The day before: setup

- [ ] `git checkout peter-show && git pull --ff-only`, then run `npm install` if `package.json`
      changed.
- [ ] Confirm that the no-reload controller fix is present. In
      `vite-plugins/editor-sync-plugin.js`, `handleHotUpdate` must return `[]` for
      `controllers/*.js`. This is PR #144, which is also on this branch.
- [ ] Find the port with `./scripts/dev-port` (6969 on this branch), then start the server with
      `npm run dev`.
- [ ] Set **BlackHole 2ch** as the input in macOS Sound settings. Route the music into it, through
      a Multi-Output Device if you also want to hear it.
- [ ] Attach the projector, then run `node scripts/vj/show.js displays`. `launch` uses the
      **last** display.
- [ ] Turn on Do Not Disturb, and quit any break-reminder or screen-dimming app. One dimmed the
      whole wall during the 10-06 test.
- [ ] Do a test launch (section 2) and confirm the input label before doors open.

## 2. Launch sequence

```bash
node scripts/vj/show.js stop     # always first: clears a leftover page-less show browser ("not running" is fine)
node scripts/vj/show.js launch "http://localhost:6969/jam.html?shader=claude/wip/black-sun/sun-1&controller=black-sun&wavelet=true&vj=1&remote=display"
node scripts/vj/show.js eval '() => ({ input: window.cranes.audioInputLabel ?? null, energy: window.cranes.flattenFeatures().energy })'
```

- **Expected input:** `"BlackHole 2ch (Virtual)"` with an energy reading above 0. If the label is
  wrong, **don't start**: fix the OS default input. Add `&audio_device=<label>` only to
  deliberately override the default.
- **What to open:**
  - **Live line (recommended):** `black-sun/sun-1` + `controller=black-sun`. It has every fix, the
    story engine, the companion and K7 KISS.
  - **Frozen fork:** `sun/N` + `controller=sun-N` (see section 6). Use a fork when you want a known
    look that won't change.
- **Boot-shader trap:** HMR follows the shader the page **booted** with, not the one in the URL. If
  you hot-swap to another shader and then something writes the boot shader's `.frag` to disk, HMR
  pushes it back over the wall. Boot on the file you'll be editing.
- **Never `goto` mid-set.** It reloads the page, which resets the audio history and the story. To
  change shaders, hot-swap them (section 7, the "panic" row).

## 3. Roles during the set

| Who | Does | Never |
|---|---|---|
| **Parent Claude** (`/vibej2`) | Triages your words first, reads the meter, makes one decision, dispatches the work and stays responsive | Long edits or waits inline |
| **Editing agent** (one at a time) | Holds the page and `.frag` token. Edits by hot-swap, verifies with a shot and the meter, forks good moments | Reloads, server restarts, a second page-touching agent |
| **Art critic** | Loops: a pair of shots plus the meter every ~2.5 min, appending verdicts to `.claude/vj-critic.md` | Edits anything. **Your words outrank it.** |
| **You** | Knobs, `/fork`, plain-language feedback | — |

Monitors to arm. Each expires after 30 min, so re-arm them.

```bash
# health alerts from the page
tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|shiver|boot)"|"type":"flicker","flicker":(1\.[2-9]|[2-9])'
# critic verdicts
tail -n 0 -F .claude/vj-critic.md | grep -E --line-buffered '^### critic|^\*\*Fix next|^1\.|WALL DOWN'
```

Your commands:

- `/vibej2 …`: start or resume the loop.
- `/fork`: save the current look as `sun/N.frag` with the controller copied to
  `controllers/sun-N.js`.
- `/vibej2 pause`: stop the heartbeat and keep everything else.
- `/vibej2 stop`: end the loop. The show browser stays up.

## 4. Knob map (live line)

| Knob | Name | Does | At 0 |
|---|---|---|---|
| `knob_1` | K1 HOLE SIZE | Sun/eye core radius | designed size |
| `knob_2` | K2 HUE SPIN | Rotates the whole palette | designed palette |
| `knob_3` | K3 LATTICE | Strength of the spiral lattice | 0.55 |
| `knob_4` | K4 ZOOM | Scales the sun, rays and lens about the centre, 0.55×–1.5× on an exp curve | eye at ~28% of screen height |
| `knob_5` | K5 STORY | Forces an act: act = floor(k × 7) | automatic story |
| `knob_6` | K6 REACH | Forces the huge-ray mode amount | automatic windows |
| `knob_7` | K7 KISS | A rising edge past 0.5 calls a companion kiss now (10 s guard) | musical kisses only |

K5 values that land in the middle of each act: MAIN **0.07** · RED GIANT **0.21** · DYING **0.36**
· COLLAPSE **0.50** · SUPERNOVA **0.64** · NEBULA **0.79** · REBIRTH **0.93**. Set it back to **0**
to return to the automatic story.

## 5. The story

| # | Act | Look | Moves on when | Max |
|---|---|---|---|---|
| 0 | MAIN SEQUENCE | Gold sun with radiant rays, day sky | building for 45 s → COLLAPSE; calm for 60 s → RED GIANT | 180 s |
| 1 | RED GIANT | Swollen, cooler red-orange, heavier rays | building → COLLAPSE; low for 45 s → DYING | 150 s |
| 2 | DYING | Small, red, dark, sun sinking, night | building for 30 s → COLLAPSE | 120 s |
| 3 | COLLAPSE | Pinprick, pull inward, near-dark tension | **drop** after 15 s → SUPERNOVA | 90 s |
| 4 | SUPERNOVA | Detonation: flash, LSD shell, giant front | fixed 25 s | 25 s |
| 5 | NEBULA | Scene dissolves into psychedelic gas | calm for 60 s → REBIRTH | 150 s |
| 6 | REBIRTH | Tiny hot star, often long-reach rays | after 60 s → MAIN | 75 s |

The musical states come from `controllers/black-sun.js`:

| State | Condition |
|---|---|
| building | sustained build for more than 8 s |
| drop | energyZScore spike over a sustained baseline |
| calm | 15 s or more |
| low | 10 s or more |

**The binary companion** is a small dark-red star.

- **Entrance:** it enters from off-screen upper left, spirals in over a few minutes, then dances a
  slow, precessing orbit. Mids speed the dance.
- **Kiss triggers:** a drop or section change (30 s refractory), a scripted approach after 150 s
  without a kiss, or **K7** by hand.
- **The kiss:** the orbit dips until the coronas overlap, a distortion front fires from the contact
  point, and the two drift apart.
- **Supernova:** SUPERNOVA flings the companion away. It re-forms and re-enters in REBIRTH.
- **Kiss log:** `window.__blackSunState.kissLog`.
- **Planned, not yet built:** the orbit decays one way across kisses until a final collision fires
  the SUPERNOVA, with a manual K8 COLLIDE. Until that lands, force a supernova with
  **K5 = 0.64**.

## 6. Fork library (`shaders/sun/`)

Open a fork with `jam.html?shader=sun/N&controller=sun-N&wavelet=true&vj=1&remote=display`. Use
`controller=sun` for N=1.

| N | Look | Caveat |
|---|---|---|
| 1 | Orange plasma disc with coral/gold bands, broad amber rays, teal/violet tiles | Pre-plasma-ball. The controller has the latent missing-field NaN bug; it can't trigger on a fresh load |
| 2 | Defined orange ball, slim yellow-amber rays, blue tiles, LSD cloud bands | Before the story engine |
| 3 | Night: magenta-orange ball low right, violet rays, indigo sky | Story engine present |
| 4 | **First natural SUPERNOVA**: huge gold ball, abstract LSD plasma | Own state (`__sun4State`). Starts at MAIN; K5 0.64 forces the nova |
| 5 | REBIRTH with long reach: small hot star upper left, rays across the frame | Background darkened to dim gas veils over indigo (`SPACE-DARK`) |
| 6 | Deep-space REBIRTH, full reach, navy nebula | **Has the flicker bug (1.4)** unless the fix has been ported. Check before using |
| 7 | **First companion kiss era**: peach-gold sun plus a rose companion, tangled tendrils | Healthy (flicker 0.22) |
| 8 | Two small stars dancing in a DYING night, swirling nebula | Dim, with a grey veil over the sky; before the brightness fixes |

- **Controllers that share state:** forks 2, 3, 5, 7, 8 and `sun.js` keep state on
  `window.__blackSunState`, the same global as the live controller. Load them in a fresh page; never
  hot-swap one of them into the live page.

## 7. Failure runbook

| Symptom | Check | Fix |
|---|---|---|
| Every `show.js` command errors ("must have exactly one page" / context error) | `curl -s 127.0.0.1:9333/json/list` returns `[]` | `node scripts/vj/show.js stop`, then `launch` |
| **Picture frozen**, but the page is alive | `show.js eval` an rAF count (the page is alive); `bs_time` isn't advancing; calling `window._hotController(window.cranes.flattenFeatures())` throws "non-finite bs_…" | A NaN is latched in `window.__blackSunState`. Set the named field to a finite default in the page. The fix in the file is `make()` backfilling defaults |
| Black flash or reload when a controller is saved | `boot` signal in `.claude/vj-signals.jsonl` | Confirm the PR #144 plugin fix is present. Never restart the server or `goto` for a controller change |
| Flicker or shiver (meter flicker above 0.7, or a `flicker` alert) | Make sure your hands weren't on the knobs. Take two shots about 100 ms apart | Audio is driving a background **phase or position**. Move it to a monotonic controller accumulator where audio sets only the rate, and run brightness through attack/release envelopes, not raw z-scores |
| Whole frame blows bright on loud **or quiet** moments | `lumMax` jumps in the pulses; clip stays 0 | Use a frame-level brightness budget (one soft knee), gate light terms by energy presence, and clamp z-scores in silence |
| Grey veil over the night sky | Shot: empty space reads grey, not navy | Fade the tiles toward the space colour, not grey, and lower the black point |
| Dev server down (background `npm run dev` exited 143) | `curl -s -o /dev/null -w '%{http_code}' localhost:6969/` | Restart `npm run dev`. The wall reconnects |
| Jank spikes (130–150 ms worst-case frames) | `jank.over100` in the pulses | Usually a shader recompile during a hot-swap. If they come with no edits, look for expensive event branches |
| Wrong or silent input | `window.cranes.audioInputLabel`, `energy` | Fix the macOS default input. `audio_device=` only overrides it |
| **Panic: get a known-good look on the wall now** | — | Hot-swap. Never `goto` (snippet below) |

```bash
node scripts/vj/show.js eval 'async (path) => {
  const src = await fetch("/shaders/" + path + ".frag?t=" + Date.now()).then(r => r.text())
  const v = window.__vjValidate(src); if (!v.ok) return { ok: false, info: v.info }
  window.cranes.shader = src
  const u = new URL(location.href); u.searchParams.set("shader", path); history.replaceState({}, "", u)
  return { ok: true }
}' '["sun/7"]'
```

The live controller keeps running. A fork's look depends mostly on its shader, and its
`bs_*` uniforms come from whichever controller is loaded.

### Lesson from rehearsal: the black wall (2026-10-06)

The wall went fully black mid-set. The cause was a shader output guard using `isnan()`/`isinf()`,
which the show Chrome's GPU path (ANGLE/Metal) mis-evaluates, zeroing every pixel; the
previous-frame feedback kept it black.

- **Recovery:** `/show panic sun/7` (a live hot-swap) brought the picture back in 2 s.
- **Never** use `isnan`/`isinf`. Clamp at the source.
- **Never** write the page's boot shader while it is on the wall. HMR pushes it over any
  hot-swap, which is how a broken edit reached the wall. Iterate on a `-wip.frag` copy, verify
  it in a separate headless page, then promote it.

## 8. Show rules

Full list: [vj-preferences.md](vj-preferences.md).

1. **Nothing flashes or reloads the wall.** Swap shaders and controllers by hot-swap only.
2. **Every layer visibly reacts to the music.** Size reactions for the back of the room.
3. **Color follows only slow music.** No hue jumps from short-term features.
4. **Backgrounds stream forward.** Use monotonic clocks with no shiver.
5. **No clipping, no washout.** White is allowed. Quiet must never mean brighter.
6. **No painted rings.** Ripples are distortion only, fired by big audio changes.
7. **Keep 60 fps.** "Too slow" stops everything.
8. **Fork good moments.** Your words outrank the critic.

## 9. Open at the end of rehearsal

The editing agent may already have fixed some of these. Check `shaders/sun/sun.md`.

- Frame-level brightness budget, so loud and **quiet** moments don't wash out the frame.
- Grey veil over the night sky.
- Small or distant sun pulsing harder on kicks, and the ball's radius swelling.
- Binary inspiral leading to a **collision supernova**, plus K8 COLLIDE.
- Musicality: rResid is still near 0 or negative, and motion sometimes rises when the music is
  quiet.
- Porting the flicker fix into `sun/6.frag`.
