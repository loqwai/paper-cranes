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

## 2.frag + controllers/sun-2.js — fork of live black-sun/sun-1 (2026-10-06, rehearsal)

From here on, forks of this line go in `sun/` (user's call). Look at fork time: a defined orange plasma ball with swirling gold arcs on its surface, slimmer yellow→amber rays with pink filament arcs, and a deep blue Van Gogh tile ground showing between the rays (HAZE-CUT). The LSD cloud bands sweep across mid-frame in teal, olive, pink and amber stripes. Distortion fronts are slower and stronger now (BIG-WAVES, about 2.4× the old lensing), and they fire on large audio changes rather than every kick. The storyline engine was not in yet. No knobs moved.

Preset: `jam.html?shader=claude/wip/sun/2&controller=sun-2&vj=1&remote=display`

## Storylines (live in black-sun/sun-1 + controllers/black-sun.js, 2026-10-06)

The sun now plays a stellar life cycle over minutes: MAIN SEQUENCE → RED GIANT → DYING → COLLAPSE → SUPERNOVA → NEBULA → REBIRTH → MAIN. The music moves it: a sustained build arms COLLAPSE, the drop fires SUPERNOVA, calm and quiet stretches age the star. Every act has a max-dwell fallback. **K5 STORY** (knob_5) forces an act (0 = auto). Story params (`bs_heat/size/power/dark/abstract/chaos/pull/nova/shell`) glide with long eases; the supernova is one eased event with an expanding LSD shell and a shock front. Full design, act table, how to add or retarget an arc, and the decision log: [docs/storylines.md](../../../../docs/storylines.md). Act screenshots: `.claude/vj-shots/act-0..6.png`, `acts-sheet.png`.

Distortion fronts now fire only on LARGE changes (z-jump > 1.3 over the 3 s envelope, a big flux spike, a section change, COLLAPSE, or SUPERNOVA). Refractory 8 s, life 6 s, ~0.25/s, ~2.4× the lensing. Kicks keep their light response only.

**Sky path + night (2026-10-06):** the sun drifts on a slow Lissajous (`bs_sunX/Y`, a monotonic phase, rate set by the act; DYING sinks it, REBIRTH rises, COLLAPSE and SUPERNOVA hold it still), and `bs_night` crossfades the tile sky into deep space: stars bent around the sun by the lens, plus LSD-banded nebula gas. The ball core is brighter (knee 0.92) and the rays are capped at 0.80, so the sun is the hottest thing on screen.

## 3.frag + controllers/sun-3.js — fork of live black-sun/sun-1 (2026-10-06, rehearsal)

The story engine has arrived, with sun drift and a night sky (see `docs/storylines.md`). Look at fork time is night at 0.63, with the sun drifted low and to the right: a magenta-and-orange plasma ball with swirling surface arcs and a lensed band crossing it, thin violet and magenta rays with pale spark beads streaming out, and the Van Gogh tiles faded to a dim indigo night with faint nebula colour behind. K5 STORY = 0 (auto). The binary companion was not in yet.

Preset: `jam.html?shader=claude/wip/sun/3&controller=sun-3&vj=1&remote=display`

## 4.frag + controllers/sun-4.js — the first natural SUPERNOVA (2026-10-06, rehearsal)

Forked live during the first supernova the music fired on its own (act 4, a few seconds after the detonation): a huge hot-gold plasma ball low in the frame, the scene blown into abstract LSD plasma (blue/violet/green/amber swirls), thin curling rays everywhere, sky half-dissolved. It also has the first audio-reactive galaxy gas (spiral arms around the sun: bass/kick widen and brighten them and billow the gas, mids set flow speed, flux sends a wave out along the arms, treble glints crests and deepens the star twinkle, roughness/entropy turbulence, drops wind the spiral tighter). The controller snapshot keeps its state on `window.__sun4State`, so it never shares state with the live `black-sun` controller.

Preset: `jam.html?shader=claude/wip/sun/4&controller=sun-4&vj=1&remote=display` (starts at MAIN SEQUENCE; K5 STORY 0.64 forces SUPERNOVA)

## 5.frag + controllers/sun-5.js — /fork of live black-sun/sun-1 (2026-10-06, rehearsal)

REBIRTH act (bs_act 6, 51 s in), night 0.52, abstract 0.37, **reach 0.76**: the occasional long-reach mode is on. A small, hot gold-orange plasma star sits upper-left, and long thin curling rays in amber, peach and violet stream across the whole frame and out past its edges. The ground is a half-night nebula sky of indigo, teal and olive gas bands over the faded tile texture. K5 STORY = 0 (auto), K6 REACH = 0 (auto). Captured before the binary companion, the plasma-outline removal and the nebula-gas audio pass.

Preset: `jam.html?shader=claude/wip/sun/5&controller=sun-5&vj=1&remote=display`

**2026-10-06, darker background (requested for sun/5 only).** The user said "We need that rainbow background darker so it's more spacey" (marker `SPACE-DARK`). The changes:
- Day cloud bands render as dim veils (lsdBand lit 0.9 → 0.52) and bass surges them.
- The night gas sits at about L 0.3 (lit 0.85 → 0.45) over a deeper indigo ground.
- The abstract nebula is dim veils (lit 0.7 → 0.4) over indigo-black, brightened by bass and treble.

The sun, the rays and controllers/sun-5.js are unchanged. Headless check: `.claude/vj-shots/sun5-dark-*.png`.

### Pass log (2026-10-06, later)

- **Controller fix:** a comment swallowed `bs_nova`, `bs_shell`, `bs_act` and `bs_actT` from the output object, so the supernova flash and shell never reached the shader until now (heat and size did). Fixed.
- **Haze cap (critic #2):** summed ray light is soft-limited to 0.12 + 2× the sky's own luminance (hue-preserving), the bass width pump is halved and the corona's loud gain is lowered — the sky keeps its colour on loud frames.
- **Night lift:** dark acts read on a projector — `dark` scales the sky by up to 0.5 (was 0.8), the deep-space base is lifted to L 0.25 and the gas is brighter. DYING went from lum 0.03 to about 0.08.
- **Galaxy + nebula audio (user + critics #3/#4):** the night gas lies in spiral arms around the sun. bass/kick widen and brighten the arms and billow the gas; mids set flow speed (`bs_galPh`); flux sends a wave out along the arms (`bs_fluxPh`); treble glints the crests and deepens the star twinkle; roughness/entropy add turbulence; drops, sections and supernova wind the spiral tighter (`bs_wind`, eased, REBIRTH unwinds it). The abstract `nebula()` layer (dominant in NEBULA/REBIRTH) bulges away from the sun on bass/kick, its bright gas surges ×1.5 on kicks, and it gets a flux wave and treble glints.
- **Reach mode (`bs_reach`, K6 REACH):** huge rays as an occasional aesthetic. In reach mode a ray's length is measured in screen distance, so a tiny star throws rays past the frame. Windows open in REBIRTH, on a 10 s hot section, or by chance after 3+ min; each lasts 30–90 s and eases in and out over ~20 s.
- **No outlines on the ball (user):** any thin bright curve over the cell pattern read as a glowing border around the dark lanes, so the surface has no line work now. Treble makes the hottest granules sparkle instead; cell contrast was raised (`BALL-BOIL`). The accretion-disk ghost over the ball (a dome shape) is gone in the eye phase (`NO-HAT`).
- **Fork:** `sun/4.frag` + `controllers/sun-4.js` = the first natural supernova.

### Audio audit — every layer and what drives it (standing rule)

| layer | features (light / rate / amplitude only) |
|---|---|
| plasma ball | bass → swell + core brightness + turbulence; kick → surge; mids+bass → boil speed (bs_diskPh rate); treble → granule sparkle; flux → limb flares |
| corona | bass → glow; flux → flares off the limb |
| rays | bass → brightness + width (capped); kick → pump; energy/bass/drop → reach; treble → sparks racing out; flux → a plasma blob rides one ray; centroid → bright bases vs bright tips; roughness → crackle; crest → glow width |
| distortion fronts | LARGE changes only (z-jump > 1.3, flux spike, section change, COLLAPSE, SUPERNOVA) |
| day tile sky | bass → tile gaps breathe; mids → tiles stretch; treble → edge tiles shimmer; energy → cloud edge advances; distortion front lights the tiles it crosses |
| LSD clouds | as the tiles (same tile machinery); hue on the slow palette clock only |
| lattice | flux → brightness; treble → sparkle |
| night gas / galaxy arms | see the galaxy entry above |
| abstract nebula | see the nebula entry above |
| stars | treble → twinkle depth (slow phase) |
| accretion disk (black-hole phase) | bass → brightness; kick → flare; mids → turbulence; treble → glints |
| story | build → COLLAPSE, drop → SUPERNOVA, calm/low → ageing acts; slow energy → drift speed |

## 6.frag + controllers/sun-6.js — /fork of live black-sun/sun-1 (2026-10-06, rehearsal)

REBIRTH act, night 0.70, abstract 0.61, reach 0.96 (full long-reach mode). Look at fork time is deep-space and spacey: a small hot gold plasma star lower-left of center, a dense spray of long fine curling rays in amber, rose and violet reaching across the whole frame, and a dark navy/indigo nebula with dim red, teal and violet gas veils and faint stars. **Caution:** this was captured during a live flicker problem (meter flicker 1.43). Somewhere a fast feature was driving nebula-gas brightness, and a background shiver fix was in progress. This fork likely carries that flicker, so check before using it in a show. K5/K6 on auto.

Preset: `jam.html?shader=claude/wip/sun/6&controller=sun-6&vj=1&remote=display`

## 7.frag + controllers/sun-7.js — /fork of live black-sun/sun-1 (2026-10-06, rehearsal)

The first fork with the **binary companion**. MAIN SEQUENCE (act 0), day-ish (night 0.15), reach 1.0. Look at fork time: a peach-gold plasma sun with swirling surface left of center, its rays fanning out amber-gold, and the smaller rose/crimson companion sun lower-right sending its own pink-violet tendrils across to tangle with the main star's rays. Behind them is a deep navy Van Gogh tile sky with LSD contour bands (teal/gold/violet/coral) sweeping around the edges. The meter was healthy again: flicker 0.22 (the shiver/flicker fix had landed), lum 0.30. K5/K6 on auto.

Preset: `jam.html?shader=claude/wip/sun/7&controller=sun-7&vj=1&remote=display`
