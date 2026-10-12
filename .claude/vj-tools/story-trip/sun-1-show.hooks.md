# Trip-story shader hooks for sun-1-show

`apply-hooks.mjs` applies these. It finds each anchor by its text rather than by line number, and fails loudly if an anchor is missing or appears more than once, since sun-1-show is still being edited. On 2026-10-09 it applied cleanly to the sun-1-show file then on disk, and the result passed `__vjValidate` (`ok: true`). The validator rejected a deliberately broken copy, so the check catches real errors.

```bash
node .claude/vj-tools/story-trip/apply-hooks.mjs shaders/claude/wip/black-sun/sun-1-show.frag   # in place
```

The script makes five edits:

1. **K1 no longer sets HOLE SIZE.** In `HOLE_R`, `hrCap((0.16 + knob_1 * 0.10)` becomes `hrCap((0.16 + 0.0 * 0.10)`. K1 now selects the trip story, and without this change setting K1 to 1 would also grow the hole.
2. **New uniforms.** This line goes above the `uniform float bs_heat, …` line:
   `uniform float bs_trip, bs_julia, bs_jR, bs_jTurn, bs_descend, bs_dive, bs_fractal, bs_tripHue;`
3. **Julia arms.**
   - The constant `c` mixes toward `bs_jR · (sin θ, cos θ)`, where `θ = 4.97 + 0.30·sin(2π·bs_jTurn)`. The mix weight is `bs_trip`.
   - The arms' `float S = …;` scale line gains a trailing `* (1.0 + 0.6 * bs_julia * bs_trip)`.
   - `θ` stays in the connected seahorse/octopus band. `bs_jTurn` is a forward clock whose rate the music sets.
4. **`tripGarden(uv)`.** This function goes before `mainImage`. It draws a self-similar Julia sky about the screen centre, never anchored to the sun.
   - **Zoom.** Two octaves at scales `2^(o − fract(bs_dive))` cross-fade with weights `1 − fract` and `fract`, so the dive wraps without a pop.
   - **Colour.** One OKLCH analogous family, ±12° around `bs_tripHue`. The counter-hue `h ± 150°` is folded to stay at or below 300°, so no magenta.
   - **Cost.** 2 × 28 iterations, run only while the garden weight is above 0.003.
5. **Garden mix.** After the `vec3 bg = mix(sky(…), deepSpace(…)…` line, the script adds:
   ```glsl
   float gW = clamp(bs_fractal * bs_trip, 0.0, 1.0);
   if (gW > 0.003) bg = mix(bg, tripGarden(uv0) * (0.75 + 0.5 * bs_bassSus * GATE), gW * 0.8);
   ```
   Bass sustain brightens or dims the garden's light. Audio never moves its geometry.

The shader needs no other changes. The classic story params (`bs_heat`, `bs_size`, `bs_abstract`, `bs_night`, …) already follow the trip acts, and `bs_act` reports each trip act's classic `role`, so the existing act branches respond.

**Performance.** With GARDEN fully in, each pixel runs about 48 arm iterations plus 56 garden iterations. After applying, confirm jank p95 stays under 18 ms on the wall. If it doesn't, lower the garden's inner loop from 28 to 20.
