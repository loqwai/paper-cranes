#pragma glslify: import(./includes/full.frag)

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
	vec3 c;
	float l,z=time;
	for(int i=0;i<3;i++) {
		vec2 uv,p=fragCoord.xy/resolution;
		uv=p;
		p-=.5;
		p.x*=resolution.x/resolution.y;
		z+=.07;
		l=length(p);
		uv+=p/l*(sin(z)+1.)*abs(sin(l*9.-z-z));
		c[i]=.01/length(mod(uv,1.)-.5);
	}
	fragColor=vec4(c/l,time);
}
void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
