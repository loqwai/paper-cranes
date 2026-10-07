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

### Pass log (2026-10-06, binary star + shiver)

- **Binary companion (`bs_cX/cY/cOn/kiss`):** a small dark-red plasma star (heat forced to 0.32, same ball rendering). It enters off-screen upper-left and spirals in clockwise over the top (orbit radius eases 2.6 → 0.78, τ 55 s), then dances a slow elliptical, precessing orbit; mids speed the dance as a rate. The main star wobbles about the barycentre (weak while the companion is far). Rays of both stars lean toward each other (`gBendAmt`, stronger when close); a plasma bridge arcs between them when they are near and flares on a **kiss**. Kisses come on a drop or section change (30 s refractory) or a scripted approach every ~2.5 min: the orbit dips until the coronas overlap, and a distortion front fires from the contact point (waves now carry their own centre, `bs_waveX/Y`). SUPERNOVA flings it away; REBIRTH brings it back in from the upper-left. Its light answers mids/treble/roughness, not bass.
- **Stars:** ±60% treble twinkle on per-star hashed phases; the brightest swell to 2–3 px on kicks.
- **Ball:** core luminance kept up in cool acts (`CORE-HOT`), ±~25% core pulse; the limb now dissolves into the corona and the ray roots over its outer ~40% with the same hue band (`BLEND`); small/distant stars pulse harder (`SMALL-PULSE`, gain ∝ 0.22/radius, 0.6–2.6×).
- **Shiver / forward motion / banding (user):** a clock inside `sin()` in a domain warp moves the field back and forth, and that read as shiver. The gas fields (`deepSpace`, `nebula`) now TRANSLATE on the monotonic flow clock and their warps carry no clock. Warp amplitude takes only `bs_billow` (a ~4 s ease of bass+roughness). Background light rides slower envelopes `bs_bassS/bs_kickS` (attack ~80 ms, release ~600 ms); the fast kick envelope on the big gas layer was the 1.2–1.4 flicker. Tile treble jitter replaced by a treble brightening. LSD bands blend across the full band width in OKLab (`bandBlend`), plus a 1-LSB dither. Clean 30 s after: flicker 0.20, clip 0, p95 17.5 ms, no jank spikes. The fix was ported to `sun/6.frag` and `controllers/sun-6.js` (state on `__sun6State`).

## 8.frag + controllers/sun-8.js — /fork of live black-sun/sun-1 (2026-10-06, rehearsal)

DYING act (bs_act 2), night 0.78, heat 0.22 (cool), reach 0, no kiss at that moment. Look at fork time: two small coral-rose stars in deep space, the companion at left and the main sun at right of center. They are close together and their thin magenta tendrils, beaded with pale sparks, reach toward each other in a dance. The night sky is a dark navy starfield under swirling psychedelic nebula gas in teal, green, rust, violet and blue. The frame is dim (lum 0.13), which is moody, and the critic flagged a grey veil over the night sky at this moment. Flicker 0.49. Captured before the brightness-budget fix and the quiet-never-brighter fix. K5/K6 on auto.

Preset: `jam.html?shader=claude/wip/sun/8&controller=sun-8&vj=1&remote=display`

### Pass log (2026-10-06, brightness budget / quiet-safe / colour)

- **K7 KISS** (knob_7 rising edge past 0.5, 10 s guard) calls a kiss by hand; every kiss is logged to `window.__blackSunState.kissLog` with its cause (`knob` / `drop` / `section` / `scripted`); a scripted approach fires after 150 s with no kiss.
- **Frame budget:** one OKLCH soft knee on the finished frame (L > 0.6 compressed toward ~0.82, chroma never pulled toward grey, decode → knee → encode), replacing stacked per-layer limiters. Broad gas layers surge on their bright arms/veils only (local contrast, not a frame lift). 60 s loud trace afterwards: frame-mean lumMax 0.34.
- **Quiet-safe:** `bs_presence` = raw energy right now (0.25 s ease). The shader's GATE and every controller envelope are multiplied by it, so a sudden quiet gap relaxes the scene; energyMean lags ~8 s and hiss z-scores used to brighten silence.
- **No grey:** LSD bands blend in OKLCH (an OKLab mix of complementary bands passed through grey and veiled the night sky). The night floor is navy-black (L 0.16). `gamutLch` lowers L by up to 0.12 before giving up chroma. The ball chroma was raised; ball-body saturation measured A/B on the same frame went 0.57–0.66 → 0.84–0.85. Scene chroma ×1.15 in the budget step. Dead `eyeTone` (mixed toward grey) removed.
- **Gas without bands:** gas colour is a continuous function of the field (`gasHue`: hue sweeps the wheel with the field value) — no floor/fract band index in the gas any more. The gas is thin translucent veils with clear gaps (density², additive), so stars and navy space show through. The abstract nebula adds over a darkened scene instead of replacing it.
- **Supernova:** no painted shell. The shock is the distortion front; it lights the gas it has crossed, wall to wall within ~6 s, fading with the flash. Ray roots fade up just outside the ball body (no spokes across it).

## 9.frag + controllers/sun-9.js — /fork of live black-sun/sun-1 (2026-10-06, rehearsal; user: "It's decent right now")

COLLAPSE act (bs_act 3), deep night 0.94, both stars small (size 0.23), no kiss in progress. The look at fork time is two small glowing coral-red suns drifting toward each other in deep space, with fine thin tendrils curling between them. Faint warm gas wisps arc between the stars, over a near-black starfield with dim smoky nebula veils. It is saturated (sat 0.80) but very dark (lum 0.027), which is the moody collapse beat. This is the first fork after the black-wall fix (no isnan), the magenta removal, the closed-form gamut map with frame time back to 17.6 ms, and the continuous plasma ramp. No knobs set.

Preset: `jam.html?shader=claude/wip/sun/9&controller=sun-9&vj=1&remote=display`

### Legible channels (2026-10-06) — one musical element, one visual verb

The user: "I need a variety of legible music features affecting the scene!!!" Every channel now has its own layer and its own kind of motion, and cross-talk was removed so an audience member can point at the screen and name the instrument. Beat channels run on the wavelet (DWT) analysis — the page needs `&wavelet=true` (or wavelet enabled live) and the controller throws if those features are missing after warm-up.

| musical element | source | visual verb (and nothing else uses it) |
|---|---|---|
| kick | `wavelet_bassHit` onset, 120 ms refractory → instant-attack envelope (~300 ms release) | main star SIZE punch +13% (small/far stars punch harder) + a short lensing thump around it. Onset → size peak measured on the wall: median 17 ms, p90 30 ms |
| snare / mid transients | `waveletBand3/4ZScore` onset | one spark ring bursts out along every ray per hit (countable) |
| hats / treble | `waveletBand5ZScore` envelope | the star field twinkles (±85%), the brightest stars swell; fine glints race out at the ray tips |
| bass sustain | slow `bassNormalized` envelope (1.2 s up / 2.5 s down) | the nebula gas / galaxy arms swell and breathe; day tiles' gaps breathe; day sky sunlight |
| melody / pitch | pitch-class steps + `waveletCentroidZScore` glides | the COMPANION: its brightness, its ray light, its size, and its orbit speed |
| mids / vocals | mids envelope (~0.35 s) | tendril sway amplitude |
| energy build | `energySlope × energyRSquared` | rays lengthen, the background flow and the plasma boil speed up |
| drop | `wavelet_confirmedDrop` after an armed build | story events: kiss, COLLAPSE → SUPERNOVA, distortion fronts |

Removed for legibility: bass/kick brightness on the rays, ball and corona; kick on gas and stars; treble on gas crests, tiles and the ball surface; flux flares and the flux blob; the post-composite surge gain. Act changes are now music-earned and logged in `window.__blackSunState.actLog` with their cause; the only non-musical exit is a ≥7 min fallback that glides 2.5× slower to a gentle act (never to SUPERNOVA). Kisses fire only on a drop, a section change, a strong onset cluster or K7 — no timer.

Also: Starry-Night tile flow (tile rows follow a slow swirl field instead of perfect circles), night fully hides the tiles, night floor raised (base L 0.21, veils ×2.5), wavelet analysis enabled live on the wall over CDP (no reload) — Friday's launch URL now carries `&wavelet=true`.
