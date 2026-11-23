// ============================================================================
// OKLCH HARMONY KIT — hue is in TURNS (0..1) everywhere in this kit.
// Builds on the wrapper's rgb2oklab/oklab2rgb (Ottosson matrices, LINEAR sRGB in/out).
// Public functions take and return DISPLAY sRGB (gamma-encoded), like fragColor.
// ============================================================================
#ifndef TAU
#define TAU 6.28318530718
#endif
#ifndef PI
#define PI 3.14159265359
#endif
#define KIT_CMAX 0.14
#define HARM_W   0.09

vec3 srgb2lin(vec3 c) {
    c = max(c, 0.0);
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 lin2srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hwrap(float d) { return d - floor(d + 0.5); }
vec3 lchT(float L, float C, float h) { return vec3(L, C * cos(TAU * h), C * sin(TAU * h)); }

// GAMUT: pull toward the same-L grey just far enough to fit, then once more after shrinking
// chroma in OKLab, so L and hue stay put. Continuous in the input: no clipped flats, no bands.
float gamutT(vec3 c, float g) {
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        if (c[i] > 1.0) t = min(t, (1.0 - g) / (c[i] - g));
        if (c[i] < 0.0) t = min(t, g / (g - c[i]));
    }
    return max(t, 0.0);
}
vec3 okFit(vec3 lab) {
    lab.x = clamp(lab.x, 0.0, 0.999);
    float g = lab.x * lab.x * lab.x;
    lab.yz *= gamutT(oklab2rgb(lab), g);
    vec3 c = oklab2rgb(lab);
    return clamp(vec3(g) + (c - vec3(g)) * gamutT(c, g), 0.0, 1.0);
}
vec3 okOut(vec3 lab) { return lin2srgb(okFit(lab)); }

vec3 oklch2rgb(float L, float C, float h) { return okOut(lchT(L, C, h)); }
vec3 srgb2oklch(vec3 rgb) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    return vec3(lab.x, length(lab.yz), fract(atan(lab.z, lab.y + 1e-7) / TAU));
}

// 4 keys, smoothstep-held: lingers on each key, glides between (C1, no bands). Mixed in OKLab,
// so a far hue jump passes through soft low chroma instead of a rainbow.
vec3 ramp4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    float x = clamp(t, 0.0, 1.0) * 3.0;
    return mix(mix(mix(a, b, smoothstep(0.0, 1.0, x)), c, smoothstep(1.0, 2.0, x)), d, smoothstep(2.0, 3.0, x));
}
float palCycle(float t) { return 0.5 - 0.5 * cos(TAU * t); }   // any t → seamless 0..1..0 for non-cyclic palettes

vec3 palAnalogousLab(float t, float baseH, float spread) {
    float s = smoothstep(0.0, 1.0, t);
    return lchT(mix(0.52, 0.80, s), 0.13 - 0.03 * abs(2.0 * s - 1.0), baseH + spread * (s - 0.5));
}
vec3 palSplitCompLab(float t, float baseH) {   // cyclic: t=0 and t=1 are the same colour
    vec3 dom = lchT(0.70, 0.13, baseH);
    return ramp4(dom, lchT(0.80, 0.085, baseH + 5.0 / 12.0), lchT(0.58, 0.08, baseH + 7.0 / 12.0), dom, t);
}
vec3 palTriadSoftLab(float t, float baseH) {   // cyclic
    vec3 dom = lchT(0.72, 0.11, baseH);
    return ramp4(dom, lchT(0.60, 0.07, baseH + 1.0 / 3.0), lchT(0.80, 0.06, baseH + 2.0 / 3.0), dom, t);
}
vec3 palMonoRampLab(float t, float baseH) {
    float s = clamp(t, 0.0, 1.0);
    return lchT(mix(0.45, 0.85, s), 0.04 + 0.09 * sin(PI * s), baseH + 0.03 * (s - 0.5));
}

vec3 palAnalogous(float t, float baseH, float spread) { return okOut(palAnalogousLab(t, baseH, spread)); }
vec3 palSplitComp(float t, float baseH) { return okOut(palSplitCompLab(t, baseH)); }
vec3 palTriadSoft(float t, float baseH) { return okOut(palTriadSoftLab(t, baseH)); }
vec3 palMonoRamp(float t, float baseH) { return okOut(palMonoRampLab(t, baseH)); }

// warmth 0..1 pulls the base hue toward saffron (~68°) the short way; chroma 0..1 walks
// mono → analogous → split-complement and scales chroma 0.55..1.
vec3 palMood(float t, float baseH, float warmth, float chroma) {
    float h = baseH + 0.6 * clamp(warmth, 0.0, 1.0) * hwrap(0.19 - baseH);
    float c = clamp(chroma, 0.0, 1.0);
    vec3 lab = mix(palMonoRampLab(t, h), palAnalogousLab(t, h, 0.14), smoothstep(0.0, 0.5, c));
    lab = mix(lab, palSplitCompLab(t, h), smoothstep(0.5, 1.0, c));
    lab.yz *= 0.55 + 0.45 * c;
    return okOut(lab);
}

// Squeeze any colour's hue into the ±HARM_W window around baseH; the far side of the wheel also
// loses chroma (hides the wrap seam), and chroma soft-saturates at KIT_CMAX.
vec3 harmonize(vec3 rgb, float baseH, float amt) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    float a = clamp(amt, 0.0, 1.0);
    float C = length(lab.yz);
    float d = hwrap(atan(lab.z, lab.y + 1e-7) / TAU - baseH);
    float h = baseH + mix(d, clamp(d, -HARM_W, HARM_W), a);
    C *= 1.0 - 0.6 * a * smoothstep(0.25, 0.5, abs(d));
    C = mix(C, C * inversesqrt(1.0 + C * C / (KIT_CMAX * KIT_CMAX)), a);
    return okOut(lchT(lab.x, C, h));
}
// Keep hue and L; drain chroma from colours that sit off-scheme.
vec3 desatTowardScheme(vec3 rgb, float baseH, float amt) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    float d = hwrap(atan(lab.z, lab.y + 1e-7) / TAU - baseH);
    lab.yz *= 1.0 - clamp(amt, 0.0, 1.0) * smoothstep(0.06, 0.30, abs(d));
    return okOut(lab);
}
