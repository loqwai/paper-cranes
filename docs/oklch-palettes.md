# OKLCH harmony kit

A small GLSL ES 3.0 kit for colour schemes that hold together. Every palette is built from one
base hue and one lightness band, so a lattice, its tiles and the gas all read as one scheme
instead of contrasting green and pink bands. It was written for `claude/wip/black-sun/sun-1-wip.frag`
and works in any paper-cranes shader.

Compile check: a test shader that includes the kit and calls every function compiled through
`window.__vjValidate` on the show page (`{"ok":true}`). A variant with a misspelled function name
was rejected with `no matching overloaded function`, which shows the validator does catch errors.

## Conventions

- **Hue is in turns (0..1) throughout the kit.** The wrapper's own `oklch2rgb(vec3)` and
  `rgb2oklch(vec3)` use radians and LINEAR sRGB. The kit does not redefine them; GLSL rejects a
  second `rgb2oklch(vec3)`. Instead it adds a `float, float, float` overload of `oklch2rgb` and a
  separately named `srgb2oklch`.
- Public functions take and return **display sRGB**, the value you write to `fragColor`. The kit
  uses the exact piecewise sRGB curve, not `pow(x, 2.2)`.
- OKLab ↔ linear sRGB uses the wrapper's `rgb2oklab` and `oklab2rgb` (Björn Ottosson's matrices).
- Palette band: L 0.45–0.85, C ≤ 0.13 (the hard cap is `KIT_CMAX` = 0.14). Accents use less
  chroma than the dominant colour.
- Gamut: `okFit` reduces chroma in OKLab until the colour fits sRGB, then pulls it toward the grey
  of the same lightness just far enough that every channel fits. The method is closed-form and
  continuous: sweeping the whole hue wheel at C = 0.3, which is far outside the gamut, changes no
  channel by more than 0.0066 between 2000 samples. Hard clipping produces flat areas and bands;
  this does not.

## The kit

Paste it after `#define TAU` / `#define PI`. It guards both defines anyway.

```glsl
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
```

## Signatures

```glsl
vec3  oklch2rgb(float L, float C, float h)          // h in turns → gamut-fit display sRGB
vec3  srgb2oklch(vec3 rgb)                          // display sRGB → (L, C, h turns)
vec3  srgb2lin(vec3) / lin2srgb(vec3)               // exact sRGB transfer
vec3  palAnalogous(float t, float baseH, float spread)   // spread in turns; 0.10–0.16 is good
vec3  palSplitComp(float t, float baseH)            // cyclic: dominant → accent +150° → accent +210° → dominant
vec3  palTriadSoft(float t, float baseH)            // cyclic: dominant → +120° → +240° at low chroma → dominant
vec3  palMonoRamp(float t, float baseH)             // L 0.45→0.85, chroma peaks mid-ramp, small warm drift
vec3  palMood(float t, float baseH, float warmth, float chroma)
vec3  harmonize(vec3 rgb, float baseH, float amt)   // squeeze any colour's hue into ±32° of baseH
vec3  desatTowardScheme(vec3 rgb, float baseH, float amt)
float palCycle(float t)                             // seamless 0→1→0, for non-cyclic palettes under fract
vec3  pal*Lab(...)                                  // the same palettes as OKLab, to blend before one okOut()
```

## How the harmonies are built

- **Analogous:** one smooth hue glide across `spread`, with lightness rising as t rises. This is
  the calmest scheme and the default for anything large.
- **Split-complement and soft triad:** four OKLab keys passed through `ramp4`. `ramp4` uses
  smoothstep, so the colour lingers on each key and glides between keys with no step. Because the
  mix happens in OKLab, a large hue jump passes through soft, low-chroma colour instead of
  sweeping through every hue in between. Both schemes start and end on the same colour, so
  `fract(t)` is seamless.
- **Mono ramp:** a single hue with a lightness ramp. The hue drifts 0.03 turns warmer as it gets
  lighter, which is the Bezold–Brücke shift, so the ramp does not look flat.
- **Mood:** `warmth` pulls `baseH` up to 60% of the way toward saffron (0.19 turns, about 68°),
  taking the short way round the wheel. `chroma` moves the scheme from mono to analogous to
  split-complement and scales chroma by 0.55–1.0. Drive both from slow moods such as
  `bs_moodFocus`, `bs_moodChaos` or K11 WARMTH. Never drive them from z-scores.

Sample swatches (t = 0, .25, .5, .75, 1):

| baseH | analogous (0.12) | split-comp |
|---|---|---|
| 0.19 amber | #975533 #a76231 #c58128 #d1aa59 #d7bb70 | #d38e37 #8fc3cb #78a0c6 #7f7b9d #d38e37 |
| 0.60 teal-blue | #007978 #00868d #00a3c0 #5ebce8 #7dc7f7 | #00b1cf #d7abba #c38c7d #917c5d #00b1cf |
| 0.90 orchid | #745a98 #8862a6 #b975bf #de94c7 #eda4cc | #c681cc #bfbb92 #81a77f #5c8a84 #c681cc |

The last row shows the trap. When the base hue is pink or magenta, its split-complements are
green. The kit keeps them muted (C ≤ 0.085), but if a pink/green look is what you want to avoid,
use `palAnalogous` while `baseH` is in about 0.8–1.0 or 0.3–0.45.

## Applying it to sun-1 (lattice and tiles)

The green/pink banding comes from `lsdBand`. `LSD_HUES` is a table of near-complementary hues at
C 0.17, indexed with `floor()`, so neighbouring bands are complementary pairs at high chroma.

1. **One slow base hue.** At the top of `mainImage`, set
   `gBaseH = fract(bs_moodKey * 0.5 + gPal * 0.25 + HUE_SPIN);`. Both inputs are slow, circular
   clocks in turns, so the wrap is seamless. K2 HUE SPIN still rotates the whole scheme.
2. **Replace the lookups.** Replace `lsdBand(floor(k), lit)` and `bandBlend(k, lit)` with
   `palSplitComp(fract(k / 6.0), gBaseH) * lit` for clouds that should have an accent, or
   `palAnalogous(palCycle(k / 6.0), gBaseH, 0.12) * lit` for calm ones. Either is seamless and
   needs no `floor`. Replace the tile `mc(12.0 + 0.9 * hash12(id), …)` with
   `palAnalogous(hash12(id), gBaseH + 0.5, 0.10)`. That gives the sky the base hue's complement,
   but at low chroma and with one shared lightness band.
3. **Tame what is left.** On the sky/lattice composite (not the sun), apply
   `col = harmonize(col, gBaseH, 0.5)`, or `desatTowardScheme(col, gBaseH, 0.6)` to keep hues and
   only drain off-scheme chroma. Use K11 WARMTH as `palMood`'s `warmth` instead of a separate hue
   pull.

## Cost

| Function | Cost |
|---|---|
| `okFit` | 2 × `oklab2rgb` (2 × 3×3 matrix plus 3 cubes), two 3-channel min loops. No transcendentals. |
| `lin2srgb` | 3 `pow` |
| `palAnalogous`, `palMonoRamp` | 1 sincos + `okOut`, about 60 ALU |
| `palSplitComp`, `palTriadSoft` | 3 sincos + `okOut`, about 80 ALU |
| `palMood` | 5 sincos + one `okOut`, about 110 ALU. It blends in OKLab and converts once. |
| `harmonize`, `desatTowardScheme` | `srgb2lin` (3 `pow`) + `rgb2oklab` (3 `cbrt`-`pow`) + `atan` + `okOut`, about 120 ALU |

Calling several of these per pixel is fine. For a larger saving, blend the `*Lab` versions and
call `okOut` once per pixel. `baseH` is uniform across the frame, so the sincos keys of a palette
could be computed once in `mainImage` into globals, but that is rarely worth the extra code.
