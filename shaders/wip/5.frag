/*--------------------------------------------------------------------------------------
License CC0 - http://creativecommons.org/publicdomain/zero/1.0/
To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.
----------------------------------------------------------------------------------------
^ This means do ANYTHING YOU WANT with this code. Because we are programmers, not lawyers.
-Otavio Good
*/

// noise functions
float Hash2d(vec2 uv)
{
    return random(uv);
}
float mixP(float f0, float f1, float a)
{
    return mix(f0, f1, a*a*(3.0-2.0*a));
}
vec2 noise2dTex2(vec2 uv)
{
  return vec2(random(uv), random(uv.yx));

}
const vec2 zeroOne = vec2(0.0, 1.0);
float noise2d(vec2 uv)
{
    vec2 fr = fract(uv.xy);
    vec2 fl = floor(uv.xy);
    float h00 = Hash2d(fl);
    float h10 = Hash2d(fl + zeroOne.yx);
    float h01 = Hash2d(fl + zeroOne);
    float h11 = Hash2d(fl + zeroOne.yy);
    return mixP(mixP(h00, h10, fr.x), mixP(h01, h11, fr.x), fr.y);
}


float Fractal(vec2 p)
{
    vec2 pr = p;
    float scale = 1.0;
    float iter = spectralCentroid;
    for (int i = 0; i < 12; i++)
    {
        vec2 n2 = noise2dTex2(p*0.15*iter+iTime*1.925);
        float nx = n2.x - 0.5;
        float ny = n2.y;
        pr += vec2(nx, ny)*0.0002*iter*iter*iter;
        pr = fract(pr*0.5+0.5)*2.0 - 1.0;
        float len = pow(dot(pr, pr), 1.0+nx*0.5);
        float inv = 1.1/len;
        pr *= inv;
        scale *= inv;
        iter += 1.0;
    }
    float b = abs(pr.x)*abs(pr.y)/scale;
    return pow(b, 0.125)*0.95;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // center and scale the UV coordinates
	vec2 uv = fragCoord.xy / iResolution.xy;
    uv -= 0.5;
    uv.x *= iResolution.x / iResolution.y;
    uv *= 0.94;

    // do the magic
    vec2 warp = normalize(uv) * (1.0-pow(length(uv), 0.45));
    vec3 finalColor = vec3(Fractal(uv*2.0+1.0),
                           Fractal(uv*2.0+37.0),
                           Fractal((warp+0.5)*2.0+15.0));
    finalColor = 1.0 - finalColor;
    float circle = 1.0-length(uv*2.2);
    float at = atan(uv.x, uv.y);
    float aNoise = noise2d(vec2(at * 30.0, iTime));
    aNoise = aNoise * 0.5 + 0.5;
    finalColor *= pow(max(0.0, circle), 0.1)*2.0;	// comment out this line to see the whole fractal.
    finalColor *= 1.0 + pow(1.0 - abs(circle), 30.0);	// colorful outer glow
    finalColor += vec3(1.0, 0.3, 0.03)*3.0 * pow(1.0 - abs(circle), 100.0) * aNoise;	// outer circle
    float outer = (1.0 - pow(max(0.0, circle), 0.1)*2.0);
    finalColor += vec3(1.,0.2,0.03)*0.4* max(0.0, outer*(1.0-length(uv)));
    fragColor = vec4(finalColor, 1.0);
}
