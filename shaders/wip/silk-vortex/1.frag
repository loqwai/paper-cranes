// @fullscreen: true
// @mobile: true
// @tags: silk, vortex, tunnel, oklch, ember, teal
// preset: https://visuals.beadfamous.com/?shader=wip/silk-vortex/1
//
// SILK VORTEX/1. The worked example of the `shader` skill (.agents/skills/shader), written from the
// skill alone. Ember silk ribbons line a slow vortex that you drift down forever. Shader only, no
// controller.
//
// Motion is all one-way clocks whose periods divide the 1000 s iTime wrap, so nothing jumps after
// 16.7 minutes: TRAVEL (inward, 200 s per tile), ROLL (one turn per 250 s), WEAVE (warp drift, 500 s).
// Audio never touches coordinates or phases. It lights the silk: bass sustain thickens the ribbons,
// the kick flares the rims, the snare throws sparks, hats glint, treble lights stars in the void.
// Colour follows only slow medians. Every knob at 0 is the home look.
//
// KNOBS (all 0 = home)
//   K1 FLOW     travel speed, 1x .. 3x (a constant rate, never audio)
//   K2 DENSITY  ribbon count around the vortex
//   K3 HUE      amber -> gold -> lime base hue; the teal half follows (stays out of the magenta arc)
//   K4 REACT    audio light gain, 1x .. 2.5x

#define PI 3.14159265359
#define TAU 6.28318530718

// ============================================================================
// KNOBS
// ============================================================================
#define FLOW (1.0 + floor(knob_1 * 2.0 + 0.5))            // K1 FLOW (1x, 2x, 3x: integers keep the 1000 s wrap seamless)
#define DENSITY (3.0 + floor(knob_2 * 3.0 + 0.5))         // K2 DENSITY (3 .. 6 ribbon tiles around)
#define HUE_KNOB (knob_3 * 0.14)                          // K3 HUE (turns added to the base hue)
#define REACT (1.0 + knob_4 * 1.5)                        // K4 REACT (audio light gain)

// ============================================================================
// CLOCKS: one-way, periods divide 1000 s. Audio never enters these.
// ============================================================================
#define TRAVEL (iTime * FLOW / 200.0)     // tiles of depth per second; 1000 s = 5*FLOW whole tiles
#define ROLL   (iTime * TAU / 250.0)      // 4 whole turns per 1000 s
#define WEAVE  (iTime / 500.0)            // warp drift, 2 whole tiles per 1000 s

// ============================================================================
// CONDITIONED AUDIO (swap any line for its constant twin to isolate it)
// ============================================================================
#define PRESENCE smoothstep(0.0008, 0.006, energy)                       // 0 in silence, 1 with music
#define Z(x) (clamp(x, -1.0, 1.0) * PRESENCE)

#define BODY (bassNormalized * PRESENCE)                                 // sustained bass: ribbon thickness
// #define BODY 0.0
#define KICK (onsetKick * PRESENCE)                                      // kick envelope: rim flare
// #define KICK 0.0
#define SNARE (onsetSnare * PRESENCE)                                    // snare envelope: sparks
// #define SNARE 0.0
#define HAT (onsetHat * PRESENCE)                                        // hat envelope: glints
// #define HAT 0.0
#define CHROMA_LIFT (midsNormalized * PRESENCE)                          // mids: silk chroma
// #define CHROMA_LIFT 0.0
#define DETAIL (spectralEntropyNormalized * PRESENCE)                    // entropy: filament detail
// #define DETAIL 0.0
#define GRIT max(Z(spectralRoughnessZScore - energyZScore * 0.3), 0.0)   // roughness, decorrelated: grain
// #define GRIT 0.0
#define STARS max(Z(trebleZScore - energyZScore), 0.0)                   // treble character: stars in the void
// #define STARS 0.0
#define PEARL (spectralCrestNormalized * PRESENCE)                       // crest: pearl density on crests
// #define PEARL 0.0
#define BUILD clamp(energySlope * energyRSquared * 40.0 * PRESENCE, 0.0, 1.0) // confident build: rim reach
// #define BUILD 0.0
#define WARMTH spectralCentroidMedian                                    // slow: base hue warmth
// #define WARMTH 0.5
#define KEY pitchClassMedian                                             // slow: base hue key
// #define KEY 0.25

// ============================================================================
// OKLCH KIT (docs/oklch-palettes.md): hue in turns, display sRGB out, gamut-fit
// ============================================================================
vec3 lin2srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 lchT(float L, float C, float h) { return vec3(L, C * cos(TAU * h), C * sin(TAU * h)); }
float gamutT(vec3 c, float g) {
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        if (c[i] > 1.0) t = min(t, (1.0 - g) / (c[i] - g));
        if (c[i] < 0.0) t = min(t, g / (g - c[i]));
    }
    return max(t, 0.0);
}
// OKLab -> LINEAR sRGB inside the gamut (chroma shrinks; channels never clip)
vec3 okFit(vec3 lab) {
    lab.x = clamp(lab.x, 0.0, 0.999);
    float g = lab.x * lab.x * lab.x;
    lab.yz *= gamutT(oklab2rgb(lab), g);
    vec3 c = oklab2rgb(lab);
    return clamp(vec3(g) + (c - vec3(g)) * gamutT(c, g), 0.0, 1.0);
}
vec3 palAnalogousLab(float t, float baseH, float spread) {
    float s = smoothstep(0.0, 1.0, t);
    return lchT(mix(0.52, 0.80, s), 0.13 - 0.03 * abs(2.0 * s - 1.0), baseH + spread * (s - 0.5));
}

// ============================================================================
// PERIODIC VALUE NOISE: tiles every `per` cells, so the vortex has no seam in depth or angle
// ============================================================================
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pnoise(vec2 p, vec2 per) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(mod(i, per));
    float b = hash21(mod(i + vec2(1.0, 0.0), per));
    float c = hash21(mod(i + vec2(0.0, 1.0), per));
    float d = hash21(mod(i + vec2(1.0, 1.0), per));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// 4 octaves, each tiling on the same period (mobile: 4 noise calls per sample)
float fbm(vec2 p, vec2 per, float detail) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
        float w = i == 3 ? (0.35 + 0.65 * detail) : 1.0;   // entropy only adds fine filament, never moves the silk
        s += a * w * pnoise(p, per);
        p *= 2.0; per *= 2.0; a *= 0.5;
    }
    return s;
}

// Two cheap octaves for the domain warp: it only bends the silk, fine detail there is wasted work
float fbm2(vec2 p, vec2 per) { return 0.5 * pnoise(p, per) + 0.25 * pnoise(p * 2.0, per * 2.0); }

// The silk height field on the vortex torus: q.x = depth (tiles), q.y = angle (tiles around).
// The warp w is computed once per pixel and shared by the rim sample (it barely changes over e).
vec2 silkWarp(vec2 q, vec2 per) { return vec2(fbm2(q, per), fbm2(q + vec2(3.1, 1.7), per)) * 1.33; }
float silk(vec2 q, vec2 w, vec2 per, float detail) {
    return fbm(q + 1.6 * w + vec2(0.0, WEAVE * per.y), per, detail);   // WEAVE: whole tiles per wrap
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float r = length(uv) + 1e-4;

    // Log-polar vortex. depth: whole tiles per TRAVEL unit; angle: DENSITY tiles around, plus ROLL
    vec2 per = vec2(4.0, DENSITY * 2.0);
    float depth = (log(r) * 1.1 - TRAVEL) * per.x;
    float ang = (atan(uv.y, uv.x) + ROLL) / TAU * per.y;
    vec2 q = vec2(depth, ang + 0.35 * sin(TAU * depth / per.x));  // a twist that is periodic in depth

    float detail = DETAIL;
    vec2 w = silkWarp(q, per);
    float h = silk(q, w, per, detail);
    // directional-derivative rim light (the plasma.frag trick): light comes from the outer edge
    float e = 0.08;
    float hd = silk(q + vec2(-e, e * 0.5), w, per, detail);
    float rim = clamp((h - hd) * 6.0, 0.0, 1.0);

    // Ribbons: bands of the height field. Bass thickens them (light/coverage, not position)
    float thick = 0.10 + 0.09 * BODY * REACT;
    float hb = h * 3.0;
    float band = 1.0 - smoothstep(thick, thick + 0.05, abs(fract(hb) - 0.5));
    float crest = smoothstep(0.62, 0.8, h);
    // Two halves of the scheme as two spiral arms down the vortex (periodic in depth and angle, so
    // no seam): ember/gold on one arm, teal on the other, blending through gold-green, never magenta.
    float odd = smoothstep(-0.35, 0.35, sin(TAU * (2.0 * q.y / per.y + q.x / per.x)));

    // Slow colour. OKLab hue in turns: red 0.08, amber 0.15, gold 0.25, green 0.40, teal 0.55,
    // blue 0.70, violet 0.80, magenta 0.90. Base stays in ember..gold; accents stay off 0.83..0.04.
    float baseH = 0.11 + 0.06 * clamp(WARMTH, 0.0, 1.0) + 0.03 * fract(KEY + seed * 0.5) + HUE_KNOB;
    float drift = 0.05 * sin(TAU * q.x / per.x);                                 // hue varies with depth, periodic
    float ribbonH = mix(baseH + drift, baseH + 0.42 + drift * 0.5, odd);         // ember/gold ribbons, teal ribbons
    vec3 silkLab = palAnalogousLab(h, ribbonH, 0.10);
    silkLab.x *= 0.62 + 0.38 * h;                                                // shade in OKLab L, not by an RGB multiply
    silkLab.yz *= 1.05 + 0.5 * CHROMA_LIFT * REACT;                              // mids lift chroma (okFit keeps it in gamut)
    vec3 rimLab = lchT(0.88, 0.11, mix(baseH + 0.44, baseH + 0.02, odd));       // each ribbon's rim is the other half
    float gas = fbm2(q * 0.5 + 9.0, per * 0.5) * 1.33;                            // faint violet veil in the void
    vec3 voidLab = lchT(0.10 + 0.10 * gas * gas, 0.04 + 0.05 * gas, 0.68 + 0.08 * gas);

    // Composite in LINEAR light (okFit returns linear sRGB); encode once at the end
    float far = smoothstep(0.03, 0.30, r);                                      // dark far core hides the singularity
    float fog = smoothstep(0.0, 1.0, r * 0.9);                                  // ribbons fade toward the core
    vec3 col = okFit(voidLab) * (0.5 + 0.5 * fog);
    vec3 silkCol = okFit(silkLab);
    col = mix(col, silkCol, band * far * (0.55 + 0.45 * fog));

    // Rims: always lit a little; the kick flares them, a confident build lengthens their reach
    float rimAmt = rim * band * far * (0.45 + (0.8 * KICK + 0.5 * BUILD) * REACT);
    col += okFit(rimLab) * rimAmt * 0.6;

    // Sparks (snare) and pearls (crest) on ribbon crests, cell-sized so they never alias
    vec2 cell = floor(q * vec2(3.0, 2.0));
    float rnd = hash21(mod(cell, per * vec2(3.0, 2.0)));
    vec2 cf = fract(q * vec2(3.0, 2.0)) - 0.5;
    float dot1 = smoothstep(0.22, 0.0, length(cf));
    float spark = dot1 * crest * band * step(1.0 - (0.08 + 0.5 * SNARE * REACT), rnd);
    float pearl = dot1 * crest * step(1.0 - 0.15 * PEARL, fract(rnd * 7.13));
    col += okFit(lchT(0.92, 0.08, baseH + 0.06)) * (spark * 0.9 + pearl * 0.35) * far;

    // Glints (hats): the rim brightens in a sparse set of cells
    float glint = HAT * REACT * rim * step(0.82, fract(rnd * 3.7)) * band;
    col += okFit(lchT(0.95, 0.04, baseH + 0.48)) * glint * 0.5 * far;

    // Stars in the void (treble character), fixed to the vortex so they stream inward with it
    vec2 sc = floor(q * vec2(6.0, 5.0));
    float sr = hash21(mod(sc, per * vec2(6.0, 5.0)) + 7.0);
    float star = step(0.985 - 0.02 * STARS, sr) * smoothstep(0.3, 0.0, length(fract(q * vec2(6.0, 5.0)) - 0.5));
    col += okFit(lchT(0.88, 0.05, 0.6)) * star * (1.0 - band) * far * (0.35 + 0.65 * STARS);

    // Grain (roughness): a fixed canvas grain, so it never flickers frame to frame
    col *= 1.0 + 0.14 * GRIT * (hash21(floor(fragCoord * 0.5)) - 0.5);

    // One hue-preserving soft knee for the whole frame, then a single sRGB encode
    float m = max(max(col.r, col.g), col.b);
    float knee = m < 0.75 ? m : 0.75 + 0.25 * (1.0 - exp(-(m - 0.75) / 0.25));
    col *= knee / max(m, 1e-4);
    fragColor = vec4(lin2srgb(col), 1.0);
}
