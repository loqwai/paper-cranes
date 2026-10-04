---
name: vibej2
description: "VJ a shader live, parameterized by audio source. Defaults to the laptop's built-in microphone (ambient/room audio, no tab-share, no reload risk); pass `spotify` (or `tab`) to read tab-captured audio plus the Spotify now-playing track name. Auto-mutates the shader every minute to match what it hears. Usage: `/vibej2 [mic|spotify] [N-iterations] [shader-path-or-name]` (default: mic, 180, most-recent .frag). `/vibej2 stop` ends early. `/vibej2 tick` runs one iteration (what the cron fires)."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__chrome-devtools__list_pages mcp__chrome-devtools__new_page mcp__chrome-devtools__select_page mcp__chrome-devtools__navigate_page mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__wait_for mcp__chrome-devtools__list_console_messages
---

# vibej2 — Live Auto-VJ Loop, Parameterized by Audio Source

Same loop as `/vibej`: every minute, read the audio state, make ONE meaningful edit to the
shader, move on. Non-destructive (edits `.frag` via `/__save-shader`, HMR hot-swaps).

**What's new in v2:** the audio source is a first-class parameter instead of an assumption.
`/vibej` hardcoded "read the Spotify now-playing widget". Most real sessions — the whole
`iris/7` run, `dark-1`, `chromadepth-2`, `clit-2`, `the-coat-25`, `mandelbulb` — were
actually **laptop mic** sessions with no Spotify tab at all, and the skill's Spotify step
was dead weight that made the loop brittle. v2 makes **mic the default** and Spotify an
explicit opt-in.

> Read `.claude/skills/vibej/SKILL.md` for the shared body — philosophy, per-tick edit
> mechanics (`__vjValidate` + `/__save-shader`), journal protocol, cursor hygiene, and the
> common-pitfalls list. This file documents only what v2 changes. Everything not
> contradicted here is inherited verbatim.

## Context

Arguments:
!`echo "$ARGUMENTS"`

Dev server port (from `scripts/dev-port` — branch-derived, `PORT` env overrides):
!`./scripts/dev-port`

Dev server status:
!`PORT=$(./scripts/dev-port); curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "not running"`

Existing state file (if a run is in progress):
!`cat .claude/vj-state.json 2>/dev/null || echo "(none)"`

## Arguments

Parsed from `$ARGUMENTS` by token, in any order. All of `/vibej`'s tokens still work
(integer N, `stop`, `tick`, shader path/name/URL), plus the new audio-source token:

- **`mic`** (or omitted) → **DEFAULT.** Laptop built-in microphone. Jam URL gets **no
  `audio=` param** — `index.js` `setupAudio()` falls through to the mic path. No Spotify
  tab is opened, no now-playing read happens.
- **`spotify`** → tab-captured audio + Spotify now-playing track name. Jam URL gets
  `&audio=tab`; a Spotify tab is opened and read each tick.
- **`tab`** → tab capture **without** Spotify. Jam URL gets `&audio=tab`, but no Spotify
  tab and no track-name read. Use for SoundCloud, YouTube, a movie in a tab, etc.

Examples:
- `/vibej2` — mic, 180 iters, most-recent .frag
- `/vibej2 spotify` — tab audio + Spotify track names, 180 iters
- `/vibej2 mic 60 claude/wip/iris/7` — mic, 60 iters, on iris/7
- `/vibej2 spotify 30 the-coat-6` — tab audio, 30 iters, resolving by name
- `/vibej2 tab` — tab capture, no Spotify (movie / SoundCloud / YouTube)
- `/vibej2 stop` — end the run

Store the resolved choice in `.claude/vj-state.json` as `audioSource`: `"mic"`,
`"spotify"`, or `"tab"`. `tick` reads it from state — never re-parse it from arguments.

If the user changes source mid-run ("switch to spotify", "back to the mic"), update
`audioSource` in state and `navigate_page` the jam page to the URL with/without
`&audio=tab`. **Warn first** — see the reload caveat below.

## The URL

```
http://localhost:$PORT/jam.html?shader=<path>&controller=<name>          # mic (default)
http://localhost:$PORT/jam.html?shader=<path>&controller=<name>&audio=tab # spotify | tab
```

The dispatch lives in `index.js` `setupAudio()`: `audio=tab` dynamically imports
`src/audio/tabAudioSource.js`; anything else falls through to the mic `AudioProcessor`.
(`audio=none` disables audio entirely — not a `/vibej2` mode, but don't clobber it if the
user set it by hand.)

## Setup differences from /vibej

### Step 3 — tabs

- **Jam page** — as `/vibej`, but build the URL per `audioSource` above.
- **Spotify page** — **only when `audioSource == "spotify"`.** Match by URL substring
  `open.spotify.com`; `new_page` it if absent. For `mic` and `tab`, do not open it and
  leave `spotifyPageId` null in state.

### `audio=tab` needs a human click

`getDisplayMedia` requires a user gesture, so `tabAudioButton.js` renders a share button
the **user** must click. When starting a `spotify`/`tab` run, say so once, plainly:

> Tab audio mode — click "Share Tab Audio" on the jam page and pick the tab playing music.

Then poll `window.cranes.flattenFeatures()` until features are non-zero before iterating.
Mic mode needs no such gesture beyond the browser's mic permission prompt.

### State file

Same `.claude/vj-state.json`, plus:

```json
{
  "audioSource": "mic",
  "spotifyPageId": null,
  "trackName": null
}
```

Everything else (`jobId`, `iteration`, `target`, `shaderPath`, `jamPageId`, `port`,
`startedAt`, `moveStyle`, `knobSnapshot`, `unwiredKnobs`, `failCount`) is unchanged, so a
`/vibej` run and a `/vibej2` run share one state format. A state file written by `/vibej`
with no `audioSource` key should be read as `"spotify"` — that was `/vibej`'s only mode.

### Cron

```
CronCreate({ cron: "* * * * *", prompt: "/vibej2 tick", recurring: true })
```

## Per-tick differences

### Step B — reading state

The jam-page `evaluate_script` feature read is **identical** to `/vibej`. What changes is
the second read:

- **`spotify`** → `select_page` spotify, read the now-playing widget, store as `trackName`.
- **`mic` / `tab`** → **skip it entirely.** No Spotify page, no track name. Do not
  substitute a guess. `trackName` stays null and the tick summary omits the track.

The `mic`/`tab` path is one browser round-trip shorter per tick, which is most of why v2
is less brittle: no page-stateful `select_page` juggling, nothing to go stale.

### Step C — picking a move

`/vibej`'s archetype table assumes musically-structured audio. For `mic` and `tab`, apply
the **iris/7 lesson** (`journals/iris-7-cool-moments.md`, "Design hypotheses for v(next)"):

> Ambient-mic sessions need SMOOTHED envelopes + low coefficients; z-score motion reads as
> jitter when the audio isn't musically structured.

So, by audio source:

| | `spotify` | `mic` / `tab` |
|---|---|---|
| **Track name** | available — drive palette/motif from it | none; let features alone drive |
| **Primary signal** | bass kicks, beat, `energyZ` | **`spectralFluxZScore`** |
| **Z-scores** | trustworthy — musical structure makes them meaningful | damp them; raw z-motion reads as jitter |
| **Envelopes** | normal coefficients | smoothed, lower coefficients |
| **Track-change event** | first-class trigger for a big move | no equivalent — pace big moves yourself |

The mic column comes straight from iris/7 iter33 ("MOVIE AUDIO MODE"), where the user
switched to the MacBook mic to watch a movie. The winning adaptation was **not** retuning
coefficients but **adding a new gate keyed on the dominant feature of the new source**:

- Movie / room / speech audio → high `spectralEntropy`, high `spectralFlux`, **low treble**.
  A `fluxPulse = clamp(spectralFluxZScore, 0, 1)` gate fires on every dialogue line, cut,
  and foley event, and is independent of the bass↔treble axis — so it reacts to *anything*.
- Music-tuned gates need **relaxed thresholds** on mic. iris/7 loosened `monsterBass`
  (mids 0.6→0.75, centroid 0.4→0.55) and `trebleShimmer` (bass 0.3→0.5, entropy 0.4→0.3)
  because the music-tuned windows were too narrow for the diversity of room audio.
- Keep **both** kickers alive where you can — iris/7 gave the catchlight bloom a bass term
  *and* a flux term, so it responds to whichever signal type dominates. That shader then
  works on either source without a retune.

Also true of mic sessions in practice: **room audio is quiet and bass-light.** Watch for an
over-aggressive quiet gate (`journals/1-cool-moments.md` flags exactly this — consider
OR-ing a bass level into the gate so bass-driven motion survives).

### Step G — the summary line

- **`spotify`** → `**Iteration N/total** — <track> — <what changed>.`
- **`mic` / `tab`** → `**Iteration N/total** — <what changed>.`

Don't print a placeholder where the track name would be.

## Journal

Unchanged from `/vibej` — `journals/<shader-name>-cool-moments.md`, same sections, same
read-at-setup / write-on-cool-moment protocol. One addition: **record the audio source in
the `## Status` line and in `## History of changes` at iter0**, the way iris/7 does
("iter0: forked from iris/1 with the iris/1 knob preset. Ambient mic mode."). A future
session reading the journal needs to know whether a tuning was made for music or for room
audio — a coefficient that was right on mic will read as dead on a Spotify run.

When the source changes mid-run, journal it as its own entry. iris/7 iter33 is the model.

## Pitfalls specific to v2

- **Don't open a Spotify tab in mic mode.** It's the single most common way this loop wastes
  a tick — `select_page` to a tab that has nothing to say.
- **Switching source mid-run reloads the jam page, and a reload kills audio capture.** In
  `spotify`/`tab` mode that costs the user a re-share click; the `2026-04-22` ergonomics
  journal ranks losing tab audio as the **#1 flow killer**. Warn before you navigate, and
  prefer finishing the run on the source you started with.
- **Mic mode is reload-cheap by comparison** — no share gesture to redo, just a permission
  the browser remembers. This is a real reason to prefer `mic` for long sessions.
- **Don't read z-scores literally on mic.** See the table above. This is the single most
  likely way a mic run produces jittery, unmusical-looking output.
- **`audio=tab` without the click looks exactly like silence.** All features read ~0. Check
  for the share gesture before concluding the shader's gates are wrong.

## Everything else

Inherited unchanged from `.claude/skills/vibej/SKILL.md`: setup steps 1/2/4/5/6, per-tick
steps A/D/E/F/H, move style (`moveStyle`), knob auto-wiring (`knobSnapshot` /
`unwiredKnobs`), validation via `__vjValidate` before `/__save-shader`, the post-save
static-linter check, revert-on-fail with `failCount`, cursor hygiene (park at bottom-right
— the user is projecting), stop conditions, shader swap, and the GLSL pitfalls list.
