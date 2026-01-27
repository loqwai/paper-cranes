// @fullscreen: true
// Mandelbrot with Perturbation Theory for deep zoom
// http://localhost:6969/edit.html?shader=wip/mandelbrot-perturbation&controller=mandelbrot-perturbation

// Screen mapping (double-float precision)
uniform float screenOriginX;
uniform float screenOriginXLow;
uniform float screenOriginY;
uniform float screenOriginYLow;
uniform float pixelSpan;
uniform float pixelSpanLow;

// Reference point center
uniform float refCenterX;
uniform float refCenterXLow;
uniform float refCenterY;
uniform float refCenterYLow;

// Zoom info
uniform float zoomLevel;
uniform float zoomExponent;
uniform float refOrbitLength;
uniform float usePerturbation;

// Reference orbit - declared as individual uniforms
// The controller sends refOrbitX0, refOrbitX1, ..., refOrbitX255
// and refOrbitY0, refOrbitY1, ..., refOrbitY255

// We'll use a macro to access orbit values
// Since GLSL doesn't support dynamic array indexing from uniforms easily,
// we'll unroll key iterations

uniform float refOrbitX0, refOrbitX1, refOrbitX2, refOrbitX3, refOrbitX4;
uniform float refOrbitX5, refOrbitX6, refOrbitX7, refOrbitX8, refOrbitX9;
uniform float refOrbitX10, refOrbitX11, refOrbitX12, refOrbitX13, refOrbitX14;
uniform float refOrbitX15, refOrbitX16, refOrbitX17, refOrbitX18, refOrbitX19;
uniform float refOrbitX20, refOrbitX21, refOrbitX22, refOrbitX23, refOrbitX24;
uniform float refOrbitX25, refOrbitX26, refOrbitX27, refOrbitX28, refOrbitX29;
uniform float refOrbitX30, refOrbitX31, refOrbitX32, refOrbitX33, refOrbitX34;
uniform float refOrbitX35, refOrbitX36, refOrbitX37, refOrbitX38, refOrbitX39;
uniform float refOrbitX40, refOrbitX41, refOrbitX42, refOrbitX43, refOrbitX44;
uniform float refOrbitX45, refOrbitX46, refOrbitX47, refOrbitX48, refOrbitX49;

uniform float refOrbitY0, refOrbitY1, refOrbitY2, refOrbitY3, refOrbitY4;
uniform float refOrbitY5, refOrbitY6, refOrbitY7, refOrbitY8, refOrbitY9;
uniform float refOrbitY10, refOrbitY11, refOrbitY12, refOrbitY13, refOrbitY14;
uniform float refOrbitY15, refOrbitY16, refOrbitY17, refOrbitY18, refOrbitY19;
uniform float refOrbitY20, refOrbitY21, refOrbitY22, refOrbitY23, refOrbitY24;
uniform float refOrbitY25, refOrbitY26, refOrbitY27, refOrbitY28, refOrbitY29;
uniform float refOrbitY30, refOrbitY31, refOrbitY32, refOrbitY33, refOrbitY34;
uniform float refOrbitY35, refOrbitY36, refOrbitY37, refOrbitY38, refOrbitY39;
uniform float refOrbitY40, refOrbitY41, refOrbitY42, refOrbitY43, refOrbitY44;
uniform float refOrbitY45, refOrbitY46, refOrbitY47, refOrbitY48, refOrbitY49;

#define PI 3.14159265359
#define TAU (2.0 * PI)

// Double-float addition
vec2 df_add(vec2 a, vec2 b) {
    float s = a.x + b.x;
    float v = s - a.x;
    float t = (a.x - (s - v)) + (b.x - v) + a.y + b.y;
    return vec2(s, t);
}

// Double-float multiply by single float
vec2 df_mul(vec2 a, float b) {
    float p = a.x * b;
    float r = a.y * b;
    return vec2(p, r);
}

// Get reference orbit value by index (unrolled for first 50 iterations)
vec2 getRefOrbit(int i) {
    if (i == 0) return vec2(refOrbitX0, refOrbitY0);
    if (i == 1) return vec2(refOrbitX1, refOrbitY1);
    if (i == 2) return vec2(refOrbitX2, refOrbitY2);
    if (i == 3) return vec2(refOrbitX3, refOrbitY3);
    if (i == 4) return vec2(refOrbitX4, refOrbitY4);
    if (i == 5) return vec2(refOrbitX5, refOrbitY5);
    if (i == 6) return vec2(refOrbitX6, refOrbitY6);
    if (i == 7) return vec2(refOrbitX7, refOrbitY7);
    if (i == 8) return vec2(refOrbitX8, refOrbitY8);
    if (i == 9) return vec2(refOrbitX9, refOrbitY9);
    if (i == 10) return vec2(refOrbitX10, refOrbitY10);
    if (i == 11) return vec2(refOrbitX11, refOrbitY11);
    if (i == 12) return vec2(refOrbitX12, refOrbitY12);
    if (i == 13) return vec2(refOrbitX13, refOrbitY13);
    if (i == 14) return vec2(refOrbitX14, refOrbitY14);
    if (i == 15) return vec2(refOrbitX15, refOrbitY15);
    if (i == 16) return vec2(refOrbitX16, refOrbitY16);
    if (i == 17) return vec2(refOrbitX17, refOrbitY17);
    if (i == 18) return vec2(refOrbitX18, refOrbitY18);
    if (i == 19) return vec2(refOrbitX19, refOrbitY19);
    if (i == 20) return vec2(refOrbitX20, refOrbitY20);
    if (i == 21) return vec2(refOrbitX21, refOrbitY21);
    if (i == 22) return vec2(refOrbitX22, refOrbitY22);
    if (i == 23) return vec2(refOrbitX23, refOrbitY23);
    if (i == 24) return vec2(refOrbitX24, refOrbitY24);
    if (i == 25) return vec2(refOrbitX25, refOrbitY25);
    if (i == 26) return vec2(refOrbitX26, refOrbitY26);
    if (i == 27) return vec2(refOrbitX27, refOrbitY27);
    if (i == 28) return vec2(refOrbitX28, refOrbitY28);
    if (i == 29) return vec2(refOrbitX29, refOrbitY29);
    if (i == 30) return vec2(refOrbitX30, refOrbitY30);
    if (i == 31) return vec2(refOrbitX31, refOrbitY31);
    if (i == 32) return vec2(refOrbitX32, refOrbitY32);
    if (i == 33) return vec2(refOrbitX33, refOrbitY33);
    if (i == 34) return vec2(refOrbitX34, refOrbitY34);
    if (i == 35) return vec2(refOrbitX35, refOrbitY35);
    if (i == 36) return vec2(refOrbitX36, refOrbitY36);
    if (i == 37) return vec2(refOrbitX37, refOrbitY37);
    if (i == 38) return vec2(refOrbitX38, refOrbitY38);
    if (i == 39) return vec2(refOrbitX39, refOrbitY39);
    if (i == 40) return vec2(refOrbitX40, refOrbitY40);
    if (i == 41) return vec2(refOrbitX41, refOrbitY41);
    if (i == 42) return vec2(refOrbitX42, refOrbitY42);
    if (i == 43) return vec2(refOrbitX43, refOrbitY43);
    if (i == 44) return vec2(refOrbitX44, refOrbitY44);
    if (i == 45) return vec2(refOrbitX45, refOrbitY45);
    if (i == 46) return vec2(refOrbitX46, refOrbitY46);
    if (i == 47) return vec2(refOrbitX47, refOrbitY47);
    if (i == 48) return vec2(refOrbitX48, refOrbitY48);
    if (i == 49) return vec2(refOrbitX49, refOrbitY49);
    return vec2(0.0);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.3, 0.2, 0.2);
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Calculate pixel position relative to screen origin using double-float
    vec2 screenOriginX_df = vec2(screenOriginX, screenOriginXLow);
    vec2 screenOriginY_df = vec2(screenOriginY, screenOriginYLow);
    vec2 pixelSpan_df = vec2(pixelSpan, pixelSpanLow);

    vec2 cx_df = df_add(screenOriginX_df, df_mul(pixelSpan_df, fragCoord.x));
    vec2 cy_df = df_add(screenOriginY_df, df_mul(pixelSpan_df, fragCoord.y));

    // Calculate delta from reference center (Δc)
    // This is the key to perturbation: we only need the DIFFERENCE from center
    vec2 refCenterX_df = vec2(refCenterX, refCenterXLow);
    vec2 refCenterY_df = vec2(refCenterY, refCenterYLow);

    // Δc = c - c_ref (pixel position minus reference center)
    float dcx = (cx_df.x + cx_df.y) - (refCenterX_df.x + refCenterX_df.y);
    float dcy = (cy_df.x + cy_df.y) - (refCenterY_df.x + refCenterY_df.y);

    // Perturbation iteration
    // δ[n+1] = 2*Z[n]*δ[n] + δ[n]² + Δc
    // where Z[n] is the reference orbit and δ[n] is our perturbation

    float dx = 0.0;  // δx (perturbation real part)
    float dy = 0.0;  // δy (perturbation imaginary part)

    float iter = 0.0;
    int maxIter = int(min(refOrbitLength, 50.0));

    // Scale iterations based on zoom depth
    if (zoomExponent > 3.0) {
        maxIter = min(maxIter, int(50.0 + zoomExponent * 20.0));
    }

    for (int i = 0; i < 50; i++) {
        if (i >= maxIter) break;

        // Get reference orbit value Z[n]
        vec2 Z = getRefOrbit(i);
        float Zx = Z.x;
        float Zy = Z.y;

        // Full z = Z + δ for escape check
        float zx = Zx + dx;
        float zy = Zy + dy;
        float mag2 = zx * zx + zy * zy;

        if (mag2 > 256.0) {
            // Smooth iteration count
            iter = float(i) + 1.0 - log2(log2(mag2));
            break;
        }

        // Perturbation iteration: δ' = 2*Z*δ + δ² + Δc
        // Complex multiplication: (a+bi)(c+di) = (ac-bd) + (ad+bc)i

        // 2*Z*δ = 2*(Zx + Zy*i)*(dx + dy*i)
        //       = 2*(Zx*dx - Zy*dy) + 2*(Zx*dy + Zy*dx)*i
        float twoZd_x = 2.0 * (Zx * dx - Zy * dy);
        float twoZd_y = 2.0 * (Zx * dy + Zy * dx);

        // δ² = (dx + dy*i)² = (dx² - dy²) + (2*dx*dy)*i
        float d2_x = dx * dx - dy * dy;
        float d2_y = 2.0 * dx * dy;

        // δ' = 2*Z*δ + δ² + Δc
        dx = twoZd_x + d2_x + dcx;
        dy = twoZd_y + d2_y + dcy;

        iter = float(i);
    }

    // Coloring
    vec3 col;

    if (iter >= float(maxIter) - 1.0) {
        // Inside the set
        col = vec3(0.0);
    } else {
        // Outside - color by iteration count
        float normalizedIter = iter / float(maxIter);
        float colorIndex = sqrt(normalizedIter) * 3.0 + iTime * 0.05;
        col = palette(fract(colorIndex));

        // Add depth-based intensity
        col *= 0.8 + 0.4 * sin(normalizedIter * 20.0);
    }

    // Beat flash
    if (beat) {
        col *= 1.1;
    }

    // Subtle vignette
    vec2 uv = fragCoord / iResolution.xy;
    float vign = 1.0 - length(uv - 0.5) * 0.3;
    col *= vign;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
