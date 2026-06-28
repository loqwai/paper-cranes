// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: peaceful, ambient, flow, drift, touch, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/drift/1&wavelet=true&controller=gesture-knobs&fullscreen=true&knob_1=0.5&knob_2=0.55&knob_3=0.5&knob_4=0.5&knob_5=0.5&knob_6=0.5&knob_7=0.45&knob_8=0.5&knob_9=0.2&knob_10=0&knob_11=1&name=Drift
// DRIFT (1.frag) — a PEACEFUL new series: a slow, soft flowing field (silk / aurora) in gentle
// Oklch colour. You SHAPE it with gestures via the gesture-knobs controller — each knob is a calm,
// cumulative feature you turn by hand. Audio (if present) only breathes it, never punches.
//
// GESTURE → FEATURE (load ?controller=gesture-knobs):
//   1-finger drag  → knob_1 HUE        | knob_2 BRIGHTNESS
//   2-finger pinch → knob_3 ZOOM
//   2-finger twist → knob_4 FLOW ANGLE
//   2-finger drag  → knob_5 WARP/TURBULENCE | knob_6 SATURATION
//   3-finger drag  → knob_7 FLOW SPEED | knob_8 SOFTNESS (contrast)
//   single tap     → knob_9 PALETTE shift (steps)
//   double tap     → knob_10 GRAIN on/off
//   2-finger tap   → knob_11 GLOW on/off
//   hold + drag    → fine mode (precise)
// License: CC0

#define TAU 6.28318530718
#define PI  3.14159265359

// ── gentle audio (wavelet-ease via gesture-knobs); 0 with no mic → time-only peaceful flow ──
uniform float waveletBassSpring;     // a slow swell of the warp (breathing)
uniform float energySpring;          // a faint lightness lift
uniform float waveletCentroidSpring; // a faint warmth shift
uniform float melodyFlow;            // a slow hue drift
uniform float quietGate;             // gate so a silent room stays perfectly calm

vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 res = iResolution.xy;
    vec2 uvN = (fragCoord - 0.5 * res) / res.y;     // centred, aspect-correct
    vec2 scr = fragCoord / res;

    // ── CONTROLLABLE FEATURES (each a gesture-knob; defaults centred so it's calm out of the box) ──
    float HUE      = knob_1;                          // base hue (0..1 wheel)
    float BRIGHT   = mix(0.32, 0.86, knob_2);         // overall lightness
    float ZOOM     = mix(1.2, 6.0, knob_3);           // pattern scale (more bands across the frame)
    float ANGLE    = (knob_4 - 0.5) * TAU;            // flow rotation
    float WARP     = mix(0.0, 0.95, knob_5);          // turbulence
    float SAT      = mix(0.03, 0.17, knob_6);         // chroma (kept low → soft pastels)
    float SPEED    = mix(0.0, 0.35, knob_7);          // flow speed (peaceful = slow)
    float SOFT     = mix(0.45, 1.7, knob_8);          // contrast / softness
    float PAL      = knob_9 * 0.6;                    // palette shift
    float GRAIN    = step(0.5, knob_10);              // film grain on/off
    float GLOW     = step(0.5, knob_11);              // soft glow on/off

    // ── SLOW FLOW FIELD ── domain-warped layered sines → organic silk/aurora movement ──
    vec2 p = rot(uvN, ANGLE) * ZOOM;
    float t = iTime * (0.10 + SPEED);                // always a gentle base drift
    float warp = WARP * (1.0 + waveletBassSpring * 0.35 * quietGate);  // bass softly swells the warp
    vec2 q = p;
    q += warp * 0.55 * vec2(sin(p.y * 1.7 + t),        cos(p.x * 1.5 - t * 0.8));
    q += warp * 0.32 * vec2(sin(q.y * 3.1 - t * 0.6),  cos(q.x * 2.7 + t * 0.5));
    q += warp * 0.16 * vec2(sin(q.y * 5.3 + t * 0.4),  cos(q.x * 4.9 - t * 0.3));

    // soft, flowing bands (aurora curtains) — a warped coordinate makes several waving ribbons
    float a = sin(q.x * 3.6 + sin(q.y * 2.3 + t * 0.4) * 1.6 + t * 0.25);
    float b = sin(q.y * 3.0 - q.x * 1.7 - t * 0.2);
    float field = 0.5 + 0.30 * (a + b);
    field = pow(clamp(field, 0.0, 1.0), SOFT);       // softness/contrast

    // ── GENTLE OKLCH COLOUR ── low chroma, smooth lightness; hue drifts slowly along the flow ──
    float hue = (HUE + PAL + field * 0.34
               + melodyFlow * 0.05 * quietGate
               + waveletCentroidSpring * 0.04 * quietGate) * TAU;
    float L = clamp(BRIGHT * (0.55 + 0.45 * field) + energySpring * 0.05 * quietGate, 0.04, 0.95);
    float C = SAT * (0.7 + 0.55 * field);
    vec3 col = oklch2rgb(vec3(L, C, hue));

    // ── SOFT GLOW ── a creamy bloom from a complementary, brighter wash of the field ──
    if (GLOW > 0.5){
        float halo = smoothstep(0.3, 1.0, field);
        col += oklch2rgb(vec3(min(L + 0.18, 0.95), C * 0.8, hue + 0.4)) * halo * 0.16;
    }

    // ── SILKY FEEDBACK ── heavy persistence so motion is dreamy and smooth (the peaceful core) ──
    vec3 prev = getLastFrameColor(scr).rgb;
    col = mix(prev * 0.985, col, 0.62);   // a light dreamy persistence; the flow structure stays visible

    // ── optional FILM GRAIN ── a faint analog texture
    if (GRAIN > 0.5){
        float g = fract(sin(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5;
        col += g * 0.03;
    }

    // soft vignette — a calm frame
    col *= 1.0 - dot(uvN, uvN) * 0.18;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
