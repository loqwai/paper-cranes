
  #version 300 es
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform bool beat;
out vec4 fragColor;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxMax;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughness;
uniform sampler2D prevFrame;
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
