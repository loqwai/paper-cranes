// Shader code for Shadertoy
uniform float knob_0;
uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;

#define A knob_0
#define B knob_1
#define C knob_2
#define D knob_3
#define E knob_4

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(A+uv.xyx+vec3(0,2,4));

    // Julia set parameters
    float zoom = 0.6 + 0.5*cos(A*0.1); // Zoom, change the multiplier for speed
    float moveX = sin(B)*0.5; // Horizontal movement
    float moveY = cos(C)*0.5; // Vertical movement
    float cX = D; // Real part of c, complex parameter
    float cY = E; // Imaginary part of c, complex parameter

    // Center and scale
    vec2 c = vec2(cX, cY);
    uv = (uv - 0.5) * zoom - vec2(moveX, moveY);

    // Iteration variables
    vec2 z = uv;
    int maxIterations = 100;
    float iteration;
    for(int i = 0; i < maxIterations; i++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        if(length(z) > 2.0) break;
        iteration = float(i);
    }

    // Use the iteration count to color the pixel
    float hue = iteration - log2(log2(dot(z, z))) + 4.0;
    col = 0.5 + 0.5*cos(3.0 + hue*0.15 + vec3(0,2,4));

    // Output to screen
    fragColor = vec4(col,1.0);
}
