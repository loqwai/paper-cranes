# Banana Boy Shader Prompt

## Goal

Create one or more ChromaDepth shaders for Eddie (a guy who wears a banana costume to raves). Place them in `./shaders/eddie-banana/<semantic-name>.frag`.

## Visual Concept

### Main Element: Banana Man Silhouette
The shader should feature a **silhouette of a man wearing a banana outfit**. This can be done two ways (pick whichever looks better):

1. **Image-based silhouette** (recommended): Load a banana-man image via `?image=images/eddie-banana.png` and detect the silhouette using HSL thresholding (like subtronics.frag does). The user will provide the image.
2. **SDF-based silhouette**: Build the banana-man shape from SDF primitives (a banana curve for the body, circle for the head, rectangles for arms/legs poking out).

Here's a simple banana SDF if you go the SDF route:
```glsl
// Banana shape: thick arc
float sdBanana(vec2 p) {
    // Rotate slightly for natural banana curve
    float a = -0.3;
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    // Arc parameters
    float r = 0.6;  // radius of curvature
    float thickness = 0.15;
    // Offset to arc center
    p.y += r * 0.6;
    float d = abs(length(p) - r) - thickness;
    // Clip to half-arc
    d = max(d, -p.y - 0.1);
    d = max(d, p.y - r * 1.1);
    return d;
}
```

### Background: Dark Blue
The background must be **dark blue/navy** (`~vec3(0.02, 0.02, 0.08)` or darker). This is critical because:
- ChromaDepth glasses need dark backgrounds for the depth effect to work
- Dark blue recedes (appears far away in chromadepth)
- Makes the yellow/red banana pop forward dramatically

### Small Background Bananas
Scatter **lots of small bananas** in the background, using the same technique as the heart shaders. Here's the pattern from `redaphid/wip/hearts/fractal.frag`:

```glsl
// Render multiple lines of shapes along Mandelbrot-driven paths
for (float line = 0.0; line < LINE_COUNT; line++) {
    for (float i = 0.0; i < COUNT; i++) {
        float t = fract(i / COUNT - iTime * 0.2 + line * 0.25);

        // Get position from Mandelbrot iteration
        vec2 pos;
        float scale, rotation;
        mandelbrotTransform(t, line, pos, scale, rotation);

        // Audio reactivity
        pos += vec2(cos(t*PI*2.0), sin(t*PI*2.0)) * midsNormalized * 0.2;
        scale *= 0.15 + energyNormalized * 0.1;

        // Transform UV for this shape
        vec2 shapeUV = uv - pos;
        shapeUV = rot(rotation) * shapeUV;
        shapeUV /= scale;

        float d = sdBanana(shapeUV);  // or sdHeart, etc.
        if (d < 0.0) {
            // Color and composite
        }
    }
}
```

The small bananas should:
- Use chromadepth coloring (yellow-green-blue gradient based on distance from center)
- Be scattered along fractal/Mandelbrot spiral paths
- React to audio (wobble, scale, rotate with the music)
- Sometimes increase in density/count on beats or energy spikes

### ChromaDepth Coloring
- **Banana silhouette**: Red/orange/yellow (hue 0.0-0.15) — pops FORWARD
- **Small background bananas**: Yellow to green (hue 0.1-0.4) — mid depth
- **Far background elements**: Blue/violet (hue 0.5-0.75) — recedes
- **Background**: Very dark blue/black — neutral depth

Use HSL for the chromadepth mapping (NOT oklch — chromadepth needs raw spectral hue order):
```glsl
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75;  // 0=red(near), 0.75=violet(far)
    float sat = 0.92;
    float lit = 0.5 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}
```

But use **oklab** for frame feedback blending (perceptually uniform):
```glsl
vec3 colOk = rgb2oklab(col);
vec3 prevOk = rgb2oklab(prev);
prevOk.x *= 0.96;  // luminance decay
vec3 blended = mix(prevOk, colOk, 0.7);
col = oklab2rgb(blended);
```

## Audio Reactivity

Use the `#define` swap pattern for all audio parameters:
```glsl
// Active: audio-reactive
#define BANANA_PULSE (1.0 + bassZScore * 0.08)
// #define BANANA_PULSE 1.0
```

Suggested mappings:
- **Bass**: Main banana silhouette pulses/breathes
- **Energy**: Overall brightness, small banana count/density
- **Treble**: Small banana shimmer/sparkle
- **Spectral flux**: Edge glow intensity on the main silhouette
- **Spectral centroid**: Hue drift within the chromadepth range
- **Pitch class**: Slow rotation of background banana patterns
- **Beat**: Flash/throb effect, main banana briefly scales up
- **Spectral entropy**: Chaos in background banana scatter pattern
- **Spectral roughness**: Saturation boost

## Technical Requirements

### Metadata
```glsl
// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: banana, chromadepth, 3d, eddie, love
```

### Performance
- Mobile-safe: keep iteration counts low (< 12 for Kali/Mandelbrot)
- Background banana count: 8-15 per line, 3-4 lines max
- Use `rot()` matrix instead of separate sin/cos calls

### Frame Feedback
Use oklab blending for perceptually uniform feedback:
```glsl
vec3 prev = getLastFrameColor(fbUV).rgb;
vec3 colOk = rgb2oklab(col);
vec3 prevOk = rgb2oklab(prev);
prevOk.x *= 0.96;
prevOk.yz *= 0.98;
float newAmount = 0.7;
vec3 blended = mix(prevOk, colOk, newAmount);
// Prevent chroma death
if (length(blended.yz) < length(colOk.yz) * 0.6) {
    blended.yz = mix(blended.yz, colOk.yz, 0.35);
}
col = oklab2rgb(blended);
```

### Vignette
Always add a vignette to keep edges dark:
```glsl
vec2 vc = screenUV - 0.5;
col *= 1.0 - dot(vc, vc) * 0.6;
```

### Avoid Common Mistakes
1. Put metadata AFTER `#version 300 es` if using it, or on line 1 if not
2. Always clamp final output: `col = clamp(col, 0.0, 1.0);`
3. Protect divisions: `max(value, 0.001)`
4. Don't let feedback accumulate to white: decay previous frame luminance

## Reference Shaders to Study

Read these before writing:
- `shaders/redaphid/wip/hearts/fractal.frag` — the scattered-shapes-along-Mandelbrot-paths pattern
- `shaders/redaphid/wip/hearts/spinny.frag` — more hearts with wider spread
- `shaders/claude/chromadepth-julia.frag` — clean chromadepth fractal
- `shaders/claude/chromadepth-kali.frag` — chromadepth + oklab feedback pattern
- `shaders/subtronics.frag` — image-based silhouette detection technique
- `shaders/nella/heart/kali-pulse.frag` — heart silhouette with fractal interior + chromadepth

## Available Utility Functions (auto-injected, don't redeclare)

```glsl
vec3 hsl2rgb(vec3 hsl);
vec3 rgb2hsl(vec3 rgb);
vec3 rgb2oklab(vec3 c);
vec3 oklab2rgb(vec3 lab);
vec3 rgb2oklch(vec3 c);
vec3 oklch2rgb(vec3 lch);
vec4 getLastFrameColor(vec2 uv);
vec4 getInitialFrameColor(vec2 uv);
float mapValue(float val, float inMin, float inMax, float outMin, float outMax);
float random(vec2 st);
```

## Image Loading (if using image-based silhouette)

Images are loaded via query parameter: `?image=images/eddie-banana.png`

The image is available as:
- `iChannel0` / `iChannel2` — the loaded image texture
- `getInitialFrameColor(uv)` — helper function (recommended)

To detect the silhouette from an image:
```glsl
vec3 imgColor = getInitialFrameColor(uv).rgb;
vec3 hsl = rgb2hsl(imgColor);
// Detect banana-yellow regions
float isBanana = smoothstep(0.1, 0.15, hsl.x) * (1.0 - smoothstep(0.18, 0.22, hsl.x))
               * smoothstep(0.3, 0.5, hsl.y)
               * smoothstep(0.3, 0.5, hsl.z);
```

Adjust the hue/saturation/lightness thresholds based on the actual image colors.

## File Location

Create shaders at: `./shaders/eddie-banana/<semantic-name>.frag`

Good names: `banana-man.frag`, `peel-fractal.frag`, `banana-rain.frag`, `costume-party.frag`

## Shader Validation

After writing, run:
```bash
node scripts/validate-shader.js shaders/eddie-banana/<name>.frag
```

## Dev Server

```bash
pnpm dev
# Then open: http://localhost:<port>/?shader=eddie-banana/<name>
```

## PR Instructions

When creating the PR:
- Base branch: `main`
- Include preview links using the branch preview URL convention:
  `https://banana-boy.paper-cranes-visuals.pages.dev/?shader=eddie-banana/<name>`
- Request review from `redaphid`
