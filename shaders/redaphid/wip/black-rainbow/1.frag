// @fullscreen: true
// @tags: rainbow, event-horizon, feedback, mask, claude
//
// Black Rainbow — black-rainbow.png as a region mask, frame-feedback waves
// radiate outward from each black scythe like ripples on a pond, while the
// scythes themselves read as dark cores with a hot edge (event-horizon look).
//
// Open with:
//   http://localhost:6969/?shader=redaphid/wip/black-rainbow/1&image=images/black-rainbow.png

#define TAU 6.2831853
#define PI  3.14159265

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================
#define BASS_PULSE   (max(bassZScore, 0.0))                                   // 0..~1
#define DROP_FLARE   (smoothstep(0.3, 1.0, energyZScore))                     // build/drop
#define PITCH_FLASH  (smoothstep(0.5, 1.0, abs(pitchClassZScore)) * 0.15)
#define COLOR_SPIN   (iTime * 0.04 + knob_2 * 0.5)

// Wave speed / strength (knob-tunable)
#define WAVE_SPEED   (mix(0.005, 0.025, knob_1))   // how far each frame pushes outward
#define WAVE_DECAY   (mix(0.85, 0.985, knob_3))    // 0=instant fade, 1=infinite trails
#define RIM_HEAT     (1.0 + max(energyZScore, 0.0) * 1.2)  // brightness of hot scythe edge

// Scythe singularities (mirrored around x=0)
#define SCYTHE_OFFSET vec2(0.32, -0.05)

// ============================================================================
// IMAGE MASK — classify pixels {scythe, rainbow, alpha}
// PNG channels: dark+opaque → scythe; saturated+opaque → rainbow; white/clear → background
// ============================================================================
vec4 classifyImage(vec2 uv) {
    vec2 res = iResolution.xy;
    float screenAspect = res.x / res.y;
    vec2 c = (uv - 0.5) * 1.05;
    if (screenAspect > 1.0) c.x *= screenAspect;
    else                    c.y /= screenAspect;
    vec2 imgUV = c + 0.5;
    if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) {
        return vec4(0.0);
    }
    vec4 tex = getInitialFrameColor(imgUV);
    float a = tex.a;
    if (a < 0.05) return vec4(0.0);

    float maxC   = max(max(tex.r, tex.g), tex.b);
    float minC   = min(min(tex.r, tex.g), tex.b);
    float chroma = maxC - minC;
    float scythe  = a * (1.0 - smoothstep(0.15, 0.45, maxC));
    float rainbow = a * smoothstep(0.10, 0.30, chroma);
    return vec4(scythe, rainbow, a, 0.0);
}

// Distance from a centered-coord point to the nearest scythe singularity.
// Folds x by abs() so both scythes share the same field — no x=0 seam.
float distToScythe(vec2 centered) {
    vec2 d = vec2(abs(centered.x) - SCYTHE_OFFSET.x, centered.y - SCYTHE_OFFSET.y);
    return length(d);
}

// Direction (unit vec) pointing AWAY from the nearest scythe — the radial outward.
// Has to handle both sides correctly: right side pushes +x, left side pushes -x.
vec2 dirFromScythe(vec2 centered) {
    float xs = sign(centered.x + 1e-4);                            // -1 left, +1 right
    vec2  localCenter = vec2(xs * SCYTHE_OFFSET.x, SCYTHE_OFFSET.y);
    vec2  d = centered - localCenter;
    float r = length(d);
    return d / max(r, 1e-4);
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv  = fragCoord.xy / res.xy;

    // Aspect-aware centered coords; dead center = (0,0)
    vec2 centered = (fragCoord.xy - res * 0.5) / res.y;

    vec4 cls = classifyImage(uv);
    float scythe  = cls.x;
    float rainbow = cls.y;

    // ---- FRAME FEEDBACK: sample last frame, pushed radially OUTWARD from scythe ----
    // Each frame, every pixel reads from a slightly-closer-to-the-scythe position,
    // so colors propagate AWAY from the scythes over time — ripple/wave effect.
    vec2 outward = dirFromScythe(centered);
    float push   = WAVE_SPEED * (1.0 + BASS_PULSE * 1.5);
    // UV offset is opposite the wave direction: to make waves move outward,
    // each pixel samples from a point closer to the scythe (i.e. against outward).
    vec2 prevUV = uv - outward * push;
    vec3 prev   = getLastFrameColor(prevUV).rgb;
    // Decay so waves don't accumulate to white forever
    prev *= WAVE_DECAY;

    // ---- SCYTHE COLOR: dark core with hot orange-red rim (event-horizon look) ----
    // Sample mask with tiny offsets to find the edge — pixels where neighbours
    // straddle the scythe boundary are the "rim".
    float px = 1.0 / min(res.x, res.y);
    float n  = classifyImage(uv + vec2(0.0, px * 1.5)).x;
    float s  = classifyImage(uv - vec2(0.0, px * 1.5)).x;
    float e  = classifyImage(uv + vec2(px * 1.5, 0.0)).x;
    float w  = classifyImage(uv - vec2(px * 1.5, 0.0)).x;
    float edge = abs(n - s) + abs(e - w);   // high near scythe boundary, 0 deep inside
    // Multi-sample dilation to get a wider hot rim
    float rim = clamp(edge * 4.0, 0.0, 1.0);

    // Dark interior + bright rim (oklch: low L for core, high L+chroma for rim)
    float coreL = 0.02;                                              // near-black core
    float rimL  = 0.55 * RIM_HEAT;                                   // hot rim, pumps with energy
    float rimC  = 0.18;
    float rimH  = 0.6 + PITCH_FLASH + COLOR_SPIN;                    // orange base
    vec3  scytheCore = oklch2rgb(vec3(coreL, 0.02, rimH));
    vec3  scytheRim  = oklch2rgb(vec3(min(rimL, 0.95), rimC, rimH));
    vec3  scytheCol  = mix(scytheCore, scytheRim, rim);
    // On drops, the rim flares bright (matter being torn apart)
    scytheCol += oklch2rgb(vec3(0.7, 0.2, rimH)) * rim * DROP_FLARE * 0.6;

    // ---- RAINBOW: keep the original logo, gently pumped on bass ----
    float screenAspect = res.x / res.y;
    vec2 c = (uv - 0.5) * 1.05;
    if (screenAspect > 1.0) c.x *= screenAspect;
    else                    c.y /= screenAspect;
    vec3 rainbowRGB = getInitialFrameColor(c + 0.5).rgb;
    rainbowRGB *= 1.0 + BASS_PULSE * 0.25;

    // ---- COMPOSITE ----
    // Start with the propagated feedback (background + outward-radiating wave history).
    vec3 col = prev;
    // The scythes inject new color into the field each frame — that's what propagates.
    col = mix(col, scytheCol, scythe);
    // Rainbow always on top so the logo stays crisp.
    col = mix(col, rainbowRGB, rainbow);

    // Floor the background so it never goes pure black (avoids the "blob" look).
    // Only applies outside the logo (where neither scythe nor rainbow are present).
    float outsideLogo = 1.0 - max(scythe, rainbow);
    vec3 floorCol = oklch2rgb(vec3(0.04, 0.04, rimH + PI));   // very dim cool tone
    col = max(col, floorCol * outsideLogo * 0.4);

    fragColor = vec4(col, 1.0);
}
