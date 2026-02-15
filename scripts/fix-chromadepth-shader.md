# Chromadepth Shader Fix Instructions

## Stage 1: Analyze & Fix (Agent 1)

Read the shader file, fix these issues, and save:

### Aspect Ratio Fix
The UV calculation MUST use `iResolution.y` for aspect correction:
```glsl
vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
```
NOT `/ iResolution.xy` (which gives 0-1 range without aspect correction).

For 2D shaders, make sure the visual fills the viewport on both portrait and landscape without stretching. The pattern above centers the coordinate system and corrects aspect ratio.

For raymarched 3D shaders, the ray direction calculation should use aspect-corrected UVs. The camera setup should work regardless of aspect ratio.

### Oklab Color Quality
The chromadepth function MUST use oklab for vivid, non-gray colors:
```glsl
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float chromaBoost = 1.0 + 0.15 * sin(t * 3.14159 * 2.0);
    float L = 0.68 - t * 0.18;
    float C = 0.18 * chromaBoost;
    float h = hue * 6.28318;
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}
```

If the shader uses `hsl2rgb` for chromadepth coloring, replace with the oklab version above.

### Contrast Enhancement
- ChromaDepth needs STRONG contrast between foreground (red) and background (blue/violet)
- Avoid smooth gradients that blur together - use distinct color bands
- Ensure there are clearly distinct "near" (red/warm) and "far" (blue/violet/cool) regions
- The black background should be truly black (0,0,0) not dark gray
- Saturation should be high (C >= 0.18 in oklab)

### Vignette
Ensure vignette uses screenUV (0-1 range), not aspect-corrected UV:
```glsl
vec2 vc = fragCoord / iResolution.xy - 0.5;
col *= 1.0 - dot(vc, vc) * 0.7;
```

## Stage 2: Screenshot & Verify (Agent 2)

Use chrome-devtools MCP to:
1. Navigate to `http://localhost:6969/?shader=claude/SHADER_NAME&noaudio=true&fullscreen=true`
2. For each device config, emulate viewport and take screenshot
3. Save to `./tmp/screenshots/SHADER_NAME-DEVICE-N.png`

Device configs:
- iPhone SE: 375x667, dpr 2, mobile, portrait
- iPhone 14 Pro: 393x852, dpr 3, mobile, portrait
- iPhone 14 Pro Landscape: 852x393, dpr 3, mobile, landscape
- iPad: 810x1080, dpr 2, mobile, portrait
- Pixel 7: 412x915, dpr 2.625, mobile, portrait
- Desktop 1080p: 1920x1080, dpr 1, not mobile, landscape
- Desktop 1440p: 2560x1440, dpr 1, not mobile, landscape
- Ultrawide: 3440x1440, dpr 1, not mobile, landscape

Wait 2 seconds after navigation before each screenshot for the shader to render.

## Stage 3: Review Screenshots (Agent 3)

Read each screenshot and check:
1. Does the visual fill the viewport without stretching?
2. Are colors vivid (not gray/washed out)?
3. Is there clear contrast between foreground and background colors?
4. Does it look good on both portrait and landscape?
5. Are there any black bars or unused areas?

If issues found, describe what needs fixing.
