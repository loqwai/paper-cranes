#!/usr/bin/env python3
"""Port a clit-series shader's colour onto the repo's OKLCH harmony kit (docs/oklch-palettes.md),
theme EMBER & NEBULA. Touches only the colour code: the three palette functions (chromadepth,
lchGamut, paletteHue) and their call sites. Everything else (lace geometry, LACE AA, beat, tone map,
magenta guard) is left byte-identical, so the port re-applies cleanly onto whatever lace code lands.

Usage: python3 shaders/claude/wip/clit-oklch/port.py <in.frag> <out.frag>
Fails loudly if any anchor is missing (the source changed shape: port by hand and update this).
"""
import re
import sys
from pathlib import Path

KIT = (Path(__file__).parent / 'kit.glsl').read_text()

THEME = r'''
// ============================================================================
// THEME: EMBER & NEBULA. A warm body adrift in a cold galaxy. The lace is the body: ember red and
// burnt amber, lit from inside. The galaxy behind and around it is cool: teal (the kit's split
// complement of the ember, +150 deg) and indigo velvet (the darkest lace, the pale star's tint).
// Warm = near and cool = far, so the theme agrees with ChromaDepth glasses even with K_DEPTH at 0.
// One base hue (THEME_H, in turns) sets all four keys. The per-device seed turns it within the
// ember window only (27..41 deg), so no phone ever lands in hot magenta (indigo stays under 286 deg).
// Knobs and audio (HUE_TURN, cs_hue, cs_jump, cs_shift, TONE_LEAN) move the position ALONG the
// palette (pal_t), never the hues themselves: no dial can take the series off-theme.
// Lightness band: the series is velvet on black, darker than the kit's 0.45..0.85 band, so it keeps
// its own (lace L 0.13..0.70, the true OKLab lightness the old palette displayed). Chroma is
// requested past the kit's 0.13 and okFit maps it to the sRGB edge at constant L and hue: the series
// rule is never grey, and the edge is where every lace pixel was before.
// ============================================================================
#define THEME_H (0.095 + 0.02 * (2.0 * fract(seed * 7.31 + 0.13) - 1.0))
#define KEY_AMBER  0.04            // burnt amber, analogous to the ember (kept short of yellow: the kick turns it +45 deg)
#define KEY_TEAL   (5.0 / 12.0)    // the kit's split complement
#define KEY_INDIGO 0.68            // the velvet (lands 272..286 deg: violet, never magenta)

// The theme ramp in OKLab at lightness L and chroma C. t: 0 ember, 1/3 amber, 2/3 teal, 1 indigo.
// Callers ping-pong t, so it never wraps indigo -> ember across magenta. ramp4 glides between keys in
// OKLab, so the far amber -> teal step passes through soft chroma instead of a green band. themeHold
// holds each key longer first (the glide takes the middle half of each leg): the olive-green midpoint
// of that step drops from ~9% of a uniform t sweep to ~3%.
float themeHold(float t) {
    float x = clamp(t, 0.0, 1.0) * 3.0;
    float i = min(floor(x), 2.0);
    return (i + smoothstep(0.25, 0.75, x - i)) / 3.0;
}
vec3 themeLab(float t, float L, float C) {
    float h = THEME_H;
    return ramp4(lchT(L, C, h), lchT(L, 0.85 * C, h + KEY_AMBER),
                 lchT(L, 0.75 * C, h + KEY_TEAL), lchT(L, C, h + KEY_INDIGO), themeHold(t));
}
vec3 themeCol(float t, float L, float C) { return okOut(themeLab(t, L, C)); }

// Strict chromadepth for the glasses: red (29 deg, near) to violet (293 deg, far), on the kit's
// gamut fit. Physics, not theme: the seed does not turn it.
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float boost = 1.0 + 0.2 * sin(t * TAU);
    return oklch2rgb(0.60 - 0.36 * t, 0.26 * boost * (1.0 - t * 0.3), 0.08 + t * 0.735);
}
'''

OLD_FUNCS = re.compile(
    r'// Strict chromadepth for the glasses.*?\nfloat paletteHue\(float t\) \{.*?\n\}\n',
    re.S)

SITES = [
    # (old, new, required)
    ('mix(vec3(0.10, 0.03, 0.22), lchGamut(0.32, 0.11, paletteHue(pal_t)), 0.5)',
     'mix(vec3(0.10, 0.03, 0.22), themeCol(pal_t, 0.18, 0.20), 0.5)', True),
    ('lchGamut(0.30, 0.12, 0.506)', 'oklch2rgb(0.20, 0.11, THEME_H)', False),
    ('''    float lace_L = 0.30 + 0.56 * luma;
    float lace_C = (0.13 + 0.07 * (1.0 - luma)) * (1.0 - 0.35 * pale) * CHROMA_GAIN;
    vec3 vivid = lchGamut(lace_L, lace_C, paletteHue(pal_t));''',
     '''    float lace_L = 0.13 + 0.57 * luma;
    float lace_C = (0.20 + 0.08 * (1.0 - luma)) * (1.0 - 0.1 * pale) * CHROMA_GAIN;
    vec3 vivid = themeCol(pal_t, lace_L, lace_C);''', True),
    ('lchGamut(0.66, 0.16 * CHROMA_GAIN, paletteHue(rim_t))', 'themeCol(rim_t, 0.50, 0.26 * CHROMA_GAIN)', True),
    ('lchGamut(0.48, 0.13, 0.506)', 'oklch2rgb(0.33, 0.15, THEME_H)', False),
    ('lchGamut(0.55, 0.12, 1.152)', 'oklch2rgb(0.40, 0.13, THEME_H + KEY_AMBER)', False),
    ('lchGamut(0.80, 0.14, 1.152)', 'oklch2rgb(0.70, 0.16, THEME_H + KEY_AMBER)', False),
]


def port(src):
    if not OLD_FUNCS.search(src):
        sys.exit('anchor missing: chromadepth/lchGamut/paletteHue block')
    src = OLD_FUNCS.sub(lambda _: KIT + THEME.lstrip('\n'), src, count=1)
    for old, new, required in SITES:
        if old not in src:
            if required:
                sys.exit(f'anchor missing: {old[:60]}')
            continue
        src = src.replace(old, new)
    for gone in ('lchGamut', 'paletteHue'):
        if gone in src:
            sys.exit(f'{gone} still referenced after port')
    src = src.replace(
        '// Colour is built in OKLCH and gamut-mapped: red / amber / teal / blue-violet, never grey, never hot magenta.',
        '// Colour: the repo OKLCH harmony kit (docs/oklch-palettes.md), theme EMBER & NEBULA: ember / amber body,\n'
        '// teal / indigo galaxy, one base hue, okFit gamut mapping. Never grey, never hot magenta.')
    return src


# The magenta guard from clit-vibej (iters 3 and 5), for a shader that lacks it (clit-set/2). Measured on
# clit-set/2 at phone size: the hot pink there comes from the beat's hue rotation turning violet into the
# arc (0.27 of lit pixels with it, 0.04 with the rotation off), not from the palette.
GUARD_ROT_OLD = '''    vec3 lab = rgb2oklab(col);
    float ca = cos(ang), sa = sin(ang);
    lab.yz = mat2(ca, sa, -sa, ca) * lab.yz * cgain;
'''
GUARD_ROT_NEW = '''    vec3 lab = rgb2oklab(col);
    // The rotation never carries a pixel into the hot-magenta arc (clit-vibej iter 3). In OKLab atan range
    // that arc is (-1.25, 0.45) rad: between blue-violet (288 deg) and red (26 deg). Violet turned + and
    // red turned - (the signed wave) used to land there; now they stop at the arc's edge.
    float h0 = atan(lab.z, lab.y);
    float h1 = h0 + ang;
    if (!(h0 > -1.25 && h0 < 0.45) && h1 > -1.25 && h1 < 0.45) h1 = h0 < -0.4 ? -1.25 : 0.45;
    lab.yz = length(lab.yz) * cgain * vec2(cos(h1), sin(h1));
'''
GUARD_OUT_ANCHOR = '    P = vec4(clamp(col, 0.0, 1.0), 1.0);\n}'
GUARD_OUT = '''    // NEVER HOT MAGENTA (clit-vibej iter 5): hues inside the arc between blue-violet (288 deg) and red
    // (26 deg) are squeezed toward the two edges, and only the arc's middle loses some chroma. L is kept.
    vec3 gl = rgb2oklab(col);
    float gh = atan(gl.z, gl.y);
    if (gh > -1.25 && gh < 0.45) {
        float gt = (gh + 1.25) / 1.70;
        float gq = gt < 0.5 ? 0.5 * pow(2.0 * gt, 3.0) : 1.0 - 0.5 * pow(2.0 - 2.0 * gt, 3.0);
        float gc = length(gl.yz) * (1.0 - 0.45 * smoothstep(0.25, 0.0, abs(gt - 0.5)));
        float g2 = -1.25 + gq * 1.70;
        gl.yz = gc * vec2(cos(g2), sin(g2));
        col = oklab2rgb(gl);
    }

'''


ARC_CLAMP = '    if (!(h0 > -1.25 && h0 < 0.45) && h1 > -1.25 && h1 < 0.45) h1 = h0 < -0.4 ? -1.25 : 0.45;\n'
GREEN_CLAMP = ('    // THEME: nor into the green gap between burnt amber and teal (90..160 deg = 1.57..2.79 rad)\n'
               '    if (!(h0 > 1.57 && h0 < 2.79) && h1 > 1.57 && h1 < 2.79) h1 = h0 < 2.18 ? 1.57 : 2.79;\n')


def guard(src):
    if 'NEVER HOT MAGENTA' in src:
        return src
    if GUARD_ROT_OLD not in src or GUARD_OUT_ANCHOR not in src:
        sys.exit('anchor missing for --guard')
    src = src.replace(GUARD_ROT_OLD, GUARD_ROT_NEW)
    return src.replace(GUARD_OUT_ANCHOR, GUARD_OUT + GUARD_OUT_ANCHOR)


if __name__ == '__main__':
    out = port(Path(sys.argv[1]).read_text())
    if '--guard' in sys.argv:
        out = guard(out)
    # The beat's hue step stays on theme: it already may not turn a pixel into magenta; now it may not turn
    # the burnt amber into the green gap between amber and teal either. Measured on clit-vibej/2 at phone
    # size: with the beat rotation off, old and new palettes both show 2% green (90..150 deg); with it on,
    # the kick's +0.45 rad and the wave's +-0.35 rad push amber to 95 deg (old 3.4%, new 6.7% green).
    if ARC_CLAMP in out and GREEN_CLAMP not in out:
        out = out.replace(ARC_CLAMP, ARC_CLAMP + GREEN_CLAMP)
    Path(sys.argv[2]).write_text(out)
