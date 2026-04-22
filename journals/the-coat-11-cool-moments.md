# the-coat-11 — Session Journal

## Status
Iter 9. Live-set starter. Forked from the-coat-3 with full 15-knob layout wired from the start. Lightning / cosmic shockwave / scan-line pulled pre-session. Cron 388f588d firing every minute. User is DJing + twisting knobs live. knob_15 just moved 0→0.142 (first twist) — auto-wire target for next tick.

## Knob map (wired at fork)

| Knob | Role | 0 | 1 |
|---|---|---|---|
| knob_1 | Zoom | Wide | Tight |
| knob_2 | Climax dampener | Muted scene | Full brightness |
| knob_3 | Palette hue shift | Original | Full wheel loop |
| knob_4 | Palette chroma floor | Natural sat | Always saturated |
| knob_5 | Hyperspace tunnel | Off | Full rushing streaks |
| knob_6 | Particle storm | Off | Heavy drifting dots |
| knob_7 | Trails / ghost smear | Crisp | Max feedback |
| knob_8 | Saturation boost | Natural | Neon |
| knob_9 | Star density | Off | Starry sky |
| knob_10 | Fog density | Clear | Cosmic cloud |
| knob_11 | Aurora intensity | Off | Full neon sky |
| knob_12-15 | Reserved / auto-wired as user twists |

## History of changes
- **Pre-session removals** (don't re-add these): LIGHTNING (vertical bolts), COSMIC SHOCKWAVE (large white ring), SCAN LINE (cyan CRT sweep). User flagged all three at fork time.
- **Iter 2:** Removed MERCURY FLOW + CRYSTALLINE FACETS — user: "none of those diamond patches." Both used sine-cross-products or diamond-grid cells that read as artifacting. **Added KNOB_13 = outline/shadow mode** — user wanted a knob to toggle between normal color and shadowy/inked look (moody-octopus Sobel outline pass). knob_13=0 → normal, knob_13=1 → dark + heavy ink outlines.
- **Iter 2b:** Moved outline/shadow mode knob_13 → **knob_12** (user request — "I can't find knob 13").
- **Iter 3:** Removed **BLACK HOLE** block (from the-coat-3's inherited vocab). User reported: "I'm at 0 (knob_12) and it's still a silhouette." Root cause: BLACK HOLE was mixing col → vec3(0) on `bassZScore > 0.3` spikes, then heavy trails (knob_7 at 0.7+) kept the blackness persistent across frames even during quiet sections. Coat would lock into silhouette-only mode and never recover. Fix: pulled the block entirely — silhouette-blackout should be a user choice (knob_12), not an involuntary response to bass transients. v(next) lesson: silhouette-darkening effects must not feed back into feedback without a fast decay.
- **Iter 4:** User: "It was the climax knob! Can we make the two effects orthogonal?" Root cause diagnosis: knob_2 was applying a GLOBAL brightness cap `col *= mix(0.35, 1.0, knob_2)`, which dimmed everything including the base scene. When combined with knob_12=outline (which also darkens) the effects compounded and the scene disappeared. Fix: knob_2 now scales ONLY the payoff effects (god rays, eye wash, eye punch) via per-effect multipliers. Base scene brightness untouched by knob_2. Knobs 2 and 12 now orthogonal — any combination works. v(next) lesson: global-multiplier knobs conflict with other darkening effects. Scale per-effect instead.
- **Iter 9:** User flag: "It's much too dark" (at knob_12=1, full outline). Root cause: the outline-shadow block was dimming the whole frame by ~40% at knob_12=1 (`col *= mix(1.0, 0.35, knob_12 * 0.6)` → 0.61), plus painting ink lines at 0.85 strength. Crushing the scene. Fix: softened to `mix(1.0, 0.75, knob_12 * 0.6)` (knob_12=1 now dims to ~0.85, not 0.61) and dropped ink paint to 0.65. Outline still visible at max, scene no longer crushed. v(next) lesson: outline/shadow-pass darkening scale needs to preserve >75% luminance at max knob, or the silhouette dominates.
- **Iter 11:** User flag: "gray, staticky, bleeding effect somehow related to the last frame." Three prev-frame readers were stacking: (a) main feedback `prev*0.88 → mix(prev, col, feedback_amt)` which is healthy for trails, (b) VJ GHOST ECHO raising feedback_amt to 0.55 on bass spikes (too aggressive with other readers also firing), (c) VJ RGB SPLIT sampling prev-frame R and B channels on `spectralRoughness * spectralEntropy > ~0.08` (firing on busy tracks — channel-separated ghosting reads as gray chromatic bleed), (d) outline smoothstep(0.03, 0.18, edge) catching low-gradient noise and painting ink that itself becomes next-frame's gradient source — feedback loop of gray ink lines. Fix: REMOVED RGB SPLIT entirely (low-value effect, main offender), tightened outline threshold to smoothstep(0.08, 0.22) so only strong edges become ink (kills the gray-static ink creep), capped ghost-echo feedback to 0.35. Main trail feedback preserved. v(next) lesson: multiple prev-frame readers must be budgeted — their visible effects compound multiplicatively and gray static is the signature of low-gated prev-frame sampling over a moving subject.
- **Iter 12:** User flag: "We still get tons of gray static everywhere. Use oklab." iter-11 tightening wasn't enough because the outline's **operation** was the core issue, not just its threshold. The outline was doing two RGB-space ops that desaturate under feedback: (1) `col *= 0.86` (multiplicative dim in RGB desaturates colors over repeated feedback cycles — every trail pass loses chroma), (2) `mix(col, near-black, ink)` (mixing to low-RGB-value gray near-black), AND (3) the gradient was `dot(rgb, vec3(0.33))` — grayscale luminance, a crude approximation that's biased and noisy on perceptually-uniform flats. Fix: rewrote the outline block in **oklab space**. Gradient now samples `rgb2oklab(...).x` (true perceptual L, cleaner gradients, less spurious noise). Edge smoothstep tightened further to (0.14, 0.28). Darkening operates on oklab L only (keeps a/b chroma intact) — no more desaturation leak into trails. Ink overlay reduces L to 15% and mutes a/b by 45% only at strong-gradient sites, so edges get inky but colored flats stay colored. Chroma survives the feedback trail. v(next) lesson: operations that mutate color during prev-frame reads should do so in oklab L/C channels; RGB-space dimming loses chroma multiplicatively under feedback.
- Inherits the-coat-3 baseline: nebula fog, starfield, sub-ring, heart pulse, ghost echo, ember/mercury flow, ground quake, water pool, hyperspace tunnel, mouth glow, warm breath, bouncing body, camera drift, fog pulse, fur shimmer, aurora, black hole, dissolution particles, searchlight, flux hue drift.

## Design hypotheses for v(next)
- Start with the base-shader's minimal vocab + one fully-wired knob layout. Adding motifs mid-VJ works, but starting from a thin baseline + rich knobs = fewer user-flag removals.
