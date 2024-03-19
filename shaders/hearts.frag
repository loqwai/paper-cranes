#define HEART_SIZE 1.3

vec3 palette( float t ) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263,0.416,0.557);

    return a + b*cos( 6.28318*(c*t+d) );
}

float dot2( in vec2 v ) { return dot(v,v); }

float sdHeart( in vec2 p )
{
    p.x = abs(p.x);

    // re center the shape
    p.y += 0.6;

    if( p.y+p.x>1.0 )
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;

    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                    dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 final_color = vec3(0.0);

    for (float i = 0.0; i < 5.0; i++) {
        float heart_size = .1 + HEART_SIZE /20. + .3 + energy;
        float d = sdHeart(uv * 1./heart_size) * exp(-length(uv0));

        vec3 col;
        if(d > 0.) {
            uv = fract(uv * 2.0 + iTime * .1) - 0.5;

            float d = length(5. * uv0);

            vec3 col = palette(length(uv0) + iTime*.4);

            d = sin(d*2. - iTime*1.5)/20.;
            d = abs(d);

            d = pow(0.01 / d, 1.2);

            final_color += col * d * 0.1;

        } else {
            col = vec3(1.000,0.290,0.290);
            if(d / exp(-length(uv0)) < -0.05){
                col = col * 0.0;
            }

            final_color = col * (0.2 + (1.0 + cos(i * 3.* iTime)/2.) /  (pow(i, 2.)*0.3+1.));

            break;
        }
    }

    // vignette
    uv = fragCoord.xy / iResolution.xy;
    uv *=  1. - uv.yx;
    final_color *= pow(uv.x*uv.y * 20.0, 0.25);

    fragColor = vec4(final_color, 1.0);

}
