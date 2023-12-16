#version 300 es
precision highp float;

uniform bool beat;

uniform vec2 u_resolution;
uniform float iTime;
out vec4 fragColor;

void mainImage( out vec4 fragColor, vec2 resolution, in vec2 fragCoord ) {
   // Adjusted coordinates to center the circle
   vec2 uv = (vec2(fragCoord.x, resolution.y - fragCoord.y) / resolution.xy - 0.5) * 2.0;

    float radius = beat ? 0.4 : 0.2; // Larger radius when there's a beat

    // Calculate the distance from the center
    float dist = length(uv);

    // Determine if we're inside the circle
    if (dist < radius) {
        // Inside the circle
        fragColor = beat ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 1.0, 1.0); // Red if beat is true, blue otherwise
        return;
    }
    fragColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent
}

void main(void) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    mainImage(color, u_resolution, gl_FragCoord.xy);
    fragColor = color;
}
