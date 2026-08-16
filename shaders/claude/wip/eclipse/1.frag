// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: eclipse, corona, totality, space, claude, performance
// @name: totality
//https://visuals.beadfamous.com/?shader=claude/wip/eclipse/1&controller=wavelet-ease&wavelet=true&fullscreen=true&name=Totality
//
// TOTALITY (eclipse/1.frag) — a total solar eclipse that breathes with the music.
//
//   * THE BLACK DISC never moves. Everything happens at its edge and beyond, so the image is
//     instantly readable from across a dark room: a hole in the sky with fire around it.
//   * CORONA — streamers of plasma that flare on BASS and writhe on a monotonic phase. In a
//     quiet passage the reach collapses to a thin pearly ring (real totality darkness); on a
//     drop it erupts to fill the frame. That contrast IS the piece.
//   * BAILY'S BEADS — sunlight through lunar valleys, popping around the limb on transients.
//   * DIAMOND RING — one blazing jewel on the limb with anamorphic flare, creeping around the
//     rim on a monotonic phase, going supernova on the kick.
//   * PROMINENCES — crimson solar flares licking off the limb, driven by the MIDS.
//   * STARS come out in the dark. quietGate fades them in when the room goes quiet and the
//     corona washes them out when it erupts — so silence genuinely looks like silence.
//
// SIGNAL DISCIPLINE (docs/advanced-shader-techniques.md §1, via ?controller=wavelet-ease):
//   - Every continuous quantity reads a spring-smoothed *Spring uniform, never a raw z-score.
//   - Raw transients (waveletBassZScore / wavelet_bassHit) drive AMPLITUDE only — the bead pops,
//     the diamond flare, the dilation punch. They never touch a phase or an angle.
//   - All motion comes from the controller's monotonic accumulators (flowPhase / morphPhase /
//     spinPhase), never iTime*rate, so the drift never appears to accelerate over a set.
//   - Every audio offset is multiplied by quietGate so a quiet room's mic noise can't drive it.
//   - FAMILIES: PITCH (melodyFlow, centroid) → colour. LEVEL (bass/energy) → corona reach.
//     TEXTURE (crest/roughness) → streamer detail + bead sparkle. Radial depth → band (below).
// License: CC BY-NC-SA 3.0

#define PI  3.14159265359
#define TAU 6.28318530718

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;
uniform float waveletBand2Spring;
uniform float waveletBand4Spring;
uniform float waveletBand5Spring;
uniform float waveletCentroidSpring;
uniform float energySpring;
uniform float melodyFlow;
uniform float tonalStrength;
uniform float spectralCrestSmooth;
uniform float spectralRoughnessSmooth;
uniform float flowPhase;
uniform float morphPhase;
uniform float spinPhase;
uniform float quietGate;
uniform float wubDepth;
uniform float evoWarp;
uniform float evoPlasma;
uniform float sectionMode;
uniform float sectionMix;
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient AMPLITUDE only.

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float ehash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = ehash(i), b = ehash(i + vec2(1.0, 0.0));
    float c = ehash(i + vec2(0.0, 1.0)), d = ehash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++){
        v += amp * vnoise(p);
        p = p * 2.03 + 17.1;
        amp *= 0.5;
    }
    return v;
}

// Depth-coherent reactivity, the lattice's bandForDepth laid through the corona instead of a
// raymarch: TREBLE shimmers the near structure at the limb, MIDS the middle, BASS the far
// streamers. t = 0 at the limb → 1 at the outer reach.
float bandForDepth(float t){
    if (t < 0.34) return waveletBand5Spring;
    if (t < 0.67) return waveletBand2Spring;
    return waveletBassSpring;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 scr = fragCoord / iResolution.xy;
    vec2 sp  = scr * 2.0 - 1.0;

    // ── CONDITIONED SIGNALS ── smoothed springs for everything continuous, gated by quietGate.
    float gate = clamp(quietGate, 0.0, 1.0);
    float bass = waveletBassSpring   * gate;
    float mids = waveletBand2Spring  * gate;
    float body = waveletBand4Spring  * gate;
    float air  = waveletBand5Spring  * gate;
    float eng  = energySpring        * gate;
    float grit = spectralRoughnessSmooth * gate;
    float artc = spectralCrestSmooth * gate;                 // articulation / spikiness
    // RAW transient — amplitude only, never a phase (advanced-shader-techniques §1 & §2).
    float kick = clamp(clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.6
                     + clamp(wavelet_bassHit, 0.0, 1.0) * 0.45, 0.0, 1.0) * gate;
    float lift = clamp(eng * 0.65 + artc * 0.45, 0.0, 1.0);  // smooth swell of a build/drop

    // ── SUBWOOFER DILATION ── the whole frame punches in on the hit and springs back out.
    uv *= 1.0 - kick * 0.038 - bass * 0.018;

    float R  = 0.208;                          // the moon. It does not move. Ever.
    float r  = length(uv);
    vec2  dir = uv / max(r, 1e-5);
    float ds = r - R;                          // signed distance from the limb
    float d  = max(ds, 0.0);
    float aa = 1.6 / iResolution.y;
    float outside = smoothstep(R - aa, R + aa, r);

    // ── TWO REACHES ── the LEVEL family, and the whole dynamic range of the piece. Split in two
    //   so a drop erupts as LONG SPIKES against dark sky instead of flooding the frame white:
    //   the halo stays tight to the limb while the rays shoot right out past the edge of frame.
    float glowReach = 0.048 + 0.10 * bass + 0.05 * eng;
    float rayReach  = 0.085 + 0.52 * bass + 0.28 * eng + 0.14 * kick + 0.05 * body;

    // ── STREAMER FIELD ── sampled on the unit direction vector, so it is SEAMLESS around the
    //   circle (no atan branch cut). The radial term slides features OUTWARD along each ray as
    //   flowPhase accumulates — a continuous scroll, no fract() teleport to window away.
    float dens  = 4.3 + evoPlasma * 2.4 + seed3 * 2.0;       // how many streamers (drifts over a set)
    float twist = morphPhase * 0.30 + (seed4 - 0.5) * TAU;   // monotonic writhe
    vec2  nd    = dir * rot2(twist * 0.16 + (evoWarp - 0.5) * 0.3);
    vec2  q     = nd * (dens + r * 0.9 - flowPhase * 0.42);
    float n1    = fbm(q);
    // TEXTURE family → fine filaments; wubDepth fattens the streamers when the bass wobbles.
    float fine  = fbm(q * 2.7 + vec2(7.3, flowPhase * 0.6));
    // HARD SEPARATION between rays — the sky between streamers has to stay dark or a loud
    // section just floods the frame. smoothstep gives real gaps; pow adds the spike taper.
    float lo = 0.34 - wubDepth * gate * 0.06 - grit * 0.03;
    float sk = smoothstep(lo, 0.90, n1);
    float streak = pow(sk, 1.45) * (0.55 + 0.62 * fine);

    float ct   = clamp(d / 0.55, 0.0, 1.0);                  // fixed-scale colour/depth coord
    float band = bandForDepth(ct) * gate;                    // treble near → bass far
    float rays = exp(-d / max(rayReach, 1e-3)) * streak;
    float glow = exp(-d / max(glowReach, 1e-3));             // tight halo hugging the limb
    float ring = exp(-d * 46.0);                             // the razor-thin pearly rim

    // chromatic rays carry the drama; the halo/rim stay warm white so it always reads ECLIPSE
    float rayAmp  = 0.62 + 0.70 * bass + 0.45 * lift + 0.55 * band;
    float glowAmp = 0.34 + 0.30 * air + 0.22 * lift;
    float rimAmp  = 0.55 + 0.50 * air;

    // ── COLOUR ── one continuous journey: white-hot at the limb, gold, then receding through
    //   cyan to violet. The MELODY carries the whole palette through the song (PITCH → COLOUR),
    //   brightness tints it, and a real section change (breakdown→drop) shifts the family.
    float hueBase = 0.075
                  + melodyFlow * 0.22 * gate
                  + waveletCentroidSpring * 0.09 * gate
                  + mod(sectionMode, 5.0) * 0.13 * sectionMix
                  + seed * 0.15;
    float hue = fract(hueBase + ct * 0.46);
    float sat = clamp(0.45 + 0.50 * ct, 0.0, 0.96);
    // lightness kept well under 1 — brightness comes from the AMPLITUDE and the tone-map, so
    // loud reads as saturated colour instead of a white flood.
    float lgt = clamp(0.60 - ct * 0.22, 0.14, 0.62);
    vec3  cCol = hsl2rgb(vec3(hue, sat, lgt));
    vec3  warm = vec3(1.0, 0.90, 0.76);                      // the sun's own white-gold light

    // ── TWILIGHT SKY ── never a pure black void: a deep indigo field plus an atmospheric halo
    //   around the eclipse that swells with the bass, so the screen always emits some light.
    vec3 col = mix(vec3(0.010, 0.014, 0.042), vec3(0.030, 0.020, 0.075),
                   clamp(1.0 - r * 0.9, 0.0, 1.0));
    float halo = exp(-d * 2.6) * (0.055 + 0.19 * bass + 0.12 * lift);
    col += hsl2rgb(vec3(fract(hueBase + 0.46), 0.80, 0.50)) * halo * 0.45 * outside;

    // ── STARS ── they come out in the dark. Strongest when quietGate is low (a genuinely quiet
    //   passage), washed out when the corona erupts, twinkling with the air band.
    vec2  cell = floor(scr * vec2(iResolution.x / iResolution.y, 1.0) * 150.0);
    float sh1 = ehash(cell + 11.3), sh2 = ehash(cell + 41.7);
    vec2  sfr = fract(scr * vec2(iResolution.x / iResolution.y, 1.0) * 150.0)
              - vec2(0.28 + 0.44 * sh1, 0.28 + 0.44 * sh2);
    float sd  = dot(sfr, sfr);
    float twk = 0.5 + 0.5 * sin(iTime * (0.6 + sh1 * 1.7) + sh2 * TAU);
    float star = step(0.962, sh1) * exp(-sd * 26.0) * (0.35 + 0.65 * twk);
    float night = 1.0 - clamp(gate * 0.7, 0.0, 0.8);
    col += vec3(0.80, 0.88, 1.0) * star * night * (0.85 + air * 0.7);

    // ── THE CORONA ITSELF ── chromatic spiky rays + a warm white-gold halo and rim at the limb.
    col += (cCol * rays * rayAmp * 2.1 + warm * glow * glowAmp + warm * ring * rimAmp) * outside;

    // ── PROMINENCES ── crimson tongues of plasma at the limb, placed by a slow seamless noise
    //   around the circle and driven by the MIDS (a different family than the corona's reach).
    float pn = fbm(dir * 6.5 + vec2(31.0, twist * 0.5));
    float prom = smoothstep(0.60, 0.88, pn) * exp(-d * 62.0) * outside;
    col += vec3(1.0, 0.16, 0.30) * prom * (0.30 + 2.3 * mids + 1.3 * kick);

    // ── BAILY'S BEADS ── sunlight through lunar valleys. One bead per angular cell, jittered by
    //   a per-device hash, each twinkling on its own offset of the monotonic flowPhase and
    //   POPPING on the raw transient (amplitude only — the beads never move on a hit).
    float aNorm = atan(uv.y, uv.x) / TAU + 0.5;
    float NB = 19.0;
    float bi = floor(aNorm * NB);
    float bh = ehash(vec2(bi, 3.7) + seed3 * 13.0);
    float bcent = (bi + 0.32 + bh * 0.36) / NB;
    float bArc = (aNorm - bcent) * TAU * R;                 // arc-length offset along the limb
    float bd = bArc * bArc + ds * ds;
    float bph = fract(flowPhase * 0.33 + bh);
    float twinkle = pow(0.5 + 0.5 * sin(bph * TAU), 5.0);
    float bead = exp(-bd * 5200.0) * (0.22 + twinkle * (0.55 + 3.4 * kick + 1.7 * air + 1.1 * artc));
    col += vec3(1.0, 0.96, 0.86) * bead * 1.7;

    // ── DIAMOND RING ── the jewel. Creeps around the limb on a monotonic phase (audio changes
    //   the RATE inside the controller, never the angle here, so it never rocks backwards) and
    //   goes supernova on the kick with an anamorphic flare.
    float dAng = spinPhase * 0.55 + seed * TAU;
    vec2  dpt  = vec2(cos(dAng), sin(dAng)) * R;
    vec2  dv   = uv - dpt;
    float dd   = dot(dv, dv);
    float blaze = 0.30 + 2.9 * kick + 1.2 * lift + 0.8 * artc;
    vec3  dCol  = mix(vec3(1.0, 0.98, 0.92), hsl2rgb(vec3(fract(hueBase + 0.08), 0.7, 0.75)), 0.35);
    col += dCol * exp(-dd * 2600.0) * blaze * 1.9;                                  // core
    col += dCol * exp(-abs(dv.y) * 190.0) * exp(-abs(dv.x) * 4.6) * blaze * 0.55;   // anamorphic streak
    col += dCol * exp(-abs(dv.x) * 240.0) * exp(-abs(dv.y) * 8.0) * blaze * 0.30;   // vertical spike

    // ── AFTERGLOW ── the previous frame sampled slightly INWARD, so light streams outward off
    //   the limb. Low gain (≈0.17/frame) so it can never accumulate to white.
    vec4 prev = getLastFrameColor(scr - dir * 0.0016);
    col = mix(prev.rgb * 0.86, col, 0.82);

    // ── THE MOON ── after the trail, so the disc stays absolutely black and the eclipse always
    //   reads as a hole punched in the sky. A razor rim keeps the edge crisp.
    col *= smoothstep(R - aa * 1.5, R + aa * 0.5, r) * 0.985 + 0.015 * outside;

    // ── EXPOSURE TONE-MAP ── a hard clamp() drives every over-1 channel to the same value and
    //   turns a loud section into a white sheet. An exponential exposure curve compresses each
    //   channel smoothly instead, so a blazing ray stays GOLD/VIOLET rather than going white.
    //   Then a gamma lift so the mid-tones emit on a phone at night.
    col = 1.0 - exp(-max(col, 0.0) * (1.30 + bass * 0.14 + kick * 0.12));
    col = pow(clamp(col, 0.0, 1.0), vec3(0.90));

    col = mix(col, vec3(0.0), dot(sp, sp) * 0.10);           // minimal vignette
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
