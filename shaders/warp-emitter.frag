

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
	vec3 c;
	float l,z=time;
	for(int i=0;i<int(energyZScore+2.5*10.)+3;i++) {
		vec2 uv,p=fragCoord.xy/resolution;
		uv=p;
		p-=.5;
		p.x*=resolution.x/resolution.y;
		z+=.07 + spectralCentroid;
		l=length(p);
		uv+=p/l*(sin(z)+1.)*abs(sin(l*8.-spectralRolloffNormalized-z-z));
		c[i]=(.01 + ((energyZScore)/100.))/length(mod(uv,1.)-.5);
	}
	vec3 hsl = rgb2hsl(vec3(c/l));
	hsl.x = fract(hsl.x + spectralCentroidMean);
	fragColor=vec4(hsl2rgb(hsl),time);
}
