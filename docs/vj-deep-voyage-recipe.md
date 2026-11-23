# Deep-voyage VJ recipe

How to get a set into the state Aaron called "an amazing set... explore it in insane depth for
hours" (11-22 19:31, about the [2026-11-22 clit coaster show](../journals/2026-11-22-clit-coaster-show.md)).
Written for a Claude starting a set cold. Every rule here was either earned that night or broken that
night; the journal has the evidence.

Read with: [show-quickstart.md](show-quickstart.md) (links, knob map, pilot),
[vj-preferences.md](vj-preferences.md) (his taste),
[advanced-shader-techniques.md](advanced-shader-techniques.md) (signal conditioning),
[live-session-architecture.md](live-session-architecture.md) (who does what).

## The five things that made it work

1. **The shader is a place, not a picture.** clit/2's complex power fractal has many independent axes
   (centre, zoom, rotation, power A, body B, curl). A voyage through them keeps finding new landmarks
   for hours.
2. **Geometry only goes forward.** Every coordinate is a monotonic clock. Audio changes **rates**, never
   direction or position. The one build with a sine on geometry was rejected ("It is not moving",
   shiver 0.92).
3. **Reactive at the real input level.** Test at phone-mic energy (0.01-0.07) with `time=0`. Every link
   carries `controller=clit-set&wavelet=true`.
4. **Alive comes from traveling waves and light.** Coil, undulate, kick punch, rails rushing past: all
   one-way phases or envelopes. None of them touch the fractal's coordinates.
5. **When he says "samey", change the camera model.** At 04:07 "pretty samey" got a fork into a
   log-polar tube, not another colour tweak.

## 1. Before the set

- [ ] **One short link** he never has to change (`2cb.pw/clit-now`). Repoint it; he reloads.
- [ ] **Every URL carries** `controller=clit-set&wavelet=true`. Without wavelet the kick and onset
      features are dead and the series sits still (00:45, he caught it).
- [ ] **Add `vj=1`** so the page meter runs. Last night's phone URL lacked it, so no flicker or shiver
      numbers existed for the whole vibej window.
- [ ] **Run his test** before sending a link: `&time=0` at phone-mic gain. Anything that still moves is
      audio. 311204c8 scored 0.041 (all clocks); 55fec755 scored 0.081 from audio alone.
- [ ] **Remote access** if he's away from the machine: `cranes-local.hypnodroid.com` behind Access,
      plus remote inspect (`scripts/remote/cranes-remote.js`, `remote-vj` skill). Both are on
      `live-tunnel` / draft [#182](https://github.com/loqwai/paper-cranes/pull/182) only, not main.
- [ ] **Assume he can't tap anything.** "you won't be able to ask me to do anything" (00:54). Switch
      shaders by in-place navigate or hot-swap, never by asking for a reload.

## 2. The shader: build a place

| Property | Why | Where it lives |
|---|---|---|
| **Several shape axes**, not one zoom | "Lost in the fractal" comes from pan, power and curl. Zoom alone runs out | `cs_navA`, `cs_navB`, `cs_curl`, `cs_cx/cy`, `cs_rot` in [clit-set.js](../controllers/clit-set.js) |
| **Waypoints + a voyage clock** | All dials at 0 still travels: six waypoints, home every ~12-24 min | `WAYPOINTS`, `cs_voyage`; `?voyage0=<u>` starts anywhere |
| **Know the legible depth** | Orbit-trap lace reads 1x to ~3.5-4.5x, then turns to speckle | `ZOOM_MAX = 1.1` (3x), [clit-set.js:68](../controllers/clit-set.js#L68) |
| **Depth without a wall** | Either a capped dive that **climbs out** onto new terrain (coaster mode), or a **periodic tube** that never zooms at all | coaster: `THROTTLE_RATE`, `CLIMB_SECS` ([clit-set.js:72-81](../controllers/clit-set.js#L72)); tube: [2.frag:77-89](../shaders/claude/wip/clit-vibej/2.frag#L77) |
| **Every knob at 0 looks good** | A reload zeroes every dial | quickstart §5 |
| **Colour guards at the output** | Motion plus trails blends neighbours into hot magenta, whatever each term avoids | magenta squeeze in [2.frag](../shaders/claude/wip/clit-vibej/2.frag) (vibej iter 5) |
| **Speckle gates on clamped logs** | `fwidth` of a raw `log(trap)` spikes on thread cores and dots them dark | [2.frag:293-300](../shaders/claude/wip/clit-vibej/2.frag#L293) |

### The tube (clit-vibej/2)

The screen becomes log-polar around a vanishing point, and that pair feeds the fractal's C:

```glsl
float tu = log(tr) - TRAVEL;                       // depth, minus a one-way travel clock
float tth = atan(tq.y, tq.x) + NAV_ROT + ROLL;     // angle, plus a one-way bank
vec2 C = home + vec2(0.23, 0.33) + TUBE_R1 * vec2(cos(TUBE_K * tu), sin(TUBE_K * tu))
       + (TUBE_R2 / zoom) * vec2(cos(2.0 * tth), sin(2.0 * tth));
```

- **Periodic in both u and θ:** no seam, no end, and the fractal is never magnified past its legible
  range.
- **Conformal walls** (`R1·K = 2·R2`) show rings, not radial streaks.
- **Keep the depth loop small** (R1 0.12) so the tube stays in lace-dense fractal. A 6-waypoint headless
  sweep picked it (worst-waypoint vivid 0.09 → 0.24).
- **Dark far core** (`smoothstep(0.02, 0.16, r)`) hides the singularity.
- **Rails and ties** spaced in equal steps of log r are perspective-correct and rush at you.

## 3. Motion: rates, never positions

```glsl
#define TRAVEL (cs_flow * TAU * 1.6 + cs_beat * 1.2 + cs_jump * 0.8)   // cruise + kick surge + drop lunge
#define ROLL   (cs_drift * 2.5)                                         // one-way corkscrew
#define WAVE_PHASE (cs_flow * TAU * 3.0 + cs_drift * 20.0 + cs_beat * TAU * 0.35)
```
([2.frag:71, 84-85](../shaders/claude/wip/clit-vibej/2.frag#L71))

- `cs_flow`, `cs_drift`, `cs_beat`, `cs_jump` only increase. Audio speeds them up; nothing reverses.
- **Kicks step a clock forward** (eased 0.12 s). They never add a transient to a phase.
- **Amplitudes stay constant.** Audio sets how fast the coil travels, not how big it is.
- **Fade new motion in** over ~10 s (`WAVE_RAMP`) so a hot-swap doesn't snap.
- **Directional waves, not radial ones.** Radial rings read as zoom jitter to the shiver probe.

## 4. Making it alive without moving coordinates

What he asked for, and what delivered it:

| His words | Move | Mechanism |
|---|---|---|
| "way more music reactive" (00:44) | techno build `55fec755` | phone-mic presence gate, kick = bass vs its last 0.45 s, 30 ms punch on lace/rim/ember |
| "I wanna see those tendrils coil" (01:49) | wall: VOYAGE 0.54, CURL 0.70, ZOOM 0.30 | glide to the waypoint, then turn CURL up slowly one way |
| "undulate and coil much more" (03:33) | vibej iter 4 | COIL: twist inside the iteration, ramping in over iterations 1-6; UNDULATE: crossed traveling waves on the input domain |
| "pretty samey... roller coaster" (04:07) | fork to `clit-vibej/2` | log-polar tube, one-way TRAVEL and ROLL, rails |
| "navigation controls like I'm going down a fractal roller coaster down the drop" (wall, [#191](https://github.com/loqwai/paper-cranes/pull/191)) | `&coaster=1` | k4 THROTTLE dive, k1/k2 STEER rates, drop surge, climb-out at the cap |

Colour and light moves that read on a phone (vibej iters 1-14): mids lift chroma, bass tints the dust
ember red at the same lightness, treble cools the rim to teal, treble brings out stars in black voids,
crest drives sparse pearls, a timbre shift turns the lace palette. Keep each beat effect
**luminance-neutral** so the flicker meter stays quiet.

## 5. The controller (`clit-set`)

- **Presence gate for a mic:** `smoothstep(0.0008, 0.006, energy)`, 0.25 s open, 3 s close
  ([clit-set.js:204](../controllers/clit-set.js#L204)). A line-level gate shut between kicks.
- **Kick that survives four-on-the-floor:** `cs_thump` = bass against its own last ~0.45 s
  ([clit-set.js:260](../controllers/clit-set.js#L260)). Z-scores against 10 s of history go flat on a
  constant kick.
- **Outputs to use:** `cs_punch` (light), `cs_beat` and `cs_lurch` (one-way steps per kick), `cs_flow`
  and `cs_drift` (clocks), `cs_jump` (+1 per drop), `cs_voyage` (waypoint position).
- **Opt-in for new semantics.** Coaster mode changes what the dials mean, which would have turned every
  NFC sticker's baked `knob_4` into an endless dive. It shipped behind `&coaster=1`, with a
  120,000-frame diff against main proving the default path unchanged.

## 6. The pilot

`npm run pilot -- --minutes 15` flies the wall from the music ([#190](https://github.com/loqwai/paper-cranes/pull/190),
quickstart "Let the music fly it"). Geometry moves only on section change, build, drop or breakdown.
Light follows smoothed features. His hand always wins: a touched dial is left alone for 20 s. Coaster
mode flies steer near straight and k4 as throttle.

## 7. Claude's job during the set

**Coordinator (the session Aaron talks to):** triage his words, make one decision, dispatch, relay.
Things that worked:

- **A dedicated VJ agent owns the loop and the `.frag`** (03:25). The coordinator stayed free to answer
  him and to handle the wall agent's PRs in parallel.
- **Server changes only while his phone is off** (03:25): the reload hit nobody.
- **A narrow monitor:** wake only on connect, disconnect, a failed move, or a cool moment. Routine moves
  stay in the log.
- **Hold a merge that changes semantics for everyone** (05:12), even when the wall agent says it's
  ready, until an independent reviewer proves the default path is unchanged.

**VJ agent loop** (each step was a script in its scratch; promote them if you build this again):

1. **Pick one move** from the audio fingerprint (bass, mids, treble, centroid, entropy, energy). Colour
   and light only in subtle mode; geometry changes only on his request, as a fork.
2. **Validate** with `node scripts/validate-shader.js`.
3. **Safe-apply:** back up the live `.frag` as last-good, install the candidate, read the phone's
   `shaderError` over remote inspect, and revert on any error. Compare page uptime before and after to
   catch a reload.
4. **Check the frame** with a colour census (vivid share, hot-pink share, grey share, white, mean L).
   For a dramatic change, render it headless across all six waypoints (`?voyage0=0..5`) before the
   phone sees it.
5. **Commit after every move** (revert `shader-dates.json` first). Merge remote changes only when they
   don't touch reload-risk files (`index.js`, `src/`, `vite-plugins/`).
6. **Journal** cool moments with the audio fingerprint and what made them work.

Result: 14 moves on 1.frag and a fork plus 4 moves on 2.frag, with no failed save and no rollback.

## 8. Reading him in the moment

- **"It is not moving" / "almost still"** means motion is missing, not slow. Check the link params,
  the presence gate and the clocks before touching the art.
- **"Other shades are fine it's this series"** means the bug is ours, not his audio.
- **"samey"** means change the camera model or fork. More colour moves won't fix it.
- **Short praise ("Looks great!", "Very very good")** means hold the look and keep the moves small.
- **He reports a test he wants run** ("freezing time to 0"). Make it the gate for every later build.
- **"It'll be off and on over the next 2h. Be prepared."**: phone drops are normal. Pause on hidden, resume on
  connect, never treat silence as failure.

## 9. Anti-patterns (each one happened)

- A sine on zoom, rotation or pan (shiver 0.92).
- Long waypoint holds where nothing moves ("It is not moving").
- A link without `wavelet=true` or `controller=`.
- A presence gate or kick detector tuned on a line-level test clip, then shipped to a phone.
- Light that pulses radially with audio. The shiver probe reads it as zoom jitter.
- Saving reload-risk files while his tab is live. Android also reloads a hidden tab on its own
  (4 times that night), so expect cold restarts anyway.
- Sending a prod link for a shader that only exists on a branch (06:32, "Looks black to me").
- Changing dial semantics on main without an opt-in.

## 10. Porting this to a new fractal

When choosing the next base (Shadertoy or otherwise), check:

- [ ] At least three independent shape parameters, plus centre, zoom and rotation. Waypoints need
      somewhere to go.
- [ ] Measure the legible zoom range on a 408 px phone canvas. Cap the dive below the speckle point, or
      use a periodic tube or climb-out instead of deep zoom.
- [ ] Orbit-trap or lace-style detail that can be gated by `fwidth`.
- [ ] Runs at 60 fps on a phone with the iteration count capped.
- [ ] Wire it to `clit-set` (or a sibling controller) so the `cs_*` clocks and envelopes work at once.
      Every knob at 0 must already look good.
