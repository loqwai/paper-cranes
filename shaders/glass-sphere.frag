#pragma glslify: import(./includes/full.frag)


vec2 getRipple(vec2 uv){
	// get the ripple
	float r = 0.0;
	r += sin(uv.x*10.0+time*2.0)*0.1;
	r += sin(uv.y*10.0+time*2.0)*0.1;
	return vec2(r);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
	//center uv
	vec2 uv = fragCoord/resolution.xy;
	uv -= 0.5;
	uv.x *= resolution.x/resolution.y;
	uv *= 2.0;
	vec3 c = vec3(0.0);
	vec3 l = rgb2hsl(getLastFrameColor(uv).rgb);
	c.x = spectralCentroid;
	c.y = spectralRoughnessNormalized;
	c.z = energyZScore;

	c = hsl2rgb(c);
	fragColor = vec4(c,1.0);
}
#pragma glslify: import(./includes/shadertoy-compat-main.frag)
