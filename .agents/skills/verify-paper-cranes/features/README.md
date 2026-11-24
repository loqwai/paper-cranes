# Paper Cranes verification map

The maintained source for verifying what a Paper Cranes user sees and does. Read this index, then
use the matching feature file as the recipe. `B` below is
`.claude/skills/verify-paper-cranes/bin/pc-verify.mjs`, run from the repo root.

## Baseline preconditions

- `npm ci` has run in this checkout.
- `$B launch` has printed `ready: http://127.0.0.1:<port>` with a port in 7140-7149, or the recipe
  targets a deployed site with `--base`.
- `$B doctor` passes: the port is ours, the build is the one you mean, WebGL2 is present, frames
  advance.
- Never drive ports 6969, 6977, 6978 or 6991 (Aaron's dev server and the live show), never
  claude-in-chrome, never `scripts/vj/show.js`.

## Surfaces

| Surface | URL | Dev only |
|---|---|---|
| Display | `/?shader=<path>` | |
| Editor | `/edit.html?shader=<path>` | save-to-disk is |
| List (phone) | `/list.html` at 390x844 | |
| VJ pad, MIDI map, jam | `/vjpad.html`, `/midi.html`, `/jam.html` | |
| Remote display / control | `?remote=display`, `?remote=control` over `/ws` | yes, unless `?room=` |
| VJ MCP | `/mcp` (dev), `https://relay.beadfamous.com/mcp/<room>` (live, behind Access) | dev one is |
| Relay room | `?room=<room>` over `wss://relay.beadfamous.com/ws/<room>` | |
| Production / previews | `https://visuals.beadfamous.com`, `https://<branch>.paper-cranes-visuals.pages.dev` | |

## Driving conventions

- Hold the clock (`time=5`) and silence the mic (`noaudio=true`) unless the recipe is about time or
  audio.
- Prefer URL params, real buttons (`#save`, `button[title="Add to set"]`), `role=status` notes and
  `window.cranes` state over coordinates.
- Every recipe that writes a shader writes under `shaders/claude/wip/verify-scratch/`; generated
  audio goes to `public/test-audio/verify-*`. Cleanup removes both.
- Run `$B cleanup` after every run, failed ones included.

## Proof and skip reporting

- Visual behaviour: a headful video (`--video`) plus a rest frame and an after frame with pixel
  stats. Skipping required video is "reward hacking" (Aaron, mindmeld 59132).
- Record the feature file, the entry point used, the URL, and the evidence folder
  (`~/paper-cranes-proof/<run-id>/<feature>/`) with every claim.
- Report an entry point you could not reach with the command tried and the unmet precondition.
  Do not report it verified through a different entry point.

## Feature entry contract

Each feature file has an H1, one paragraph on the user-visible behaviour, then exactly these H2s in
order: `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Shader render with audio injection](./shader-render.md): a shader paints and reacts to injected
  features, knobs and real audio. Proven by the skill's own proof run.
- [Missing shader](./missing-shader.md): an unknown `?shader=` plays the default plus a note.
- [List page](./list-page.md): phone search, setlist, GO and the perform overlay.
- [Editor save and remote display sync](./editor-remote-sync.md): edit.html's save reaches a
  display and disk.
- [VJ MCP](./vj-mcp.md): `list_displays`, `set_params`, `get_state`, `screenshot` on a live display.
- [Relay room](./relay-room.md): a display in `?room=` on production takes a peer's knobs and
  refuses its pinned keys.
- [VJ pad, MIDI and jam pages](./vjpad-midi-jam.md): the control-surface pages load and settle.
