// @fullscreen: true
// @mobile: false
// moire-eye-2 — Moire tunnel x iris-7 eye. MONOTONIC + OKLCH unified colour.
// The moiré accumulates a single GRAYSCALE intensity field (no rainbow H(), no 2e2/n particle
// dots); it is colourised ONCE via oklch2rgb with one slowly-drifting hue family — coherent
// colour, no multicolour banding, no particles. Motion rides forward phases (spin/flow/hue);
// audio only sets rate. Bass = the one amplitude reaction. Requires &controller=moire-eye.
//
// Knobs: 1 zoom | 2 hue | 3 spin speed | 4 flow speed | 5 hue-drift speed | 6 chroma |
//        7 facet | 9 gazeY | 11 bass-react | 12 gazeX | 13 drop decay | 14 pupil | 15 airglow | 16 outer glow | 19 catchlight
uniform float spin_phase;
uniform float flow_phase;
uniform float hue_phase;
uniform float bass_env;
uniform float drop_env;
uniform float calm_env;

#define A(a) mat2(cos(a*6.2832+vec4(0, -1.5708, 1.5708, 0)))
#define O(x,a,b) ((cos(x*6.2832)*.5+.5)*(a-b)+b)

vec2 hg(vec2 u){ vec2 o=vec2(.5,.866), a=mod(u,o+o)-o, b=mod(u-o,o+o)-o; return dot(a,a)<dot(b,b)?a:b; }

void mainImage( out vec4 C, in vec2 U )
{
    float t = mod(iTime/60., 10.), d = 0., i = d, s, r, n, nt, glow = 0.;
    vec2 R = iResolution.xy;

    float GAZE_STR = (0.35 + knob_19 * 0.65);
    vec2 saccade = vec2(sin(iTime*0.37)+0.5*sin(iTime*0.23), sin(iTime*0.31+1.3)) * 0.010;
    vec2 gaze = vec2(knob_12 - 0.5, knob_9 - 0.5) * 2.0 * GAZE_STR + saccade;
    vec2 mr = gaze * vec2(0.6, 0.5);

    float fov = R.y * (0.45 + knob_1*0.85);
    vec3 o = vec3(0,0,-O(t/2.,80.,110.)), u = normalize(vec3(U-R/2., fov)), p, q;
    mat2 rh = A(mr.x), rv = A(mr.y);

    for (; i++<1e2;) {
        p = o+u*d; p.xz *= rh; p.yz *= rv;
        p.xy *= A(spin_phase);
        r = length(p); p *= sqrt(abs(1. - r*r/1e3));
        float fac = 1.2 + knob_7*1.6; q.xy = p.xy - hg(p.xy/fac)*fac;
        n = length(q); nt = n*t;
        p.z = abs(p.z) - 1. - sin(nt*6.2832 + flow_phase) * (1. + bass_env*0.6*(0.3+knob_11*1.7) + drop_env*0.5);
        s = length(p-q*vec3(1,1,0)) - min(.3, n/1e2) * (-sign(35.-r)*.5+.5);
        d += sqrt(s)*.35;
        glow += min(s, .004*sqrt(d/s)) * O(nt, 1., .72);  // grayscale intensity, softened cell contrast (de-stipple)
        if (s < 1e-3 || d > 1e3) break;
    }
    glow = tanh(glow*glow*glow);

    vec2 ec = (U - .5*R)/R.y - gaze*0.5;
    float er = length(ec);

    float pupilRad = clamp(mix(0.05,0.16,knob_14) * (1.0 + bass_env*0.30*(0.3+knob_11*1.7) + drop_env*0.6), 0.02, 0.30);
    float pupil = smoothstep(pupilRad, pupilRad*1.3, er);
    float irisMask = smoothstep(0.56, 0.46, er);
    float limbal = smoothstep(0.40,0.48,er)*smoothstep(0.54,0.48,er);

    float L = glow;
    L = mix(glow*0.12, L, pupil);     // pupil maw: dim, not pure black
    L *= 1.0 - limbal*0.85;
    L *= irisMask;
    float armZone = smoothstep(0.10,0.22,er)*smoothstep(0.40,0.26,er);
    L *= 1.0 + midsNormalized*armZone*0.4;
    // IRIS FIBRES + shading — fix flatness: radial ciliary striations, crypts, spherical depth (all static, no flash)
    float ang = atan(ec.y, ec.x);
    float fiberN = 50.0 + knob_7*90.0;
    float fibers = 0.5 + 0.5*sin(ang*fiberN + sin(ang*(fiberN*0.5))*1.5);   // 2-octave radial streaks
    float fibAmt = smoothstep(0.09,0.18,er) * smoothstep(0.52,0.34,er);     // fibres live in the stroma band
    L *= mix(1.0, mix(0.5, 1.0, fibers), fibAmt);
    float crypts = pow(0.5+0.5*sin(ang*23.0+1.7), 6.0) * smoothstep(0.16,0.22,er)*smoothstep(0.34,0.28,er);
    L *= 1.0 - crypts*0.5;                                                    // dark crypt pits
    float sphere = 1.0 - smoothstep(0.26,0.52,er)*0.45;                       // eyeball curvature shading (3D depth)
    L *= sphere;
    L *= 1.0 + drop_env*0.5;
    L = clamp(L, 0.0, 1.0);

    // ===== OKLCH unified palette: one hue family, slow drift, warm core =====
    // peach-plasma palette (from magic-peach): hot orange-gold CORE (0.6 rad) -> blue-violet
    // CORONA (4.2 rad) blended by RADIUS = emotional depth (hot inside, cool rim). knob_2 rotates
    // the whole theme; energy pumps saturation (peach SAT_BOOST). hue_phase adds very slow drift.
    float warmth = 1.0 - spectralCentroidNormalized;
    float radialBlend = smoothstep(0.0, 0.52, er);
    float hue = mix(0.6, 4.2, radialBlend) + (knob_2 - 0.5)*3.0 + hue_phase*0.15 + warmth*0.30;
    float satBoost = 0.75 + max(energyZScore, 0.0)*0.45;
    float chroma = (0.14 + knob_6*0.10) * satBoost * (0.6 + 0.4*L);
    float Lc = clamp(L*0.95, 0.0, 0.95);
    vec3 outc = oklch2rgb(vec3(Lc, chroma, hue));

    outc = mix(outc, vec3(Lc), calm_env*0.2);   // breakdown muting

    // collarette: brightness ring in the same hue (no separate colour)
    float aa = atan(ec.y, ec.x);
    float collR = 0.24 + 0.012*sin(aa*15.0);
    float coll = smoothstep(0.018, 0.0, abs(er - collR)) * irisMask;
    outc += oklch2rgb(vec3(0.7, chroma, hue)) * coll * 0.22;

    // airglow rim — same hue family, knob_15
    float airglow = exp(-pow((er - 0.50)*9.0, 2.0)) * (0.07 + bass_env*0.05);
    outc += oklch2rgb(vec3(0.6, 0.10, hue + 1.2)) * airglow * (0.3 + knob_15*1.8);

    // outer stroma glow — same family, knob_16
    float outerBand = smoothstep(0.26,0.42,er)*smoothstep(0.50,0.40,er)*irisMask;
    outc += oklch2rgb(vec3(0.5, chroma, hue)) * outerBand * (0.05 + knob_16*0.20) * (0.6 + bass_env*0.5);

    // catchlight — neutral specular
    vec2 clp = ec - vec2(-0.09, 0.11);
    float catchCore = 1.0 - smoothstep(0.012, 0.030, length(clp));
    float catchGlow = exp(-pow(length(clp)*22.0, 2.0)) * 0.4;
    float catch = (catchCore + catchGlow) * smoothstep(0.46, 0.26, er) * (0.8 + bass_env*0.4);
    outc += vec3(0.9, 0.92, 0.98) * catch;

    C = vec4(clamp(outc, 0.0, 1.0), 1);
}
