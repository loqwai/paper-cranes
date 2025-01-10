// Ether by nimitz 2014 (twitter: @stormoid)
// https://www.shadertoy.com/view/MsjSW3
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

#define t iTime*0.2 + energyZScore*0.1
mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// Fractal transformation function
vec3 twist(vec3 p) {
    float k = sin(t*0.1) * 0.5 + 1.5;
    float c = cos(k*p.y);
    float s = sin(k*p.y);
    mat2 m = mat2(c,-s,s,c);
    vec3 q = vec3(m*p.xz,p.y);
    return q;
}

float map(vec3 p) {
    // Initial rotation
    p.xz *= m(t*0.2);
    p.xy *= m(t*0.15);

    // Recursive folding
    float scale = 1.0 + spectralCentroidNormalized * 0.5;
    float d = 1000.0;
    vec3 q = p;

    for(int i = 0; i < 3; i++) {
        // Fold and twist space
        q = twist(q);
        q = abs(q) - vec3(1.0, 1.0, 1.0) * (1.0 + energyNormalized * 0.2);
        q.xy *= m(t * 0.1 + float(i) * 0.5);
        q *= scale;

        // Accumulate distance
        float current = length(q) * pow(scale, float(-i));
        d = min(d, current);
    }

    // Add wave patterns
    vec3 modP = p*2.0 + t;
    float wave = sin(modP.x + sin(modP.z + sin(modP.y))) * 0.3;
    wave += sin(modP.y * spectralCentroidNormalized) * 0.1;

    return d * 0.5 + wave;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord.xy - 0.5*iResolution.xy)/iResolution.y;
    vec3 cl = vec3(0.);
    float d = 2.5;

    for(int i=0; i<=5; i++) {
        vec3 p = vec3(0,0,4.) + normalize(vec3(p, -1.))*d;
        float rz = map(p);
        float f = clamp((rz - map(p+.1))*0.5, -.1, 1.);

        // Color based on distance and audio
        vec3 l = vec3(0.1,0.3,.4) +
                 vec3(3. + spectralCentroidNormalized,
                      2. + energyNormalized,
                      2. + spectralRoughnessNormalized) * f;

        cl = cl*l + smoothstep(2.5, .0, rz)*.7*l;
        d += min(rz, 1.);
    }

    // Color manipulation
    cl = rgb2hsl(cl);
    cl.x = fract(cl.x + spectralCentroid * 0.3); // Hue shift
    cl.y = clamp(cl.y + spectralRoughnessNormalized * 0.2, 0.0, 1.0); // Saturation

    // Beat response
    if(beat) {
        cl.y = clamp(cl.y * 1.2, 0.0, 1.0);
        cl.z = clamp(cl.z * 1.1, 0.0, 1.0);
    }

    cl = hsl2rgb(cl);
    fragColor = vec4(cl, 1.);
}
