# sun

A psychedelic plasma sun: a glowing plasma ball radiating curling sun rays over a Van Gogh brush-tile sky with 1960s LSD-poster contour clouds. Branched from `claude/wip/black-sun` (see `../black-sun/black-sun.md` for the full history, from black hole through iris eye to sun).

**Requires the controller:** `&controller=sun`. `controllers/sun.js` is a snapshot of `controllers/black-sun.js` at fork time. It supplies the `bs_*` uniforms: the seconds-based clock, eye morph, audio envelopes, kick and flux-flare state, ray shape and palette clock. Its persistent state lives on `window.__blackSunState`.

Knobs: K1 HOLE SIZE, K2 HUE SPIN, K3 LATTICE, K4 ZOOM. At 0 they give the designed look.

## 1.frag — fork of live black-sun/sun-1 (2026-10-06, rehearsal for the Friday show)

Look at fork time:
- **Sun:** an orange plasma sun disc with swirling coral and gold plasma bands. A tilted plasma band crosses its face.
- **Rays:** broad amber and peach sun rays fan out, laced with pink and violet filament arcs.
- **Sky:** the tiles show through in teal, violet and olive between the rays. The LSD cloud bands carry the palette, with hueConc down to about 0.55 from 0.91.

It was captured right after a freeze. A stale controller state object was missing `fAge`/`fluxEnv`, so it produced NaN, and the fail-loud check stopped every `bs_*` uniform. I patched the state in the page. The copied controller still has that latent bug, but a fresh page load starts with complete state, so it doesn't trigger there. This fork is also from before the "powerful plasma ball, no black, no straight lines" pass.

Audio: BlackHole 2ch as the OS default input. No knobs moved.

Preset: `jam.html?shader=claude/wip/sun/1&controller=sun&vj=1&remote=display`
