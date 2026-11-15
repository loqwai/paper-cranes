# Handoff: sun-1-reactive (2026-11-14 show dry run)

## State at hand-off
- **Display:** the show browser (`scripts/vj/show.js`) is running `claude/wip/black-sun/sun-1-reactive` with `controller=black-sun-reactive`, `wavelet=true`, `vj=1` and `remote=display`. It listens on the MacBook Pro Microphone.
- **Mic gain:** macOS input volume was raised from 27% to **80%**. At 27% the mic barely registered audio. Lower it after the show if Zoom etc. sound too hot.
- **show-mode:** ON (see below).
- **VJ loop:** stopped; the monitors are stopped too.

## What changed and why (markers in the source)
| Marker | File | Change |
|---|---|---|
| `REACT-KICK-1` | sun-1-reactive.frag | Each kick flashes the tendril light gold, so the beat is visible from across the room. |
| `REACT-BASS-1` | sun-1-reactive.frag | Sustained bass brightens the already-lit sky gas by up to +90%, brights only, so it never washes out the floor. |
| `REACT-NOSHIVER-1` | black-sun-reactive.js | Removed the main sun's back-and-forth orbit wobble. |
| `REACT-MICGATE-1` | both | Audio gates moved from 0.003/0.015 to **0.017/0.026**. At 80% gain the quiet room read 0.014–0.018, which held the old gate fully open. |
| `REACT-NOMAGENTA-1` | sun-1-reactive.frag | Masked the painterly hue pass off the ORBIT giant. Its edge was hot magenta with stair-stepped edges; it's now molten gold. |

## Measured
- **Room music:** motionVsBass 0.77 / 0.57 (it was 0.29 on sun-1-wip), motionVsEnergy 0.68, clip 0 throughout.
- **Synthetic beat through the laptop speakers:** motionVsBass 0.48, flicker 0.09.

## Open issues
- **Shiver alerts (0.6–0.9) are probably a meter artefact.** Switching off each of five candidates (frame feedback, kick waves, kick swell, background-stroke swirl, half the kick flash) didn't change the score. It still reads 0.64 with the audio gate shut. Best guess: the meter measures motion around the screen centre while this scene's rings circle an off-centre sun. Fix it in `scripts/vj` **after the show**: any edit there reloads the display page.
- **Mic-only gates:** for line-in/BlackHole, set the `REACT-MICGATE-1` gates back to 0.003/0.015 (shader GATE and controller).
- **No music files on the machine** for repeatable A/B tests. Laptop-speaker test sounds have almost no bass.
- **CLI validator:** `scripts/validate-shader.js` can't run because its glslang binary is missing from node_modules. Use the page validator (`window.__vjValidate`).
- **Kick flash bypasses the haze cap:** `REACT-KICK-1` multiplies the rays *after* the cap (`sun-1-reactive.frag:1056`), so a kick can push rays to about 3.2x the cap. Measured clip was 0 every time; if a loud venue washes out, move the kick gain before the cap and widen `capL` by the kick envelope.
- **Unproven flicker spike:** one alert read 1.25 and couldn't be reproduced; everything since has been 0.09–0.85.

## show-mode (`~/mechs/show-mode/`, not a git repo)
- **Commands:** `on`, `off`, `root-on`, `root-off`. `~/.local/bin/show-mode` points to `on` and `re-enable` points to `off`. On Monday at 09:00, launchd runs `off` and `root-off` automatically.
- **User level:** Time Out and Slack quit; the ssh tunnels (cloudflared login pages), mcporter, the Slack checkers, the mindmeld healthcheck and defixate paused; heavy jobs paused (ollama, henchman, doctron, the sync and crawler jobs, syncthing); the two hourly cron scripts lose execute permission.
- **Root:** Spotlight off, automatic updates off, sleep/display sleep/Power Nap off. The previous values are recorded, and `root-off` restores them.
- **Manual steps:**
  - **Do Not Disturb:** no script can set it. Or create Shortcuts named "Show DND On" and "Show DND Off" and the scripts will run them.
  - **Time Machine:** still enabled, because turning it off needs Full Disk Access.
  - **Battery:** it was at **21%** and the laptop is set to never sleep, so plug it in.

## Suggested skill addition (not made)
In `.claude/skills/vibej2/SKILL.md`, setup step 3 (verify the input):
> If the input is the MacBook mic, also check `osascript -e 'input volume of (get volume settings)'`. Below about 70 the audio barely registers (2026-11-14: 27% gave energy around 0.005 with sounds playing through the speakers; 80% fixed it).

## Branches
- `sun-show-2026-10-17` @ `3145e553`: the post-10-17 sun work (sun-7, the sun-set skill, critic notes). Not on main.
- `sun-reactive-2026-11-14`: this variant, PR'd to main.
