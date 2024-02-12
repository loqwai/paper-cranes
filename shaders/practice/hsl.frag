uniform float knob_1;
uniform float hue;
uniform float saturation;
uniform float brightness;
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    vec3 hsl = vec3(hue,saturation,brightness);
    vec3 col = hsl2rgb(hsl);
    // Output to screen
    fragColor = vec4(col,1.0);
}