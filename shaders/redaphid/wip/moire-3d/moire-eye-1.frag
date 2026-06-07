// @fullscreen: true
// @mobile: false
// moire-eye — fusion of ChunderFPV "Moire 3d template" (hex-sphere tunnel) with the
// iris-7 EYE anatomy (claude/wip/iris/7). The moiré tunnel reads as the iris stroma +
// pupil-tunnel spiraling inward; iris-7's layers are ported in screen-radial space (no
// dodeca-bloom controller needed): dark pupil aperture, limbal ring, black void outside
// the eye, warm-gold heterochromia core, gaze (knob_12 X / knob_9 Y), white catchlight.
//
// Knobs (iris-7 convention, bipolar gaze centred at 0.5):
//   knob_9  gaze Y      knob_12 gaze X      knob_14 pupil size
//   knob_2  iris hue tint   knob_19 catchlight + gaze strength

#define A(a) mat2(cos(a*6.2832+vec4(0, -1.5708, 1.5708, 0)))  // rotate
#define O(x,a,b) ((cos(x*6.2832)*.5+.5)*(a-b)+b)  // oscillate x between a & b
#define H(v) O(radians(vec3(0, 60, 120))+(v), 1., 0.)  // hue

// hex grid ( from FabriceNeyret2 )
vec2 hg(vec2 u)
{
    vec2 o = vec2(.5, .866),
         a = mod(u,   o+o)-o,
         b = mod(u-o, o+o)-o;
    return dot(a,a) < dot(b,b) ? a : b;
}

void mainImage( out vec4 C, in vec2 U )
{
    float t = mod(iTime/60., 10.), // 60 sec between ints, repeat after 10
          d = 0., i = d, s, r, n, nt;

    vec2 R = iResolution.xy;

    // === GAZE (iris-7 convention) — the whole eye looks toward (gx, gy). ===
    float GAZE_STR = (0.35 + knob_19 * 0.65);
    // micro-saccade: real eyes drift even when fixated. Incommensurate freqs never loop.
    vec2  saccade = vec2(sin(iTime*0.23), sin(iTime*0.19+1.3)) * 0.006; // slow smooth drift only (no flux twitch)
    vec2  gaze = vec2(knob_12 - 0.5, knob_9 - 0.5) * 2.0 * GAZE_STR + saccade;
    vec2  m = gaze * vec2(0.6, 0.5);                 // camera rotation = eyeball turning

    vec3 o = vec3(0, 0, -O(t/2., 80., 110.)), // camera dolly
         u = normalize(vec3(U-R/2., R.y*(0.45 + knob_1*0.85))), // coords + knob_1 ZOOM
         c = vec3(0), p, q;

    mat2 rh = A(m.x), // rotate horizontal
         rv = A(m.y); // rotate vertical

    for (; i++<1e2;) // raymarch loop
    {
        p = o+u*d;
        p.xz *= rh;
        p.yz *= rv;
        //p.xy *= A(.5/p.z); // twist
        r = length(p); // radius
        p *= sqrt(abs(1. - r*r/1e3)); // coord transform
        q.xy = p.xy - hg(p.xy/2.)*2.; // xy to hex
        n = length(q); // pattern
        nt = n*t; // multiply with time
        p.z = abs(p.z) - 1. - sin(nt*6.2832) * (1. + bassNormalized*0.25); // move z + gentle bass swell
        s = length(p-q*vec3(1,1,0)) - min(.3, n/1e2) * (-sign(35.-r)*.5+.5); // spheres

        d += sqrt(s)*.35;
        c += min(s, .004*sqrt(d/s)) * H(nt + spectralEntropyNormalized*sin(n*40.+t*6.2832)*0.08) * O(nt, 1., .3) * min(1., 2e2/n); // color + entropy stroma shimmer
        if (s < 1e-3 || d > 1e3) break;
    }

    // ===== EYE ANATOMY (ported from iris-7, adapted to screen-radial) =====
    // gaze-shifted, aspect-correct centred coordinate. er ~ 0 centre, ~0.5 top/bottom edge.
    vec2 ec = (U - .5*R)/R.y - gaze*0.5;
    float er = length(ec);

    // pupil: dark aperture at centre, dilates on bass swell (the moiré tunnel reads as the
    // ribbed pupil-tunnel spiraling in; we carve it to black at the very centre).
    float pupilRad = mix(0.05, 0.16, knob_14) * (1.0 + bassNormalized*0.12); // gentle bass dilation (de-twitch: removed energyZ)
    float pupil    = smoothstep(pupilRad, pupilRad*1.3, er);   // 0 in pupil, 1 outside

    // iris extent: limbal ring darkens the outer edge, void beyond.
    float irisMask = smoothstep(0.56, 0.46, er);               // 1 iris -> 0 void
    float limbal   = smoothstep(0.40, 0.48, er) * smoothstep(0.54, 0.48, er);  // dark limbal band at outer edge

    vec3 col = c;
    // pupil maw: not pure black — a faint dark-red moiré tunnel bleeds in (iris-7 ribbed-maw look)
    vec3 maw = c * vec3(0.55, 0.12, 0.06) * (0.10 + (1.0 - spectralCentroidNormalized)*0.12);   // pupil maw glows deeper red on dark passages
    col = mix(maw, col, pupil);          // pupil center = maw, outside = iris
    col *= 1.0 - limbal*0.85;           // deep dark limbal frame
    col *= irisMask;                    // black void outside the eye

    // warm-gold heterochromia core (iris-7 signature): pull the inner stroma toward gold,
    // knob_2 tints the whole iris.
    float coreW = smoothstep(0.30, 0.05, er);
    float warmth = 1.0 - spectralCentroidNormalized;   // dark/bassy = warm, bright = cool
    vec3  goldTint = vec3(1.25 + warmth*0.40, 1.05, 0.65 - warmth*0.35) + vec3(sin(knob_2*6.2832))*0.15;
    col = mix(col, col * goldTint, coreW*(0.20 + knob_6*0.90)); // knob_6 = gold-core strength

    // mids -> stroma "arms": the mid-iris fiber band gets lush/brighter on strong mid-range.
    float armZone = smoothstep(0.10, 0.22, er) * smoothstep(0.40, 0.26, er);
    col *= 1.0 + midsNormalized * armZone * 0.25;

    // calm breath: slow iris swell on quiet passages only (energy-gated; vanishes when busy)
    float calm = 1.0 - clamp(energyNormalized*2.0, 0.0, 1.0);
    col *= 1.0 + calm * 0.12 * sin(iTime*0.8);
    vec3 outc = tanh(col*col*col);

    // outer stroma glow — STATIC, no flicker (replaced twinkly sparkle per "reduce flickering"). knob_16 intensity.
    float outerBand = smoothstep(0.26, 0.42, er) * smoothstep(0.50, 0.40, er) * irisMask;
    outc += vec3(0.55, 0.62, 0.75) * outerBand * (0.04 + knob_16*0.16);

    // collarette: the iris's wavy mid-ring crinkle (pupillary|ciliary boundary). Pitch tints it.
    float aa = atan(ec.y, ec.x);
    float collR = 0.24 + 0.012*sin(aa*15.0);
    float coll = smoothstep(0.018, 0.0, abs(er - collR)) * irisMask;
    vec3  collHue = 0.55 + 0.45*cos(6.2832*(pitchClassNormalized + vec3(0.0, 0.33, 0.66)));
    outc += collHue * coll * 0.22;

    // "Blue Airglow" theme: faint cyan airglow halo bleeding into the void around the iris.
    float airglow = exp(-pow((er - 0.50)*9.0, 2.0)) * (0.07 + max(trebleZScore, 0.0)*0.05 + trebleNormalized*0.05); // tighter shimmering rim (trimmed from a frame-filling cloud)
    outc += vec3(0.15, 0.45, 0.60) * airglow;

    // (Voight-Kampff scanline removed — user request)

    // catchlight: bright cool-white specular, upper-left, tracks gaze (real-eye cue).
    // Pulses on bass — a wet eye glinting on each hit.
    vec2 clp = ec - vec2(-0.09, 0.11);
    float catchCore = 1.0 - smoothstep(0.012, 0.030, length(clp));
    float catchGlow = exp(-pow(length(clp)*22.0, 2.0)) * 0.4;   // soft wet-eye bloom around the glint
    float catch = (catchCore + catchGlow)
                * smoothstep(0.46, 0.26, er)
                * (0.85 + bassNormalized*0.25); // gentle bass glint (de-twitch)
    outc += vec3(0.85, 0.88, 0.98) * catch;

    // TEMPORAL SMOOTHING — blend with previous frame to kill the per-frame moiré flicker.
    // knob_13 = anti-flicker strength (0 = light, 1 = heavy persistence). This is the real fix.
    vec2 uvp = U / R;
    vec3 prevF = getLastFrameColor(uvp).rgb;
    float fb = mix(0.55, 0.18, knob_13);   // blend factor toward NEW frame; lower = smoother
    outc = mix(prevF, outc, fb);
    C = vec4(clamp(outc, 0.0, 1.0), 1);
}
