uniform float knob_60;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;
uniform float knob_6;

// #define PROBE_A knob_60
// #define PROBE_B knob_3
// #define PROBE_C knob_4
// #define PROBE_D knob_5
// #define PROBE_E knob_6

#define PROBE_A max(mix(0.2, 0.8, treble), 0.2)
#define PROBE_B max(mix(0.7, 1.0, mids), 0.7)
#define PROBE_C max(mix(0.7, 1.0, spectralFlux), 0.7)
#define PROBE_D max(mix(0.64, 0.84, spectralCrest), 0.64)
#define PROBE_E 0.7

vec3 palette(float t) {
    vec3 a = vec3(0.6, 0.6, 0.6);
    vec3 b = vec3(0.8, 0.8, 0.8);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);

    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

   
    vec2 squareCenter = vec2(0.0, 0.0);
    float squareSize = 0.5 * PROBE_C;

    
    float numAxes = 7.0*PROBE_A;

    for (float i = 0.0; i < numAxes; i++) {
     
        float angle = i * (3.14159 / numAxes) * PROBE_D;
        vec2 rotatedUV = vec2(cos(angle) * uv.x - sin(angle) * uv.y,
                               sin(angle) * uv.x + cos(angle) * uv.y);

        
        vec2 symUV = fract(rotatedUV * 1.5) - 0.5;

       
        vec2 scaledUV = uv0 * 0.5;

       
        float squareUV = max(abs(symUV.x), abs(symUV.y));

        float d = squareUV * exp(-length(scaledUV) * 0.8); 
      
        vec3 col = palette(length(scaledUV) + i * 0.3 + iTime * 0.4 + sin(iTime + i));

        d = sin(d * 12.0 * PROBE_B) / 6.0;
        d = abs(d);

        d = pow(0.01 / d, 1.2);

      
        if (abs(symUV.x) < squareSize && abs(symUV.y) < squareSize) {
            finalColor += col * d * PROBE_E;
        }
    }

    fragColor = vec4(finalColor, 1.0);
}
