# clit-3 — Session Journal

## Status
VJ run stopped at iter 11/180 — performance wrapped, audio went silent, Spotify tab closed. Final shader: midnight-blue bg, wing-traveler hearts on slowly-morphing arcs, energy-driven traveler speed, anatomy disguised. User filmed the result on phone, synced via silence-dip detection, exported a 21MB H.264 cut for Instagram. **`/sync-phone-video` skill saved at `~/.claude/skills/`.**

## History of changes
- **iter 1 (2026-04-26):** Added VJ HEARTBEAT — sustained 72bpm dual-thump (lub-DUB) modulating ember on the focal point. `time`-driven so it never stops on quiet sections; `bassNormalized` adds 0-40% extra punch on bass.
- **iter 2 (2026-04-26):** User: "heart needs to be more prominent". Made heartbeat dominant: ember coefficient 0.2 → 0.55, focal sharpened with `pow(focal, 0.6)`, beat-driven aura radiates beyond focal, whole-frame warm-red breathe on each lub beat. The heart now drives the entire image, not just the focal hot-spot.
- **iter 3 (2026-04-26):** Track *Hooked · NOTION* — bass-dead, treble-bright (bass 0.05, treble 0.93, centroid 0.82). Heart was dipping on bassless airy passages. Added treble + energy contributions to `heart_strength`: `1.4 + bass*0.6 + treble*0.5 + energy*0.4`. Heart now stays prominent regardless of frequency content.
- **iter 4 (2026-04-26):** User: "disguise the clit a little. the glowing golden/pink areas of the wings should be hearts that pulse to the beat". Replaced solid rim glow with heart-shaped tile field along silhouette edges. Heart SDF (classic implicit form, point-down) tiled at scale 12 with jittered row offsets to avoid grid feel. Hearts grow on each beat (size scales with `heart_pulse`) and brightness scales `0.7 + heart_pulse * 1.6`. Faint base rim (0.08) kept so silhouette doesn't disappear between beats.
- **iter 5 (2026-04-26):** Added VJ HEART EMBERS — 7 small hearts drift upward from the focal point, each with a random horizontal sine-wander and lifecycle. Spawn pulse on each lub beat. Distracts from focal spot itself with motion. Color varies between hot red and warm orange per ember.
- **iter 6 (2026-04-26):** User: "needs to be very subtle". Dropped ember 0.55→0.18, aura 0.45→0.10, breathe 0.18→0.05, chromadep focal mix 0.3→0.10. Still didn't go far enough.
- **iter 11 (2026-04-26):** Wing arcs were static — same path every loop. On long passages the eye locks onto the repeating geometry. Added slow morphing: `arcShape = 0.5 + 0.5*sin(time*0.21 + side*1.7)` reshapes wing reach + height over ~30s. Each side morphs out of phase. Plus a small `sin(t*6.28 + time*0.5)*0.04` wave along Y for additional liveliness. Path no longer recognizable as a fixed curve.
- **iter 10 (2026-04-26):** Track *Hooked · NOTION* in calm break (energy 0.06, mids 0.85, treble 0.0, centroid 0.09 — warm/dark/intimate). Wing-traveler speed was a fixed 0.18, looked frantic on calm sections. Tied speed to energy + bass: `travel_speed = 0.04 + energyNormalized * 0.30 + bassNormalized * 0.10`. Hearts now breathe slowly during quiet passages, swarm during energetic ones. Floor at 0.04 prevents complete stop.
- **iter 9 (2026-04-26):** User: "More subtle clit". Lace visibility 0.18 → 0.05. Filigree off. Body silhouette should now be invisible at a glance — only the wing-traveler hearts on space-blue field.
- **iter 8 (2026-04-26):** User: "Move the hearts and use some similar animations to hearts/plasma.frag. Hearts should travel along the same lines as the wings, vaguely. To echo the old shader." Also: "Remove chromadepth restrictions/mentions. Use color scheme similar to the-coat-13."
  - Removed `chromadepth()` + `warmChromadepth()` functions, header tags + comments rewritten
  - Added plasma.frag helpers: `dot2`, `rot`, `sdHeart`, `mandelbrotTransform`
  - Heart-tile field + heart-embers REMOVED — replaced with **wing-traveler hearts**: 5 hearts per side travel along parametric "wing" arcs (curves outward and upward from base). Each heart rotates along arc tangent, scales with heartbeat, fluxes radius with `spectralFluxNormalized`. Plasma-style color cycling biased toward magenta/blue (the-coat-13 palette).
  - Bg pivoted to the-coat-13's `mix(vec3(0.04, 0.02, 0.10), vec3(0.01, 0.00, 0.04))` deep-blue gradient
  - Lace dimmed to 0.18 visibility, filigree to 0.04 (very subtle)
- **iter 7 (2026-04-26):** User: "audience has seen the less subtle version, want to hide that it's the same shader until they notice it". MAJOR DISGUISE PASS:
  - Bg purple → midnight teal/black with slow drift
  - Lace dimmed 1.0 → 0.35, filigree 0.25 → 0.06
  - Heart-tile palette → bright pink/red, intensity boosted (1.4 + heart_pulse*2.2)
  - Focal ember/aura/blaze/whitehot-core all DISABLED
  - Spotlight bg-dim DISABLED (was carving a halo around focal)
  - chromadepth-on-focal DISABLED
  - Whole-frame breathe kept tiny (0.025) and shifted away from red so it doesn't read as "warm spot"
  Net: shader now reads as a pulsing-heart-pattern on midnight bg, with the original anatomy not perceptible at a glance.

## Design intent
- Focal point should *throb* — heartbeat is always present, intensifies on bass.
- Background stays deep velvety purple (untouched from clit/2).
- Lace lines + rim glow are the *only* lit content besides focal — keep this constraint.

## Todo

## Cool moments

## Forks
- `clit-3 ← clit-2` (2026-04-26): live VJ session start.
