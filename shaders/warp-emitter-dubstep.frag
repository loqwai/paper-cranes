uniform float knob_1;
#define B spectralCrest
#define A (spectralCrestZScore)
void mainImage( out vec4 fragColor, in vec2 fragCoord ){
	vec3 c;
	float l,z=time;
	z += A;
	if(beat) z += 10.;
	for(int i=0;i<int(spectralRolloffZScore*10.)+13;i++) {
		vec2 uv,p=fragCoord.xy/resolution;
		uv=p;
		p-=.5;
		p.x*=resolution.x/resolution.y;
		z+=.07 + B;
		l=length(p);
		uv+=p/l*(sin(z)+1.)*abs(sin(l*8.-spectralRoughness-z-z));
		c[i]=(.01 + ((energyZScore)/100.))/length(mod(uv,1.)-.5);
	}
	vec3 hsl = rgb2hsl(vec3(c/l));
	hsl.x = fract(hsl.x + spectralCentroidMean*3.);
	hsl.y = clamp(energyZScore+hsl.y, 0., 1.);
	if(hsl.z > 0.5)
		hsl.z = abs	(fract(hsl.z + spectralRolloffZScore/10.));


	fragColor=vec4(hsl2rgb(hsl),time);
}
