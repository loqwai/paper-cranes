# Show playbook

How to run a live show with any shader, on any machine. The `/show` skill
(`.agents/skills/show/SKILL.md`) runs these steps for you; this page says what they do and how to
fix them when they fail.

What is specific to one show (its shader, controller, knob map, story, panic forks, setlist and
lessons) lives in that show's skill, not here. See [section 4](#4-show-skills). For taste and
rules, see [vj-preferences.md](vj-preferences.md). For how the page keeps the instant parts
(HANDS, KEEP, PANIC, proposals), see [live-show-contract.md](live-show-contract.md).

No laptop, just a phone on a USB-C cable to the projector? Use [phone-wall.md](phone-wall.md).
No agent at all? Open the show's production URL fullscreen on the projector and tap once.

## 1. Setup, the day before

- [ ] Use an up-to-date checkout of `main` (or the branch the show skill names), and run
      `npm install` if `package.json` changed.
- [ ] Find the port with `./scripts/dev-port` (`PORT` overrides it), then start `npm run dev`.
- [ ] **Route the music into the input the page will listen to.** The page opens the OS default
      input, so set that first:
  - **macOS:** a virtual device such as BlackHole as the default input in Sound settings. Route
    the music into it, through a Multi-Output Device if you also want to hear it.
  - **Windows:** Stereo Mix, or a virtual cable, as the default recording device in Sound
    settings.
  - **Linux:** the monitor source of the output sink (PipeWire or PulseAudio) as the default
    source.
  - **A mic in the room:** works, but it is 10 to 30 times quieter than a line feed. Plan on
    `audio_gain=<x>` (section 5).
  - Add `audio_device=<label>` only to override the default on purpose. A label with no match means
    no audio, never another device.
- [ ] Attach the projector, then run `node scripts/vj/show.js displays`. `launch` uses the
      **last** display unless you pass `--display N`.
- [ ] Turn on Do Not Disturb. Quit overlay, break-reminder and screen-dimming apps (on Windows also
      Game Bar, Discord, Steam and GeForce overlays). A dimming app once dimmed the whole wall.
- [ ] Plug the machine in. On battery, browsers cap pages at 30 fps.
- [ ] Do a test launch (section 2) and confirm the input label before doors open.

## 2. Launch sequence

```bash
P=$(./scripts/dev-port)
node scripts/vj/preflight.js --shader <shader>    # one ✅/❌ line per check; fixes: .agents/skills/show/check.md
node scripts/vj/show.js stop                      # always first: clears a leftover show browser ("not running" is fine)
node scripts/vj/show.js launch "http://localhost:$P/jam.html?shader=<shader>&controller=<controller>&wavelet=true&vj=1&remote=display"
node scripts/vj/preflight.js --after --shader <shader>   # display, audio input + energy, controller clock, pad
```

Drop `&controller=` for a shader that has none. Add more `&controller=` stages to chain them
([controllers.md](controllers.md)). On Windows, `node scripts/vj/show.js focus` keeps the show
window in front.

After `launch`, only the VJ MCP touches the page (`scripts/vj/mcp-call.js` or the registered
`paper-cranes-vj` tools: `get_state`, `screenshot`, `set_params`, `set_shader`, `panic`).
`show.js` is for the browser itself (`launch`, `stop`, `status`, `displays`, `focus`, `shot`), never
for `eval` into the page. The one exception is in section 7.

- **Expected input:** the label you routed in section 1, with an energy reading above 0. If the
  label is wrong, **don't start**: fix the OS default input.
- **Boot-shader trap:** HMR follows the shader the page **booted** with, not the one in the URL. If
  you hot-swap to another shader and then something writes the boot shader's `.frag` to disk, HMR
  pushes it back over the wall. Edit a `-wip` copy; the boot shader stays the PANIC fork.
- **Never `goto` mid-set.** It reloads the page, which resets the audio history and any story.
  Change shaders by hot-swap (`set_shader`, or `panic` in section 7).

## 3. Roles during the set

| Who | Does | Never |
|---|---|---|
| **Your session** (`/show`) | The door: launch, the board, watchers, PANIC on request, the story at the end. Stays free for your words | Shader edits, long waits inline |
| **`/partner`** (its own background lane) | Holds the page and `-wip` token. One step per event: proposes a change you take or dismiss (TAKE on the vjpad or the board); applies only health fixes (white-out, black, NaN, fps) | Acts while your hands are on (8 s after your last move); reloads |
| **Art critic** | Between tracks only: one verdict, which becomes at most one proposal | Edits anything. **Your words outrank it.** |
| **You** | Dials, KEEP, PANIC, TAKE / dismiss, plain-language feedback | — |

The page does the instant parts with no model in the path: the HANDS lock, KEEP, PANIC and the
proposal cards ([live-show-contract.md](live-show-contract.md)).

**The board.** Every show gets a [draw](https://draw.hypnodroid.com) board, `show-<yyyy-mm-dd>`:
the preflight as ✅/❌ cards, the wall's live status, `/partner`'s proposal cards, every KEEP with
its screenshot, and big PANIC / KEEP / ◀ ▶ / knob-preset buttons. Select one and press Send: the
board bridge (`scripts/vj/board-bridge.js`) makes the VJ MCP call with no model in the path
([draw-control-surface.md](draw-control-surface.md)). Fine for beats, KEEP and PANIC; the dials
stay the instrument. At the end the set's story goes on the board with a Present path.

Your commands:

- `/show`, `/show check`, `/show lite`, `/show panic [fork]`, `/show setlist <name> next`, `/show end`.
- KEEP (vjpad, its MIDI pad, `k`, the board): save the moment. `/keep process` afterwards writes
  the forks and presets.
- `/partner pause`: no proposals, health fixes continue. `/partner stop`: end it. The wall stays up.

## 4. Show skills

Each show is a skill that says which shader, controller and setlist to give `/show`, and holds what
only that show needs mid-set: the knob map, the panic forks, the story, its own failure fixes and
lessons. The long reference stays in the shader's own `.md`; a night's history goes in `journals/`.

| Skill | Show | Shader + controller | Setlist |
|---|---|---|---|
| [`/sun-show`](../.agents/skills/sun-show/SKILL.md) | the sun set, stellar life cycle | `claude/wip/black-sun/sun-1` + `black-sun` | [`sun-set`](../setlists/sun-set/SETLIST.md) |
| [`/clit-show`](../.agents/skills/clit-show/SKILL.md) | the clit-set voyage and coaster | `clit-set/2` + `clit-set` | [`clit-set`](../setlists/clit-set.json) |

A new show gets a new skill in `.agents/skills/<name>-show/` (then `node scripts/sync-claude-skills.js`), a
setlist in `setlists/` if it has beats ([setlists.md](../.agents/skills/show/setlists.md)), and a
journal after the night.

## 5. Input level

- **Check:** `get_state` reports `audio.input` (the label) and `audio.energy`. The `--after`
  preflight reads both.
- **Too quiet** (the picture is dim and slow while music plays): raise the OS input volume first.
  Then `audio_gain=<x>` on the next launch scales the input before any analysis. It is a URL
  param, so changing it means a reload: do it between sets.
- **No line feed and no mic you trust:** play a real file with `audio_file=<url>`
  ([audio-file-playback.md](audio-file-playback.md)), or capture a tab with `audio=tab`
  ([tab-audio.md](tab-audio.md)).

## 6. Forks and the `-wip` copy

- The wall runs the boot shader. Every live edit goes to a `-wip` copy, verified in a separate
  headless page, then hot-swapped in. Never write the boot shader while it is on the wall.
- KEEP saves the moment; `/keep process` turns it into a numbered fork beside the shader, with a
  frozen controller copy if the shader needs one, and a note in the shader's `.md`.
- A controller that keeps state on a `window` global shares it with every fork that uses the same
  global. Load such a fork in a fresh page; don't hot-swap it into the live one. The show skill
  says which forks do this.

## 7. Failure runbook

| Symptom | Check | Fix |
|---|---|---|
| Every `show.js` command errors ("must have exactly one page" / context error) | `curl -s 127.0.0.1:9333/json/list` returns `[]` | `node scripts/vj/show.js stop`, then `launch` |
| **Picture frozen**, but the page is alive | `get_state` twice, 2 s apart: `frameCount` rises, the controller's clock output does not, and `recentErrors` names a non-finite field | A NaN is latched in the controller's persistent state. The lasting fix is in the controller file: `make()` backfills a finite default, and saving the controller hot-swaps it with no reload. **The one exception to "only the VJ MCP touches the page":** if the wall must move before that lands, set the named field to a finite default with `node scripts/vj/show.js eval '() => { window.<state>.<field> = 0 }'`, once, and say so in the journal. The show skill names its state global |
| Black flash or reload when a controller is saved | `boot` signal in `.claude/vj-signals.jsonl` | Vite's watcher must ignore `controllers/` (`vite.config.js`, [controllers.md](controllers.md#hot-reload)). Never restart the server or `goto` for a controller change |
| Wall fully black, and stays black | A recent edit added an output guard with `isnan()`/`isinf()` | Some GPU paths (ANGLE/Metal) mis-evaluate them and zero every pixel; frame feedback keeps it black. PANIC, then clamp at the source instead |
| Flicker or shiver (meter flicker above 0.7, or a `flicker` alert) | Make sure your hands weren't on the knobs. Take two shots about 100 ms apart | Audio is driving a background **phase or position**. Move it to a monotonic accumulator where audio sets only the rate, and run brightness through attack/release envelopes, not raw z-scores |
| Whole frame blows bright on loud **or quiet** moments | `lumMax` jumps in the pulses; clip stays 0 | Use a frame-level brightness budget (one soft knee), gate light terms by energy presence, and clamp z-scores in silence |
| Ghost copies, or a smeared second exposure | A composition offset or pan was added recently | The previous-frame feedback UV must get the same offset as the frame |
| Dev server down (background `npm run dev` exited) | `curl -s -o /dev/null -w '%{http_code}' localhost:$P/` | Restart `npm run dev`. The wall reconnects |
| Jank spikes (100 ms+ worst-case frames) | `jank.over100` in the pulses | Usually a shader recompile during a hot-swap. If they come with no edits, look for expensive event branches |
| 30 fps on a 60 Hz projector, whatever the knobs do | Battery level; the frame time sits at exactly 33.3 ms | Plug the machine in. Browser energy saving caps pages at 30 fps on low battery |
| Wrong or silent input | `get_state`: `audio.input`, `audio.energy` | Fix the OS default input (section 1). `audio_device=` only overrides it |
| Scene dim and nearly still while music plays | `audio.energy` low; the shader's gate thresholds | The input is quieter than the gates expect. Section 5. Rescaling the gates in the `-wip` shader is the last resort |
| **Panic: get a known-good look on the wall now** | — | `panic` hot-swaps in place. Never `goto` |

### Panic

```bash
PORT=$P node scripts/vj/mcp-call.js panic '{"fork":"<fork>"}'     # no fork: the boot fork
PORT=$P node scripts/vj/mcp-call.js screenshot '{"width":256}'    # confirm the look came back
```

His own PANIC (the vjpad, its MIDI pad, `Esc Esc` on the jam page, the board) does the same and is
faster. `set_shader '{"shader":"<fork>"}'` is the same swap without the `panic` signal. Pick a fork
that reads the controller that is running; the show skill lists them. The controller keeps
running across the swap.

## 8. Show rules

Full list: [vj-preferences.md](vj-preferences.md).

1. **Nothing flashes or reloads the wall.** Swap shaders and controllers by hot-swap only.
2. **Every layer visibly reacts to the music.** Size reactions for the back of the room.
3. **Color follows only slow music.** No hue jumps from short-term features.
4. **Backgrounds stream forward.** Use monotonic clocks with no shiver.
5. **No clipping, no washout.** White is allowed. Quiet must never mean brighter.
6. **No painted rings.** Ripples are distortion only, fired by big audio changes.
7. **Keep 60 fps.** "Too slow" stops everything.
8. **Fork good moments.** Your words outrank the critic. Act on a critic note only when it repeats
   or the meter backs it up: over a long set it undoes its own advice.

## 9. After the show

`/show end` stops the lanes, processes the keeps, puts the story on the board and writes
`journals/<yyyy-mm-dd>-<show>.md`. Lessons that hold for any show go into this page; lessons for
one show go into its skill.

Past nights: [2026-10-09 sun show](../journals/2026-10-09-sun-show-playbook.md),
[2026-11-22 clit coaster show](../journals/2026-11-22-clit-coaster-show.md).
