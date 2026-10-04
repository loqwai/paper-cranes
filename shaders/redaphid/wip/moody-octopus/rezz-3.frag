// @fullscreen: true
// @tags: rezz, dark
// rezz-3 (forked from rezz-1 mid audio-wiring, VJ iter 5) — moody-octopus2 forked for a dark Rezz palette: dark reds, blacks, purples.

// ============================================================================
// REZZ GRADE PARAMETERS
// ============================================================================
#define REZZ_SPAN 0.24     // hue walk width: red (1.0) down toward violet (0.76)
#define REZZ_FLOOR 0.12    // HSL lightness below this crushes to black
#define REZZ_CEIL 0.36     // max output lightness — never approaches white
#define REZZ_SHADOW 1.8    // how hard the purple end of the walk falls into black
// HYPNOTIC SPIRAL (Rezz goggles) + PROWL DRIVE — the spiral is the image, the fractal lives in its arms
#define SPIRAL_ARMS 4.0     // spiral arms around the vanishing point
#define SPIRAL_TIGHT 1.6    // bands per e-fold of radius (higher = tighter coil)
#define DRIVE_SPEED 0.22    // bands stream OUT from the centre like road lines (cycles/sec, time only)
#define SPIN_SPEED 0.015    // slow hypnotic rotation (turns/sec, time only)
#define TROUGH_DARK 0.94    // how black the gaps between arms are
#define ARM_RIM 0.30        // lightness of the hot red leading edge of each arm
// JULIA PROJECTED ONTO THE ARMS — the fractal is a texture printed on each spiral ribbon
#define ARM_TEX_MIX 0.85      // 1.0 = arms carry only the arm-space Julia, 0.0 = old screen-space fractal
#define ARM_TEX_TILES 8.0     // Julia tiles per seam-wrap along the arm (integer keeps the atan seam clean)
#define ARM_TEX_FLOW 0.12     // texture streams along the arm (time only) — iter5: 0.04 read as static
#define ARM_JULIA_MORPH 0.07  // Julia c walks the 0.7885 circle (rad/sec, time only) — iter5: 0.02 read as static
#define ARM_TEX_GAIN 16.0    // escape count that maps to full glow (6 saturated everything into flat blobs)
#define ARM_JULIA_RADIUS 0.7885  // |c| of the slow Julia orbit (near the boundary = filament-rich)
#define ARM_TEX_ACROSS 1.6    // Julia span across the ribbon (mirrored at the centre)
#define ARM_FILAMENT_WIDTH 2.5   // distance-estimate line width in screen pixels
#define ARM_GLOW_FLOOR 0.45   // dim escape-glow under the filaments so the ribbon body isn't empty
#define ARM_TRAIL_RIM 0.6     // trailing-edge rim strength relative to the leading rim

// ============================================================================
// AUDIO MAPPING (iter5) — one feature per visible role, all AMPLITUDE/OFFSET (never inside a
// time phase). Every driver is 0 in silence AND before the mic connects (that state reads raw 0,
// Normalized 0.5, ZScore 1 — so everything is gated on raw energy, never on Normalized/Z alone).
// Live synthwave on the USB mic measured: energy 0.011-0.030, Normalized features swing ~0.05-0.9,
// spectralFluxZScore idles ~0 and spikes to ~0.9 on hits.
// ============================================================================
#define QUIET_GATE smoothstep(0.005, 0.012, energy)                                     // energy: master gate
#define D_(x) (QUIET_GATE * (x))
#define DRIVE_BASS  D_(smoothstep(0.30, 0.80, bassNormalized))        // kick/sub  -> red rim glow + thickness
#define DRIVE_MIDS  D_(smoothstep(0.45, 0.95, midsNormalized))        // synth body -> arm texture brightness
#define DRIVE_AIR   D_(smoothstep(0.25, 0.80, trebleNormalized))      // hats/air  -> violet trailing rim
#define DRIVE_HIT   D_(smoothstep(0.30, 1.00, spectralFluxZScore))    // snare/hits (dead-zoned Z) -> texture flash
#define DRIVE_CENT  D_(spectralCentroidNormalized - 0.5)              // brightness -> Julia c (real) morph offset
#define DRIVE_SPRD  D_(spectralSpreadNormalized - 0.5)                // width      -> Julia c (imag) morph offset
#define DRIVE_KURT  D_(smoothstep(0.20, 0.90, spectralKurtosisNormalized)) // peakiness -> Julia zoom (texture scale)
#define DRIVE_CREST D_(smoothstep(0.20, 0.90, spectralCrestNormalized))    // spikiness -> filament line width
#define DRIVE_GRIT  D_(smoothstep(0.20, 0.85, spectralRoughnessNormalized))// dissonance -> glow under the filaments
#define DRIVE_CHAOS D_(spectralEntropyNormalized - 0.5)               // entropy    -> texture slides ACROSS the arm
#define DRIVE_ROLL  D_(smoothstep(0.25, 0.85, spectralRolloffNormalized))  // high cutoff -> hue tilts red->violet
#define ENGINE_GROWL (0.70 + 0.30 * DRIVE_BASS)      // rest 0.70 = the calm look
#define ENGINE_GROWL_TEX (0.80 + 0.25 * DRIVE_MIDS + 0.30 * DRIVE_HIT)
#define JULIA_AUDIO_C 0.045      // how far centroid/spread push Julia c off its orbit (shape morph)
#define JULIA_AUDIO_ZOOM 0.35    // kurtosis zooms the arm texture
#define TEX_ACROSS_SLIDE 0.6     // entropy slides the texture across the ribbon
#define FINAL_L_CAP 0.31         // hard lightness cap after every driver — never white

// Function to check if pixel and surrounding area is solid white
float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    // Calculate average whiteness for each pixel
    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite = dot(left, vec3(1.0)) / 3.0;
    float rightWhite = dot(right, vec3(1.0)) / 3.0;
    float upWhite = dot(up, vec3(1.0)) / 3.0;
    float downWhite = dot(down, vec3(1.0)) / 3.0;

    // Use smoothstep for gradual transition
    float threshold = 0.5;
    float smoothness = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerWhite);
    float leftSmooth = smoothstep(threshold - smoothness, threshold, leftWhite);
    float rightSmooth = smoothstep(threshold - smoothness, threshold, rightWhite);
    float upSmooth = smoothstep(threshold - smoothness, threshold, upWhite);
    float downSmooth = smoothstep(threshold - smoothness, threshold, downWhite);

    // Return average of all smoothstepped values
    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

// Function to apply Julia set distortion
vec2 julia(vec2 uv,float t){
  // Wrap UV for texture sampling
  vec2 texUv = fract(uv);
  vec3 prevColor = getLastFrameColor(texUv).rgb;

  // Julia set parameters
  float cRe = sin(t)*.7885;
  float cIm = cos(t)*.7885;

  // Apply the Julia set formula
  int maxIter = 64;
  float epsilon = 0.0001; // Small epsilon to prevent numerical issues
  for(int i = 0; i < maxIter; i++){
    // Add epsilon to prevent exact zero
    float x = (uv.x+epsilon)*uv.x-(uv.y+epsilon)*uv.y+cRe;
    float y = 2.*(uv.x+epsilon)*(uv.y+epsilon)+cIm;
    uv.x = x;
    uv.y = y;

    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }

  return uv;
}

// Color palette system
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b*cos(6.28318*(c*t + d));
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    // Continuous space UV for effects
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time/10.;

    // Calculate pixel size for sampling
    vec2 pixelSize = 1.0 / iResolution.xy;

    // Texture sampling coordinates (need to be wrapped)
    vec2 texUv = fract(fragCoord.xy / iResolution.xy);

    // Get smooth white amount
    float whiteAmount = getWhiteAmount(texUv, pixelSize);

    // Scale UV for interesting fill pattern (texture sampling)
    vec2 scaledUv = fract(uv);
    scaledUv = fract(scaledUv);

    // Get color from previous frame with scaled UV
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Define our artistic color palette
    vec3 a = vec3(0.5, 0.5, 0.5);    // Base brightness
    vec3 b = vec3(0.5, 0.5, 0.5);    // Color variation
    vec3 c = vec3(1.0, 1.0, 1.0);    // Frequency
    vec3 d = vec3(0.0, 0.33, 0.67);  // Phase offset for each channel

    // Create a base time/audio modulation value (no initial radial dependency)
    float baseModulation = t * 0.1;

    // Modulate palette parameters with audio features
    vec3 pal_b = b * 0.5;
    vec3 pal_c = c;
    vec3 pal_d = d;

    // Generate base color from palette - Placeholder, will be overwritten later
    float colorT = sin(time/10000.);
    vec3 baseColor = palette(colorT, a, b, c, d); // Removed old calculation

    // Add some variation based on audio features
    vec3 hsl = rgb2hsl(fillColor);

    // Smoothly blend between fill color and base color
    fillColor = mix(fillColor, baseColor, 0.99);
    hsl = rgb2hsl(fillColor);

    // Add subtle variations
    hsl.x = fract(hsl.x);
    hsl.y = 0.7;
    hsl.z = 0.5 + whiteAmount * 0.2;

    vec3 fillColorFinal = hsl2rgb(fract(hsl));

    // Original shader code continues here
    // Keep UV continuous for effects

    uv = julia(uv, t);

    // Sample previous frame color with smooth transitions (texture sampling)
    vec3 prevColor = getLastFrameColor(fract(uv)).rgb;

    // --- Emphasize Fractal Coloring ---
    // Use post-Julia uv length and angle for more detailed coloring
    float finalDist = length(uv);
    float finalAngle = atan(uv.y, uv.x);

    // --- Generate Palette Colors Based on Fractal Features ---
    float paletteT = baseModulation + finalDist * 0.3 + finalAngle * 0.1; // New palette input based on fractal
    baseColor = palette(paletteT, a, pal_b, pal_c, pal_d);
    vec3 complementaryColor = palette(paletteT + 0.5, a, pal_b, pal_c, pal_d);

    // Create a complementary color scheme using the palette, now influenced by final fractal state
    vec3 hslOriginal = vec3(0.5);
    // Modulate mix based on fractal angle and pre-Julia uv.x (sin input is now scaled differently)
    hslOriginal = rgb2hsl(mix(baseColor, complementaryColor, sin(uv.x * 2.0 + finalAngle * 5.0 + t / 5.0) * 0.5 + 0.5));

    // Normalize coordinates for ripple effect (less emphasis now)
    vec2 rippleUv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; // Use original uv for ripple base

    // Calculate ripple effect with smoother transitions & less intensity
    float distanceToCenter = length(rippleUv);
    // Reduce amplitude and slightly slow down ripple frequency
    float ripple = sin(distanceToCenter*(6.)-t*1.0)*.05 + 0.95; // Much weaker ripple

    // Generate harmonious color based on fractal structure
    // Use finalDist and finalAngle for hue calculation, remove colorT dependency
    float hue = mod(t*0.05 + finalDist*0.6 + finalAngle * 0.2, 1.0);
    vec3 color = hsl2rgb(vec3(hue, 0.7, 0.55)); // Slightly increased saturation/brightness

    // Apply ripple effect weakly
    color *= ripple; // Apply ripple as a subtle multiplier

    // Smoother color mixing with previous frame (keep damping)
    color = mix(prevColor, color, 0.001);

    // Mix between fractal/ripple color and fill color based on white amount
    color = mix(color, fillColorFinal, whiteAmount);

    vec3 prevHsl = rgb2hsl(prevColor);

    // Add subtle color variations based on audio (keep these)
    if(hslOriginal.y < 0.5){
        hslOriginal.y += (prevHsl.x) * 0.1;
    }
    if(hslOriginal.z > 0.8) {
    }
    if(hslOriginal.z < 0.1) {
    }

    // --- Final color blending: Prioritize fractal color ---
    // Give more weight to hslOriginal (derived from fractal structure)
    color = mix(hsl2rgb(hslOriginal), color, 0.3); // Was 0.7, now favors hslOriginal

    // --- REZZ GRADE: keep the fractal's structure, force the palette to blood red -> violet over black ---
    vec3 g = rgb2hsl(color);
    // triangle walk so the hue folds back instead of wrapping (no red->purple seam)
    float rezzWalk = abs(fract(g.x + finalDist * 0.15 + t * 0.02) * 2.0 - 1.0);
    float rezzHue = fract(1.0 - REZZ_SPAN * rezzWalk);          // 1.0 = red, 0.76 = purple
    float rezzL = pow(smoothstep(REZZ_FLOOR, 0.55, g.z), 1.6) * REZZ_CEIL;
    // red end stays lit, purple end sinks into shadow, the far end is black
    rezzL *= pow(1.0 - rezzWalk, REZZ_SHADOW);
    // HYPNOTIC SPIRAL + PROWL DRIVE: log-spiral arms stream outward from a dark vanishing point,
    // phases are monotonic in time only. The Julia set is PROJECTED onto the arms as a texture.
    vec2 sp = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float spR = max(length(sp), 0.015);
    float spA = atan(sp.y, sp.x) / 6.28318 + time * SPIN_SPEED;
    float spiral = fract(log(spR) * SPIRAL_TIGHT + spA * SPIRAL_ARMS - time * DRIVE_SPEED);
    float spiralArm = smoothstep(0.0, 0.08, spiral) * smoothstep(0.62, 0.42, spiral);
    // leading rim + dimmer trailing rim frame each ribbon so all 4 arms read as one coherent band
    float leadRim = smoothstep(0.0, 0.035, spiral) * smoothstep(0.13 + 0.07 * DRIVE_BASS, 0.04, spiral);
    float trailRim = (ARM_TRAIL_RIM + 0.5 * DRIVE_AIR) * smoothstep(0.47, 0.545, spiral) * smoothstep(0.64, 0.565, spiral);
    float spiralRim = max(leadRim, trailRim);
    float depth = smoothstep(0.02, 0.75, spR);                   // vanishing point recedes into black

    // ARM-SPACE JULIA: (u, spiral) is the conformal pair of the log-spiral, so a texture laid in it
    // rides the arm undistorted and shrinks toward the vanishing point like perspective.
    // u jumps by SPIRAL_TIGHT*2PI across the atan seam; tiling u by that / ARM_TEX_TILES keeps it seamless.
    float spTheta = spA * 6.28318;
    float armU = log(spR) * (SPIRAL_ARMS / 6.28318) - SPIRAL_TIGHT * spTheta - time * ARM_TEX_FLOW;
    float armTile = SPIRAL_TIGHT * 6.28318 / ARM_TEX_TILES;
    float armAlong = abs(fract(armU / armTile) * 2.0 - 1.0);      // mirrored -> no seam between tiles
    float armAcross = clamp(spiral / 0.62, 0.0, 1.0);
    // mirrored across the ribbon centre: both edges carry the same Julia structure, so the rim
    // hugs lit texture instead of floating beside a dark exterior strip (iter4: "only 2 of 4 rims")
    float armMirror = abs(armAcross - 0.5) * 2.0;
    vec2 jz = vec2((armAlong - 0.5) * 3.0, (armMirror - 0.5 + TEX_ACROSS_SLIDE * DRIVE_CHAOS) * ARM_TEX_ACROSS);
    jz /= 1.0 + JULIA_AUDIO_ZOOM * DRIVE_KURT;                    // kurtosis zooms into the texture
    // Julia-space size of one screen pixel, for crisp distance-estimate filaments
    float jpx = clamp(max(fwidth(armAlong) * 3.0, fwidth(armMirror) * ARM_TEX_ACROSS), 1e-4, 0.05);
    float jAng = time * ARM_JULIA_MORPH;
    vec2 jc = vec2(sin(jAng), cos(jAng)) * ARM_JULIA_RADIUS
            + JULIA_AUDIO_C * vec2(DRIVE_CENT, DRIVE_SPRD);       // centroid/spread morph the Julia shape
    vec2 jdz = vec2(1.0, 0.0);
    float jn = 0.0;
    for (int i = 0; i < 48; i++) {
        jdz = 2.0 * vec2(jz.x * jdz.x - jz.y * jdz.y, jz.x * jdz.y + jz.y * jdz.x);
        jz = vec2(jz.x * jz.x - jz.y * jz.y, 2.0 * jz.x * jz.y) + jc;
        if (dot(jz, jz) > 16.0) break;
        jn += 1.0;
    }
    // filaments: distance estimate -> thin crisp lines; the filled interior (never escaped) stays black
    float jr = length(jz);
    float jde = 0.5 * jr * log(max(jr, 1.0001)) / max(length(jdz), 1e-6);
    float filament = jn >= 47.0 ? 0.0 : 1.0 - smoothstep(0.0, (ARM_FILAMENT_WIDTH + 1.6 * DRIVE_CREST) * jpx, jde);
    float escGlow = jn >= 47.0 ? 0.0 : clamp((jn + 1.0 - log2(log2(max(dot(jz, jz), 1.0001)))) / ARM_TEX_GAIN, 0.0, 1.0);
    float armTex = max(filament, escGlow * (ARM_GLOW_FLOOR + 0.22 * DRIVE_GRIT));
    float texWalk = abs(fract(armTex * 1.3 + t * 0.02) * 2.0 - 1.0);
    float texL = smoothstep(0.04, 0.8, armTex) * REZZ_CEIL * (1.0 - 0.65 * texWalk) * ENGINE_GROWL_TEX;
    rezzL = mix(rezzL * (1.0 - ARM_TEX_MIX), texL, ARM_TEX_MIX);
    rezzHue = mix(rezzHue, fract(1.0 - REZZ_SPAN * texWalk), ARM_TEX_MIX);

    rezzL *= mix(1.0 - TROUGH_DARK, 1.0, spiralArm) * depth;
    rezzL = max(rezzL, spiralRim * depth * ARM_RIM * ENGINE_GROWL);  // hot red leading edge
    rezzHue = mix(rezzHue, 1.0, leadRim);                         // leading rim is pure red
    rezzHue = mix(rezzHue, 0.80, trailRim * DRIVE_AIR);            // treble pushes the trailing rim violet
    rezzHue = fract(rezzHue - (1.0 - spiralArm) * 0.05);          // gaps lean violet
    rezzHue = fract(rezzHue - 0.07 * DRIVE_ROLL * spiralArm);      // rolloff tilts the arms red -> violet
    rezzL = min(rezzL, FINAL_L_CAP);
    color = hsl2rgb(vec3(rezzHue, 0.92, rezzL));

    fragColor = vec4(color, 1.);
}
