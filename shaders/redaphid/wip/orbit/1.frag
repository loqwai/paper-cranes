void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    vec3 l = getLastFrameColor(uv).rgb;
    uv -=0.5;
    uv * 2.;
    uv -0.5;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime*5.+uv.xyx+vec3(0,2,4));

    // Simulating movement, a ripple in the fabric of our digital cosmos
    float x = uv.x + 0.5 + 0.5*sin(iTime*energyMedian+iTime);
    float y = uv.y + 0.5 + 0.5*cos(iTime*energyMedian+iTime);
    vec2 uv2 = vec2(x, y);

    // Droplet effect
    float droplet = exp(-4.0*length(uv2 - vec2(0.5, 0.5)));
    col *= droplet;
    vec3 hsl = rgb2hsl(col);
    if(hsl.z < 0.3) {
        col = mix(l,col,length(uv)/(30.+sin(iTime)));
    }
    fragColor = vec4(col,1.0);
}
