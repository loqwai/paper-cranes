# 2026-11-22: the clit coaster show

The night clit/2's fractal went from "it is not moving" to a set Aaron called amazing. It ran on
three surfaces: his phone at a hard-techno club, a projector wall run out of his trunk, and finally
prod. The reusable recipe is in [docs/vj-deep-voyage-recipe.md](../docs/vj-deep-voyage-recipe.md).
This file is the record.

**Aaron, the next evening (11-22 19:31):** "We `vibej'd` an amazing set last night, based off of the
'clit/2' shader. That shader's complex fractal nature let us explore it in insane depth for hours."

## Sources

Every claim below cites one of these.

| Key | What |
|---|---|
| **T** | Coordinator transcript `6d078c12-4fd0-4ea4-9878-bf14d9057bfe` (Claude Code, `~/.claude/projects/-home-hypnodroid-Projects-paper-cranes/`). Mindmeld **102906** (the VJ window) and **102145** (the coaster and merge chunks 22-24). Times are MST, from the transcript timestamps. |
| **W** | The wall/projector session ("Clit/2 shader projector session", `session_01BkVxNPvPQdt6DR86QxVMxU`), seen through its cross-session messages in T and its PR bodies. Its own transcript isn't on this machine. |
| **L** | The VJ agent's run log: `clit-set.log` in T's scratchpad (ephemeral). Its `[vibej]` lines are quoted in [clit-vibej.md](../shaders/claude/wip/clit-vibej/clit-vibej.md). |
| **J** | The in-show journal, [clit-vibej-cool-moments.md](clit-vibej-cool-moments.md). |
| **G** | git: `live-tunnel` commits, `show/clit-vibej` abfce3d6, PRs [#181](https://github.com/loqwai/paper-cranes/pull/181), [#189](https://github.com/loqwai/paper-cranes/pull/189)-[#194](https://github.com/loqwai/paper-cranes/pull/194). |

## Timeline

### Act 0: the wall rejects clit-set/2 (11-21, 23:49 to 00:30)

- **23:49, wall rehearsal:** Aaron: "It is not moving." The show agent measured `cs_jump` stuck at
  6, music sync **anti-correlated** (motionVsEnergy -0.35) and flicker 1.29-1.56 against a 0.7 limit.
  The wall fell back to the old clit/2. (T 23:49, brief to the fix lane)
- **23:59, show agent:** "A zoom breath that reverses direction is a sine on geometry, which breaks
  our standing rule... geometry only evolves." (T 23:59, W)
- **00:30, `311204c8`:** sine sway removed, replaced by a one-way spin. Shiver 0.92 → 0.35. (G, T
  00:30)

### Act 1: the phone at the club (00:41 to 01:12)

- **00:44:** "I need it way more music reactive than that... I'm at a hard techno place and it's almost
  still except for time" (T)
- **00:45:** "Did you forget to add the controller query ideal? Or wavelet". The coordinator: "Yes, I
  left out `wavelet=true`." (T 00:45:36)
- **00:45:** "Other shades are fine it's this series". The coordinator traced it to a presence gate
  tuned for line input (`controllers/clit-set.js:133` at the time) and kicks z-scored against ~10 s of
  history, which go flat on four-on-the-floor. (T 00:45:59)
- **00:46, Aaron's test:** "You test it in my machine freezing time to 0 using query params". With
  `time=0` only audio can move the picture. It became the bar every build had to pass. (T)
- **00:50, `55fec755`, the techno build:** presence gate at `smoothstep(0.0008, 0.006, energy)`, kick
  = bass against its own last 0.45 s (`cs_thump`), a 30 ms punch on lace/rim/ember, a forward lurch
  per kick, spin 0.5x silent to 4x loud. Under `time=0` at phone-mic level, motion from audio alone was
  0.081, against 0.041 from the clocks alone on 311204c8. (G, L) Shipped as
  [#181](https://github.com/loqwai/paper-cranes/pull/181).
- **00:51:** `2cb.pw/clit-now` repointed to it: one short link the coordinator re-aims, and Aaron
  only reloads. (T 00:51:38)
- **00:49-01:00:** Aaron asked for a Cloudflare tunnel plus remote inspection. `cranes-local.hypnodroid.com`
  came up behind Access at 00:52. Remote control (`7de9ff4e`, open as
  [#182](https://github.com/loqwai/paper-cranes/pull/182)) was ready at 01:00. (T, L)
- **00:54:** "you need to be able to do remote reloads etc because you won't be able to ask me to do
  anything" (T)
- **01:04:** "Ok. Looks great!" **01:07:** "Very very good, Claude." (T)
- **01:11:** "This is dress rehearsal we're going to project the same thing out of my trunk in 20m so
  this needs to be reproducible easily from fresh context". That produced
  [docs/show-quickstart.md](../docs/show-quickstart.md) (#183). (T, G)

### Act 2: the trunk wall (01:26 to 02:33)

- **01:26-01:30, W:** audio-swap CLI (#185, #186). On the trunk mic, gain x8 gave energy 0.076 with
  kicks 0.12-0.51 and no clipping. (T 01:29)
- **01:49:** "I wanna see those tendrils coil in the fractal" (T)
- **01:53, W, on the wall:** VOYAGE (k3) 0.54 holds the jellyfish-tendril waypoint, CURL (k8) 0.70
  winds the coil, ZOOM (k4) 0.30 (~1.9x). Flicker 0.13, clip 0, and no cut on the glide there. (T
  01:53)
- **02:33:** TURN (k5) became a direct scratch: 0→1 = two full turns, ~50 ms response, nothing at 0.
  Merged as [#189](https://github.com/loqwai/paper-cranes/pull/189) (`9ce856dc`). (T 02:33, G)

### Act 3: `/vibej` on the phone (03:24 to 04:37)

- **03:24:** "Ok I just connected my phone now. It'll be off and on over the next 2h. Be prepared. New
  show. /vibej" (T)
- **03:25-03:26:** the coordinator updated the live server while the phone was off (so the reload hit
  nobody) and handed the loop to a dedicated VJ agent. That agent forked `clit-set/2` into
  `claude/wip/clit-vibej/1` and moved the phone onto it with an in-place navigate: no reload, 90 fps,
  audio running. (T 03:25-03:26, L 03:26:27)
- **03:27-03:31, iters 1-3:** colour only. Mids lift chroma, bass tints the dust ember red, and the
  beat hue rotation is clamped out of the magenta arc. (L, `9b553f4e`)
- **03:33:** "We need it it to undulate and coil much more" (T)
- **03:36, iter 4, `f60addc4`:** COIL (a barber-pole twist inside the fractal iteration) plus
  UNDULATE (crossed traveling waves on the input domain), both on one phase that only runs forward:
  `WAVE_PHASE = cs_flow·TAU·3 + cs_drift·20`, measured 1.82 rad/s at energy 0.04. Audio sets only the
  rate. ([2.frag:65-74](../shaders/claude/wip/clit-vibej/2.frag#L65), L 03:36:33)
- **03:38-04:03, iters 5-14:** output magenta guard (hot pink 0.18-0.28 → 0.06-0.13), kick surges on
  the wave phase, pearls on crest, treble cools the rim to teal, stars on treble, fwidth gates against
  sub-pixel speckle, then a fix to those gates (they dotted the thread cores dark). (L, J)
- **Cool moments** (J): 03:38 periwinkle lace under a coral ribbon arc, coiling; **03:41 jellyfish
  tendrils**, coral rings hanging from a lace canopy and rippling; **03:56 the vortex**, loops spiralling
  into a black-striped tunnel.
- **04:07:** "It's been pretty samey for a while. Give me a 'roller coaster' view going down the
  fractal tube" (T)
- **04:12, `9d050680`, the fork to `clit-vibej/2`:** a log-polar tube around a vanishing point,
  sampled so it is periodic in both depth and angle. No seam, no end, and no zoom past the lace's
  legible range. TRAVEL (cruise + kick surge + drop lunge) and ROLL (a one-way corkscrew) are both
  monotonic. Amber rails and ember ties sell "coaster". 1.frag stayed as the fallback.
  ([2.frag:77-89, 228-242](../shaders/claude/wip/clit-vibej/2.frag#L77), T 04:12:16)
- **04:18-04:25, tube iters 2-5:** a headless sweep over all six waypoints (`?voyage0=0..5`) picked
  the smaller depth loop (worst-waypoint vivid 0.09 → 0.24). Then a stronger sub-pixel dim, thicker
  rails with a kick glow, and half the bass thickening. (L, `27516fdf`, `9a9e6201`)
- **04:28, the ride** (J): a periwinkle tube with lace filigree walls, amber rails from the bottom edge
  into the dark core, coral rings sweeping past. Vivid 0.75, grey 1.7%.
- **04:35-04:37:** end of the window. 1.frag got 14 moves, 2.frag a fork plus 4 moves, with no failed
  save and no rollback. `571a5953`. (T 04:36, L)

### Act 4: coaster mode on the wall, then prod (05:12 to 06:33)

- **At the show, W:** Aaron: "Give me navigation controls like I'm going down a fractal roller coaster
  down the drop." ([#191](https://github.com/loqwai/paper-cranes/pull/191) body) The show agent
  turned k4 into THROTTLE (a one-way dive), k1/k2 into STEER rates, and made drops surge. It went live
  on the wall by controller hot-swap: flicker 0.42-0.51, clip 0, 16.7 ms frames.
- **05:12, the coordinator held the merge:** coaster semantics would have turned every NFC sticker's
  baked `knob_4` into an endless dive. It made the mode opt-in with `&coaster=1`. (T 05:12)
- **05:20:** a reviewer ran 120,000 frames of random dials and NFC bake variants, and every one matched
  main without `coaster=1`. #191 and the autopilot
  [#190](https://github.com/loqwai/paper-cranes/pull/190) (`npm run pilot`) were merged.
  [#192](https://github.com/loqwai/paper-cranes/pull/192) at 05:25 made throttle 0 truly stop. (T
  05:20-05:25, G)
- **06:30:** "I want to see the deployed version of the story from the beginning, using the
  controller etc and no llm." The prod coaster link went out at 06:31. **06:32:** "Looks black to me".
  The black one was the `clit-vibej/2` link, which wasn't on prod yet. (T)
- **Follow-up:** abfce3d6 (`show/clit-vibej`), then [#194](https://github.com/loqwai/paper-cranes/pull/194)
  put `clit-vibej/2` on main. (G)

## What caused the peaks

- **Reactivity at the real input level.** The series looked dead on a phone until the presence gate,
  the kick detector and `wavelet=true` matched a club mic (Act 1). "Looks great!" came 13 minutes
  after `clit-now` pointed at the techno build. (T 00:51 → 01:04)
- **A place with many axes.** VOYAGE, CURL and ZOOM on the wall found the tendrils on request (01:53).
  The vibej moves never touched coordinates, yet the voyage kept delivering new landmarks: tendrils,
  vortex, tube. (J)
- **Motion that only goes forward.** Every hit Aaron asked for (coil, undulate, coaster) is a
  traveling wave or a monotonic clock whose rate follows the music. The rejected 23:49 build had a sine
  on geometry. (T 23:59, L 03:36, 04:12)
- **A dramatic move when "samey" is said.** At 04:07 he named it, and the answer was a fork with a new
  camera model, not another colour tweak. (T 04:07)

## What broke, and the fix

| Failure | Cause | Fix / status |
|---|---|---|
| "It is not moving" on the wall (23:49) | 40 s holds between waypoints by design; `cs_jump` stuck | `311204c8`: always moving, one-way spin |
| Shiver 0.92 | sine sway on zoom, rotation and pan | geometry only evolves (`311204c8`) |
| Near-still on the phone (00:44) | line-level presence gate; z-score kicks flat on techno; no `wavelet=true` in the link | `55fec755`; every link carries `controller=clit-set&wavelet=true` |
| Hot pink 0.18-0.28 after the coil | trails blend red over violet; mids chroma; per-channel gamma | output hue squeeze, iter 5 |
| Dark dots along clean threads | `fwidth` of an unclamped log trap spikes on cores | clamp to the lace band before `fwidth`, iter 13 |
| Tube through empty fractal (meanL 0.17) | depth loop too wide | R1 0.30 → 0.12, K 1 → 2.5, picked by a 6-waypoint sweep |
| Phone page reloaded 4x | Android discards the hidden tab; not caused by saves (L 03:35) | open; avoid leaving the tab |
| No meter all window | `vj=1` was never in the phone URL | judged by colour census (`census.py`) instead; put `vj=1` in next time |
| Coaster would hijack NFC stickers | dial semantics changed for everyone | opt-in `coaster=1`, proven by the 120k-frame diff |
| Black link at 06:32 | shader only on `live-tunnel`, not on prod | #194 |

## Still open

- **Tube walls speckle with live audio** (grey 6-12%, hot pink to 0.18), but stay clean without audio.
  The cause isn't isolated. (J todo, T 04:36)
- **The rails corkscrew overhead** with the unbounded ROLL. Aaron hasn't said whether they should stay
  on the floor. (J todo)
- **Remote inspect** (`scripts/remote/`, the `remote-vj` skill) is only on `live-tunnel` and draft
  [#182](https://github.com/loqwai/paper-cranes/pull/182), not main.
- **The VJ agent's safe-apply, commit and census scripts** lived in session scratch
  (`apply.sh`, `commit.sh`, `census.py`). The recipe doc describes them; they aren't in the repo.
