// Ether by nimitz 2014 (twitter: @stormoid)
// https://www.shadertoy.com/view/MsjSW3
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

#define TIME iTime * 2.
mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

uniform float knob_77;
#define KNOB_A knob_77

#define PROBE_B bass * 3.
#define PROBE_C treble * 2.

float map(vec3 p){
    p.xz*= m(.9);p.xy*= m(energy / 5.);
    vec3 q = p*2.;
    return length(p+vec3(tan(-1.535)))*log(length(p)-1.) + sin(q.x+sin(q.z+sin(1.)))*PROBE_C - .01;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){	
	vec2 position = fragCoord.xy/iResolution.y - vec2(PROBE_C * (.1 * PROBE_C) / 100. + .45, energy / 25. +.55);
    
    vec3 cl = vec3(energy  * 8.0);
    float d = 4.5;
    for(int i=0; i<=5; i++)	{
		vec3 p = vec3(0.,0.,6.) + normalize(vec3(position, -.7))*d;
        float rz = map(p);
		float f =  clamp((rz - map(p+.1))*-1.535 , -.1, PROBE_B );
        vec3 l = vec3(PROBE_B * .01,0.3,.4) + vec3(5., 2.5, 3.)*f;
        cl = cl*l + smoothstep(-50., -1.0, rz)*1.7 * l;
		d += min(rz, .8);
	}
    fragColor = vec4(cl, 1.)/ (energy * 85.);
}